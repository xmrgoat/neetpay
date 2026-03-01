# neetpay — Architecture Backend

> "Pay without permission."

## Vue d'ensemble

neetpay est un payment gateway crypto self-hosted. Le marchand integre l'API, le client paie en crypto, neetpay detecte le paiement on-chain et notifie le marchand via webhook.

```
Marchand                     neetpay                         Blockchain
   │                            │                                │
   │  POST /api/v1/payment/create                                │
   │ ──────────────────────────>│                                │
   │                            │  derive HD address (BIP-44)    │
   │  { trackId, payAddress }   │                                │
   │ <──────────────────────────│                                │
   │                            │                                │
   │        (client envoie crypto a payAddress)                  │
   │                            │                                │
   │                            │  detect tx (webhook ou poll)   │
   │                            │ <──────────────────────────────│
   │                            │                                │
   │                            │  confirmations >= required ?   │
   │                            │  oui → status = "paid"         │
   │                            │                                │
   │  POST webhook (HMAC-SHA256)│                                │
   │ <──────────────────────────│                                │
```

---

## 1. Chain Providers

Chaque blockchain a un provider qui implemente `ChainProvider` (`src/lib/chains/types.ts`).

### Interface

```typescript
interface ChainProvider {
  chain: string
  generateAddress(derivationIndex: number): Promise<GeneratedAddress>
  checkPayment(address: string, expectedAmount?: number, tokenContract?: string): Promise<PaymentCheck | null>
  getConfirmations(txHash: string): Promise<number>
  getRequiredConfirmations(): number
  validateAddress(address: string): boolean
  getExplorerUrl(txHash: string): string
  getBalance?(address: string, tokenContract?: string): Promise<number>
  send?(params: { fromIndex, toAddress, amount, tokenContract? }): Promise<{ txHash, fee }>
  estimateFee?(toAddress: string, amount: number, tokenContract?: string): Promise<number>
}
```

### Providers

| Provider | Fichier | Chains | RPC | Detection | Confirmations |
|----------|---------|--------|-----|-----------|---------------|
| EVM | `evm-provider.ts` | ETH, Polygon, BSC, Arbitrum, Base, Optimism, Avalanche | Alchemy RPC | Alchemy webhooks | 12-30 blocs |
| Bitcoin | `bitcoin-provider.ts` | BTC | **bitcoind natif** (VPS) | Polling (scantxoutset) | 3 blocs |
| Solana | `solana-provider.ts` | SOL | **Helius** RPC | Helius webhooks | 32 blocs |
| TRON | `tron-provider.ts` | TRX | Alchemy TRON RPC | Polling | 20 blocs |
| Monero | `monero-provider.ts` | XMR | **monerod natif** (VPS) | Polling (get_transfers) | 10 blocs |
| Litecoin | `litecoin-provider.ts` | LTC | **litecoind natif** (VPS) | Polling (scantxoutset) | 6 blocs |
| Dogecoin | `dogecoin-provider.ts` | DOGE | **dogecoind natif** (VPS) | Polling (scantxoutset + fallback listunspent) | 6 blocs |

### Infrastructure

```
┌──────────────────────────────────────────────────────────────┐
│                     INFRASTRUCTURE                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Nodes natifs sur VPS (0 frais API) :                        │
│    ├── bitcoind ─────────────────────────── BTC Provider     │
│    ├── monerod ──────── monero-wallet-rpc ── XMR Provider    │
│    ├── litecoind ────────────────────────── LTC Provider     │
│    └── dogecoind ────────────────────────── DOGE Provider    │
│                                                              │
│  API externe :                                               │
│    ├── Alchemy ──── EVM (ETH, Polygon, BSC, Arbitrum, etc.) │
│    ├── Alchemy ──── TRON                                     │
│    └── Helius ───── SOL (RPC + webhooks)                     │
│                                                              │
│  Swap :                                                      │
│    └── THORChain ── cross-chain swaps (decentralise)         │
│                                                              │
│  Futur :                                                     │
│    ├── ETH node (Reth/geth) quand le volume le justifie     │
│    ├── BSC / Polygon nodes natifs                            │
│    └── TRON node natif (java-tron)                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Nodes natifs — sur le VPS :**
- **bitcoind** — BTC. JSON-RPC (scantxoutset, getrawtransaction, sendrawtransaction). ~600 GB blockchain (ou pruned ~7 GB), 4 GB RAM.
- **monerod + monero-wallet-rpc** — XMR. Privacy-critical, pas d'API publique fiable. ~230 GB blockchain, 4 GB RAM.
- **litecoind** — LTC. JSON-RPC, scantxoutset. ~150 GB blockchain, 2 GB RAM.
- **dogecoind** — DOGE. JSON-RPC, scantxoutset + fallback listunspent. ~80 GB blockchain, 2 GB RAM.

**Pourquoi des nodes natifs pour BTC/XMR/LTC/DOGE ?**
- 0 frais API (avant on payait BlockCypher pour LTC/DOGE, Alchemy pour BTC)
- Pas de rate limiting
- Controle total, pas de dependance tiers
- XMR : privacy-critical, obligation de self-host
- BTC/LTC/DOGE : UTXO chains, meme interface JSON-RPC (scantxoutset)

**API externe :**
- **Alchemy** — EVM (toutes les chains) + TRON. Webhooks pour detection instantanee sur EVM.
- **Helius** — SOL. Meilleur provider Solana (RPC, webhooks, DAS API). Free tier = 50 req/s.

**Pourquoi pas de node ETH/SOL ?**
- **ETH (geth/Reth)** : 32-64 GB RAM + 4 TB NVMe = ~$150/mois en VPS dedie. Alchemy suffit pour le volume actuel.
- **SOL (solana-validator)** : 512 GB - 1 TB RAM = ingerable. Helius free tier largement suffisant.
- Migration vers des nodes natifs quand le volume justifie le cout.

---

## 2. HD Wallet

Toutes les adresses sont derivees d'un seul master seed.

```
Master Seed (BIP-39 mnemonic, 12/24 mots)
    │
    │  chiffre avec AES-256-GCM (scrypt pour la cle)
    │  stocke dans ENCRYPTED_SEED env var
    │
    ├── m/44'/60'/0'/0/{i}   → ETH/EVM (viem account)
    ├── m/84'/0'/0'/0/{i}    → BTC (P2WPKH native segwit)
    ├── m/44'/501'/{i}'/0'   → SOL (Ed25519 keypair)
    ├── m/44'/195'/0'/0/{i}  → TRON (secp256k1 → base58check)
    ├── m/84'/2'/0'/0/{i}    → LTC (P2WPKH bech32 "ltc1...")
    ├── m/44'/3'/0'/0/{i}    → DOGE (P2PKH legacy "D...")
    └── XMR                   → Subaddress via monero-wallet-rpc
```

**Fichiers :**
- `src/lib/wallet/hd-wallet.ts` — derivation, cache mnemonic en memoire
- `src/lib/wallet/kms.ts` — AES-256-GCM encrypt/decrypt (scrypt KDF)
- `src/lib/wallet/wallet-service.ts` — balances, withdrawals, deposit addresses

**Securite :**
- Le mnemonic n'est jamais ecrit en clair sur disque
- `SEED_ENCRYPTION_KEY` = passphrase pour scrypt
- `ENCRYPTED_SEED` = `base64(salt|iv|tag|ciphertext)`
- En production : jamais de `DEV_MNEMONIC`

---

## 3. Payment Engine

### Flow complet

```
createPayment()
    │
    ├── lookup CHAIN_REGISTRY[payCurrencyKey]
    ├── get next derivationIndex (global, incrementing)
    ├── provider.generateAddress(index)
    ├── create WalletAddress record
    ├── create Payment record (status: "pending", expiresAt: +30min)
    │
    ▼
[En attente du paiement]
    │
    ├── EVM : Alchemy webhook → checkPaymentStatus()
    ├── SOL : Helius webhook → checkPaymentStatus()
    └── BTC/TRON/XMR/LTC/DOGE : cron poll → pollActivePayments()
         │
         ▼
    checkPaymentStatus(paymentId)
         │
         ├── payment expire ? → status = "expired", release address
         │
         ├── provider.checkPayment(address)
         │     │
         │     └── tx trouvee ?
         │           │
         │           ├── confirmations < required → status = "confirming"
         │           │
         │           └── confirmations >= required → status = "paid"
         │                 ├── creditBalance(userId, currency, chain, amount)
         │                 ├── create WalletTransaction (type: "payment_received")
         │                 ├── trackEvent("payment_paid")
         │                 └── dispatchWebhook() → POST marchand
         │
         └── rien trouve → on repoll au prochain cycle
```

### Statuts

```
pending ──→ confirming ──→ paid
   │                         │
   └──→ expired              └──→ [webhook dispatch]
```

### Polling

Le cron `/api/cron/check-payments` tourne toutes les 30-60 secondes et poll :
- `bitcoin` (scantxoutset via bitcoind natif sur le VPS)
- `tron` (getaccount via Alchemy)
- `monero` (get_transfers via monero-wallet-rpc natif sur le VPS)
- `litecoin` (scantxoutset via litecoind natif sur le VPS)
- `dogecoin` (scantxoutset via dogecoind natif sur le VPS)

EVM → webhooks Alchemy (push, pas de polling).
SOL → webhooks Helius (push, pas de polling).

**Fichiers :**
- `src/lib/payment/engine.ts` — createPayment, checkPaymentStatus, pollActivePayments, expirePayments, dispatchWebhook
- `src/lib/payment/poller.ts` — orchestration du cycle cron

---

## 4. Registry

`src/lib/chains/registry.ts` mappe 24 currency keys vers leurs providers.

```
CHAIN_REGISTRY = {
  "ETH":        { chain: "ethereum",  provider: EvmProvider("ethereum"),  native: true  }
  "BTC":        { chain: "bitcoin",   provider: BitcoinProvider(),        native: true  }
  "SOL":        { chain: "solana",    provider: SolanaProvider(),         native: true  }
  "XMR":        { chain: "monero",    provider: MoneroProvider(),         native: true  }
  "TRX":        { chain: "tron",      provider: TronProvider(),           native: true  }
  "LTC":        { chain: "litecoin",  provider: LitecoinProvider(),       native: true  }
  "DOGE":       { chain: "dogecoin",  provider: DogecoinProvider(),       native: true  }
  "BNB":        { chain: "bsc",       provider: EvmProvider("bsc"),       native: true  }
  "MATIC":      { chain: "polygon",   provider: EvmProvider("polygon"),   native: true  }
  "ARB":        { chain: "arbitrum",  provider: EvmProvider("arbitrum"),  native: true  }
  "OP":         { chain: "optimism",  provider: EvmProvider("optimism"),  native: true  }
  "AVAX":       { chain: "avalanche", provider: EvmProvider("avalanche"), native: true  }
  "USDT-ERC20": { chain: "ethereum",  provider: EvmProvider("ethereum"),  native: false, tokenContract: "0xdAC17..." }
  "USDT-TRC20": { chain: "tron",      provider: TronProvider(),           native: false, tokenContract: "TR7NHq..." }
  "USDT-POLYGON": ...
  "USDT-BSC":   ...
  "USDT-SOL":   ...
  "USDC-ERC20": ...
  "USDC-POLYGON": ...
  "USDC-BSC":   ...
  "USDC-SOL":   ...
  "DAI-ERC20":  ...
}
```

Les providers sont lazy-init (crees au premier acces via `get provider()`).

---

## 5. Swap System

### Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      SWAP ROUTER                         │
│                   src/lib/swap/router.ts                  │
│                                                          │
│   resolveProvider(from, to) :                            │
│                                                          │
│   1. Meme chain EVM ?  ──→  1inch Fusion (si API key)   │
│   2. Cross-chain ?     ──→  THORChain  ← PRIMARY        │
│   3. Fallback          ──→  SideShift                    │
│                                                          │
└──────────────────────────┬───────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │  THORChain  │
                    │ thorchain.ts│
                    └─────────────┘
```

**THORChain est le swap provider principal.** 1inch et SideShift sont dans le code comme fallbacks mais THORChain gere la quasi-totalite des swaps.

### Interface unifiee

Tous les swap providers implementent `SwapProvider` (`src/lib/swap/types.ts`) :

```typescript
interface SwapProvider {
  name: "thorchain" | "oneinch" | "sideshift"
  getSupportedAssets(): string[]
  supportsRoute(fromKey: string, toKey: string): boolean
  getQuote(opts: { fromKey, toKey, amount }): Promise<SwapQuote>
  executeSwap(opts: { quoteId, settleAddress, refundAddress? }): Promise<SwapExecution>
  getStatus(swapId: string): Promise<SwapStatusResponse>
}
```

### THORChain (`thorchain.ts`)

Swaps cross-chain decentralises via le protocole THORChain. Pas de KYC, pas de custodian.

**Comment ca marche :**
1. On demande un quote a THORNode (`/thorchain/quote/swap`)
2. Le quote retourne une adresse de vault + un memo
3. L'utilisateur envoie ses crypto a l'adresse du vault avec le memo
4. THORChain execute le swap on-chain automatiquement
5. Les crypto swappees arrivent a l'adresse de destination

**Memo format :**
```
=:{DEST_ASSET}:{DEST_ADDR}:{SLIP_LIMIT}:{AFFILIATE}:{FEE_BPS}
```
Exemple : `=:ETH.ETH:0x1234...abcd:0:np:30` (30 bps affiliate fee)

**Assets supportes :**
```
BTC.BTC, ETH.ETH, LTC.LTC, DOGE.DOGE, AVAX.AVAX, BSC.BNB
+ ERC-20 : ETH.USDT-0x..., ETH.USDC-0x..., ETH.DAI-0x...
+ BSC tokens : BSC.USDT-0x..., BSC.USDC-0x...
```

**Amounts :** Tous en 8-decimal base units (1e8). 1 BTC = 100,000,000 units.

**Affiliate fees :** Configurable via `THORCHAIN_AFFILIATE_ID` et `THORCHAIN_AFFILIATE_FEE_BPS` (defaut: 30 bps = 0.3%).

### Fallbacks (code-ready)

**1inch Fusion** (`oneinch.ts`) — DEX aggregation pour swaps meme-chain EVM. Active seulement si `ONEINCH_API_KEY` est set. Meilleurs taux pour ETH→USDT, BNB→USDC, etc.

**SideShift** (`sideshift-adapter.ts`) — Fallback centralise pour les pairs pas supportes par THORChain. A terme on veut le virer completement.

### Routing

```
getQuote(from, to)
    │
    ├── meme chain EVM + ONEINCH_API_KEY set ? → 1inch
    ├── THORChain supporte la paire ?           → THORChain ← 99% des cas
    ├── SideShift supporte la paire ?           → SideShift (fallback)
    └── aucun                                   → erreur
```

---

## 6. API Routes

### Paiements

| Methode | Route | Description |
|---------|-------|-------------|
| POST | `/api/v1/payment/create` | Creer un paiement (genere une adresse unique) |
| GET | `/api/v1/payment/[trackId]` | Statut d'un paiement |
| GET | `/api/v1/currencies` | Liste des currencies supportees |

### Swaps (dashboard)

| Methode | Route | Description |
|---------|-------|-------------|
| POST | `/api/dashboard/swap/quote` | Obtenir un quote (router choisit le provider) |
| POST | `/api/dashboard/swap/execute` | Executer un swap (passe `provider` du quote) |
| GET | `/api/dashboard/swap/status?swapId=X&provider=Y` | Statut d'un swap |

### Cron

| Methode | Route | Description |
|---------|-------|-------------|
| GET | `/api/cron/check-payments` | Poll BTC/TRON/XMR/LTC/DOGE |
| GET | `/api/cron/update-prices` | MAJ prix via Alchemy Prices API |
| GET | `/api/cron/expire-payments` | Expire les paiements passes |

### Webhooks entrants

| Methode | Route | Description |
|---------|-------|-------------|
| POST | `/api/webhooks/alchemy` | Alchemy Address Activity (EVM/SOL) |

---

## 7. Database (Prisma 7)

```
User
  ├── Payment[]           (1 payment = 1 adresse unique = 1 tx)
  ├── WalletAddress[]     (adresses derivees)
  ├── WalletBalance[]     (soldes par currency/chain)
  ├── WalletTransaction[] (historique: deposit, withdrawal, payment_received)
  ├── ApiKey[]            (auth API publique)
  ├── WebhookLog[]        (logs de delivery webhook)
  └── Subscription        (plan/tier)

PriceCache                (prix USD + change 24h, MAJ par cron)
AnalyticsEvent            (events: payment_view, payment_paid, etc.)
```

---

## 8. Fees et modele economique

```
Transaction flow :

  Client paie 1 BTC au marchand
       │
       ├── neetpay prend 0.4%  →  0.004 BTC  (notre revenue)
       ├── network fee          →  variable    (paye par le client)
       └── marchand recoit      →  0.996 BTC

  Client swap BTC → USDT (via THORChain)
       │
       ├── neetpay fee 0.4%    →  sur le montant
       ├── THORChain fee       →  ~0.1-0.3% (transparent, on-chain)
       ├── network fee          →  variable
       └── client recoit       →  USDT net

  Nos couts fixes :
       ├── VPS (BTC+XMR+LTC+DOGE)  →  ~$40-60/mois (4 cores, 16 GB, 2 TB SSD)
       ├── Alchemy (EVM+TRON)       →  gratuit/growth plan
       ├── Helius (SOL)             →  gratuit (free tier 50 req/s)
       └── Total                    →  ~$50/mois

  Break-even : ~12.5K$ volume mensuel (0.4% * 12.5K = 50$)
```

---

## 9. Variables d'environnement

```bash
# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
DATABASE_URL=postgresql://...

# Auth
AUTH_SECRET=...
AUTH_URL=http://localhost:3000

# Alchemy (EVM + TRON)
ALCHEMY_API_KEY=...
ALCHEMY_WEBHOOK_SIGNING_KEY=...

# Helius (SOL RPC + webhooks)
HELIUS_API_KEY=...
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=...

# Bitcoin Core (bitcoind natif VPS)
BITCOIN_RPC_URL=http://<vps-ip>:8332
BITCOIN_RPC_USER=
BITCOIN_RPC_PASSWORD=

# Wallet
SEED_ENCRYPTION_KEY=...           # passphrase AES-256-GCM
ENCRYPTED_SEED=...                # base64(salt|iv|tag|ciphertext)

# Nodes natifs (VPS)
LITECOIN_RPC_URL=http://<vps-ip>:9332
LITECOIN_RPC_USER=
LITECOIN_RPC_PASSWORD=
DOGECOIN_RPC_URL=http://<vps-ip>:22555
DOGECOIN_RPC_USER=
DOGECOIN_RPC_PASSWORD=
MONERO_WALLET_RPC_URL=http://<vps-ip>:18083/json_rpc
MONERO_WALLET_RPC_USER=...
MONERO_WALLET_RPC_PASSWORD=...

# Swap — THORChain (primary cross-chain)
THORCHAIN_NODE_URL=https://thornode.ninerealms.com
THORCHAIN_AFFILIATE_ID=np
THORCHAIN_AFFILIATE_FEE_BPS=30

# Swap — 1inch Fusion (EVM DEX)
ONEINCH_API_KEY=

# Swap — SideShift (fallback)
SIDESHIFT_SECRET=...
SIDESHIFT_AFFILIATE_ID=...

# Cron
CRON_SECRET=...
```

---

## 10. Roadmap technique

### Phase 1 — Done
- [x] Chain providers : EVM, BTC, SOL, TRON, XMR
- [x] HD Wallet avec AES-256-GCM
- [x] Payment engine avec polling + webhooks
- [x] Dashboard complet

### Phase 2 — Done (cette session)
- [x] LTC provider natif (litecoind RPC)
- [x] DOGE provider natif (dogecoind RPC)
- [x] THORChain swap integration
- [x] 1inch Fusion swap integration
- [x] SideShift adapter (fallback)
- [x] Smart swap router
- [x] Suppression BlockCypher

### Phase 3 — En cours (infra)
- [x] Installer monerod + monero-wallet-rpc sur le VPS
- [x] Installer litecoind + dogecoind sur le VPS
- [x] Installer bitcoind sur le VPS
- [ ] Configurer BTC provider : bitcoind natif (code)
- [ ] Migrer SOL provider : Alchemy → Helius (RPC + webhooks)
- [ ] Obtenir API key Helius
- [ ] Configurer affiliate ID THORChain definitif

### Phase 4 — Next
- [ ] Obtenir API key 1inch (activer le fallback same-chain EVM)
- [ ] Monitoring sur les nodes VPS
- [ ] Drop SideShift quand THORChain couvre assez de pairs

### Phase 5 — Quand le volume le justifie
- [ ] ETH node (Reth ou geth) → remplace Alchemy EVM
- [ ] BSC / Polygon nodes natifs
- [ ] TRON node natif (java-tron)

---

## Structure des fichiers

```
src/lib/
├── chains/
│   ├── types.ts              # ChainProvider interface
│   ├── registry.ts           # CHAIN_REGISTRY (24 currencies)
│   ├── evm-provider.ts       # ETH, Polygon, BSC, etc. (Alchemy RPC)
│   ├── bitcoin-provider.ts   # BTC (bitcoind natif VPS)
│   ├── solana-provider.ts    # SOL (Helius RPC)
│   ├── tron-provider.ts      # TRX (Alchemy RPC)
│   ├── monero-provider.ts    # XMR (monerod natif VPS)
│   ├── litecoin-provider.ts  # LTC (litecoind natif VPS)
│   └── dogecoin-provider.ts  # DOGE (dogecoind natif VPS)
├── swap/
│   ├── types.ts              # SwapProvider interface
│   ├── router.ts             # Smart routing (THORChain primary)
│   ├── thorchain.ts          # THORChain cross-chain swaps
│   ├── oneinch.ts            # 1inch Fusion (fallback EVM DEX)
│   ├── sideshift.ts          # SideShift API client
│   └── sideshift-adapter.ts  # SideShift → SwapProvider adapter (fallback)
├── wallet/
│   ├── hd-wallet.ts          # BIP-39/44/84 derivation
│   ├── kms.ts                # AES-256-GCM encrypt/decrypt
│   └── wallet-service.ts     # Balances, withdrawals, deposits
├── payment/
│   ├── engine.ts             # Create, check, expire, webhook
│   └── poller.ts             # Cron cycle orchestration
├── price/
│   └── coingecko.ts          # Alchemy Prices API (pas CoinGecko malgre le nom)
└── analytics/
    └── tracker.ts            # Event tracking
```
