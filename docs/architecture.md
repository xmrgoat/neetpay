# neetpay — Architecture

> "Pay without permission."

## Vue d'ensemble

neetpay est un **crypto payment gateway XMR-only**. Le marchand accepte des paiements en XMR sans savoir ce que le payeur possede. Le payeur envoie n'importe quelle crypto (BTC, ETH, USDC, SOL...), neetpay gere la conversion en XMR via des providers de swap externes. Le marchand recoit toujours du XMR.

**Trois produits :**
- **API B2B** — les devs integrent neetpay sur leur site
- **Payment Links B2C** — liens de paiement sans code
- **White-label / Widget JS** — checkout embeddable

```
pay.neetpay.com          app.neetpay.com          neetpay.com
(page paiement)          (dashboard)              (landing)
      │                       │                       │
      └──────────┬────────────┘                       │
                 │                                    │
          api.neetpay.com/v1/                         │
          ┌──────────────────┐                        │
          │   Axum API       │◄───────────────────────┘
          │   (Rust)         │
          └────────┬─────────┘
                   │
      ┌────────────┼─────────────┐
      ▼            ▼             ▼
   PostgreSQL    Redis      monero-wallet-rpc
                              + monerod
                   │
      ┌────────────┼────────────┐
      ▼                         ▼
 Wagyu API                Trocador API
 (swap primaire)          (swap fallback)
```

---

## 1. Swap Providers

### Wagyu (primaire)

Trade XMR sur l'orderbook Hyperliquid (XMR1/USDC) et bridge vers la blockchain Monero. Meilleure liquidite disponible pour XMR.

**Chains supportees en entree :**
- Arbitrum (USDC, USDT, ETH, WBTC) — chainId: 42161
- Solana (SOL, USDC) — chainId: 1151111081099710
- Bitcoin (BTC)
- Monero (XMR)

**API Flow :**
```
POST /v1/quote    → taux estime (fromAmount, toAmount, estimatedTime)
POST /v1/order    → cree l'ordre (depositAddress, depositAmount, orderId)
GET  /v1/order/:id → poll le statut (pas de webhooks)
```

**Fee model :**
- X-API-KEY header pour collecter les fees integrator
- fee_percent configurable (0-5%), garde 100%
- Fees collectees automatiquement sur le depot

**Statuts :**
```
awaiting_deposit → deposit_detected → deposit_confirmed
→ executing_swap → completed
→ refunding / refunded / failed / expired (2h)
```

**Contraintes :**
- Min $20 (Arbitrum/Solana), $25 (Monero)
- Pas de `amount_to` (toujours specifier `fromAmount`)
- TWAP automatique pour ordres > $5,000 (XMR sell) ou > $25,000 (XMR buy)
- Polling requis (pas de webhooks)

### Trocador (fallback)

Agregateur de swaps privacy-focused. Supporte plus de chains que Wagyu.

**Avantages vs Wagyu :**
- Mode `payment=True` + `amount_to` → montant fixe XMR (parfait pour invoices)
- Webhooks natifs
- Plus de chains (TRC20, BEP20, etc.)
- `new_bridge` : double swap avec XMR intermediaire

**API Flow :**
```
GET /new_rate     → quotes de tous les providers (avec ID)
GET /new_trade    → cree la transaction (avec provider choisi)
GET /trade        → statut (ou webhook POST automatique)
```

**Fee model :**
- `markup=0` → Trocador partage 50% de sa commission
- `markup=1/1.65/3%` → 100% du markup pour nous

**Statuts :**
```
new → waiting → confirming → sending → finished
→ failed / expired / halted / refunded
```

### Routing

```rust
fn select_provider(from_chain: &str, from_token: &str) -> Provider {
    match from_chain {
        "arbitrum" => Provider::Wagyu,   // USDC, USDT, ETH, WBTC
        "solana"   => Provider::Wagyu,   // SOL, USDC
        "bitcoin"  => Provider::Wagyu,   // BTC
        _          => Provider::Trocador // TRC20, BEP20, autres
    }
}
```

---

## 2. Node XMR

Deux processus sur le VPS :
- `monerod` → synchronise la blockchain Monero complete
- `monero-wallet-rpc` → interface RPC pour wallets/adresses

**Ce que le node fait :**

1. **Generer les subaddresses** — chaque invoice = une subaddresse unique
```
monero-wallet-rpc → create_address(account_index, label)
→ retourne une subaddresse unique
```

2. **Confirmer les transactions entrantes** — detecte l'arrivee du XMR
```
monero-wallet-rpc → get_transfers(in, pending)
→ detecte les tx sur les subaddresses actives
→ confirme apres 10 blocs
```

3. **Valider les adresses marchands** — avant creation de compte
```
monero-wallet-rpc → validate_address(address)
```

**Ce que le node ne fait PAS :**
- Pas de swap (c'est Wagyu/Trocador)
- Pas de custody (XMR va au wallet du marchand via subaddress ou forward)
- Juste lecteur/observateur de la blockchain

---

## 3. Schema DB (PostgreSQL)

```sql
merchants (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  api_key TEXT UNIQUE,
  xmr_wallet_address TEXT,
  fee_percent DECIMAL DEFAULT 0.4,
  webhook_url TEXT,
  created_at TIMESTAMP
)

invoices (
  id UUID PRIMARY KEY,
  merchant_id UUID REFERENCES merchants,
  amount_xmr DECIMAL,
  amount_display DECIMAL,
  currency_display TEXT,
  subaddress TEXT,
  status TEXT,           -- pending, swap_pending, confirming, paid, expired, failed
  swap_provider TEXT,    -- wagyu | trocador
  swap_order_id TEXT,
  deposit_address TEXT,
  deposit_chain TEXT,
  deposit_token TEXT,
  deposit_amount TEXT,
  expires_at TIMESTAMP,
  paid_at TIMESTAMP,
  tx_hash TEXT,
  created_at TIMESTAMP
)

webhook_logs (
  id UUID PRIMARY KEY,
  invoice_id UUID REFERENCES invoices,
  url TEXT,
  payload JSONB,
  status_code INT,
  attempts INT,
  created_at TIMESTAMP
)
```

---

## 4. Flow Complet d'un Paiement

```
1. Marchand appelle POST /v1/invoice
   { amount_xmr, currency_display, from_chain, from_token, webhook }

2. neetpay genere une subaddresse XMR via monero-wallet-rpc

3. neetpay appelle Wagyu POST /v1/order (ou Trocador GET /new_trade)
   → recoit depositAddress

4. neetpay stocke l'invoice en DB avec statut "pending"

5. neetpay retourne au marchand :
   { invoice_id, payment_url, deposit_address, deposit_amount, deposit_chain, expires_at }

6. Le payeur envoie la crypto a deposit_address

7. neetpay poll le swap provider toutes les 15s (Wagyu)
   ou recoit un webhook (Trocador)
   → statut swap evolue

8. En parallele, le node XMR detecte l'arrivee sur la subaddresse
   → confirme apres 10 blocs

9. neetpay update invoice statut → "paid"
   → envoie webhook POST au marchand
   → preleve la fee neetpay (0.4%)

10. Marchand recoit webhook avec tx_hash et montant confirme
```

---

## 5. Stack Technique

```
Backend         → Rust + Axum
Database        → PostgreSQL (sqlx)
Cache           → Redis
Node XMR        → monerod + monero-wallet-rpc (VPS)
Swap primaire   → Wagyu API
Swap fallback   → Trocador API
Frontend        → Next.js 16 (React 19, Tailwind CSS 4)
Dashboard       → app.neetpay.com (Next.js)
Page paiement   → pay.neetpay.com (React SPA dans Next.js)
Landing         → neetpay.com (Next.js)
Auth dashboard  → NextAuth beta (email/password)
```

---

## 6. API Routes (Rust — api.neetpay.com/v1)

### Invoices
| Methode | Route | Description |
|---------|-------|-------------|
| POST | `/v1/invoice` | Creer une invoice (genere subaddress + swap order) |
| GET | `/v1/invoice/:id` | Statut d'une invoice |

### Marchands (dashboard)
| Methode | Route | Description |
|---------|-------|-------------|
| POST | `/v1/merchant/register` | Inscription marchand |
| GET | `/v1/merchant/me` | Profil marchand |
| PUT | `/v1/merchant/settings` | Config (webhook, xmr address) |

---

## 7. Workers (Rust — background tasks)

| Worker | Frequence | Description |
|--------|-----------|-------------|
| `swap_poller` | 15s | Poll Wagyu GET /v1/order/:id pour les invoices actives |
| `xmr_watcher` | 30-60s | monero-wallet-rpc get_transfers, confirme apres 10 blocs |
| `webhook_dispatcher` | on event | POST webhook au marchand quand statut change |
| `expirer` | 60s | Expire les invoices passees |

---

## 8. Variables d'environnement

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/neetpay
REDIS_URL=redis://localhost:6379

# Monero Node
MONERO_RPC_URL=http://localhost:18082/json_rpc
MONERO_WALLET_NAME=neetpay_wallet
MONERO_WALLET_PASSWORD=xxx

# Wagyu
WAGYU_API_KEY=wg_xxx
WAGYU_FEE_PERCENT=1
WAGYU_FEE_ADDRESS=0x...

# Trocador
TROCADOR_API_KEY=xxx
TROCADOR_MARKUP=0

# App
APP_ENV=development
APP_PORT=8080
JWT_SECRET=xxx
WEBHOOK_SECRET=xxx
NEETPAY_FEE_PERCENT=0.4
```

---

## 9. Structure des fichiers (Rust backend)

```
neetpay-api/
├── Cargo.toml
├── .env
├── migrations/
│   ├── 001_merchants.sql
│   ├── 002_invoices.sql
│   └── 003_webhook_logs.sql
└── src/
    ├── main.rs
    ├── config.rs
    ├── db.rs
    ├── errors.rs
    ├── models/
    │   ├── merchant.rs
    │   ├── invoice.rs
    │   └── webhook_log.rs
    ├── routes/
    │   ├── mod.rs
    │   ├── invoices.rs
    │   ├── merchants.rs
    │   └── webhooks.rs
    ├── services/
    │   ├── mod.rs
    │   ├── wagyu.rs
    │   ├── trocador.rs
    │   ├── monero.rs
    │   ├── invoice.rs
    │   └── webhook.rs
    └── workers/
        ├── mod.rs
        ├── swap_poller.rs
        └── xmr_watcher.rs
```

---

## 10. Frontend (Next.js — inchange sauf adaptations)

Le frontend Next.js reste pour :
- **neetpay.com** — landing page (animations GSAP, videos)
- **app.neetpay.com** — dashboard marchand (invoices, analytics, settings)
- **pay.neetpay.com** — page de paiement (affiche deposit address)

**Pages supprimees :** swap, wallet multi-chain
**Pages modifiees :** dashboard overview (XMR-only), payments → invoices, settings (XMR wallet)
**Pages gardees :** landing, pricing, docs, auth, analytics, links, developers, security

---

## 11. Fees

```
Payeur envoie 100 USDC (Arbitrum) → marchand veut 0.5 XMR

  neetpay fee 0.4%     →  0.002 XMR
  Wagyu fee (integrator) →  configurable
  Network fee            →  variable
  Marchand recoit        →  ~0.498 XMR

Couts fixes :
  VPS (monerod)          →  ~$20-30/mois
  Redis                  →  ~$5/mois
  Total                  →  ~$30/mois

Break-even : ~7.5K$ volume mensuel
```

---

## 12. Roadmap

### Phase 1 — Core (MVP)
- [ ] Config + DB + migrations (Rust)
- [ ] Client Wagyu (quote + order + poll)
- [ ] Client Trocador (new_rate + new_trade + webhook)
- [ ] Client monero-wallet-rpc (subaddress + get_transfers)
- [ ] Route POST /v1/invoice
- [ ] Worker swap_poller
- [ ] Worker xmr_watcher
- [ ] Webhooks vers marchands

### Phase 2 — Dashboard
- [ ] Auth marchands (API key)
- [ ] Dashboard Next.js (invoices, stats, settings)
- [ ] Page paiement pay.neetpay.com

### Phase 3 — White-label
- [ ] Widget JS embeddable
- [ ] Customisation branding
- [ ] SDK TypeScript officiel

### Phase 4 — Cartes Prepayees & Gift Cards
- [ ] Listing cartes prepayees Visa/MC (Trocador `GET /cards`)
- [ ] Commande carte prepayee (`GET /order_prepaidcard`)
- [ ] Listing gift cards par pays (`GET /giftcards?country=`)
- [ ] Commande gift card (`GET /order_giftcard`)
- [ ] Suivi commande (`GET /trade?id=`)
- [ ] UI checkout carte dans le dashboard

---

## 13. Cartes Prepayees & Gift Cards (via Trocador API)

Permet aux users de depenser leur XMR dans le monde reel en achetant des cartes Visa/Mastercard prepayees ou des gift cards de centaines de vendeurs.

### Endpoints utilises

| Methode | Route | Description |
|---------|-------|-------------|
| GET | `/cards` | Lister les cartes prepayees Visa/MC disponibles (provider, currency, brand, amounts) |
| GET | `/order_prepaidcard` | Commander une carte prepayee avec crypto |
| GET | `/giftcards?country=` | Lister les gift cards par pays (name, category, min/max, denominations) |
| GET | `/order_giftcard` | Commander une gift card avec crypto |
| GET | `/trade?id=` | Statut de la commande (suivi livraison) |

### Flow

```
1. User choisit une carte/gift card dans l'UI
2. NeetPay appelle order_prepaidcard ou order_giftcard
   {
     provider/product_id, ticker_from, network_from,
     amount, email, card_markup
   }
3. Trocador retourne deposit_address + deposit_amount
4. User envoie XMR/BTC/etc. a deposit_address
5. Poll /trade jusqu'a status=finished
6. Code de carte envoye a l'email du user
```

### Revenue model

```
card_markup=2%  → NeetPay garde 100% du markup
card_markup=0   → Trocador partage 50% de sa commission
Gift cards      → meme modele que les cartes prepayees
```

### Regles privacy

- Email requis uniquement pour livraison du code carte
- Pas de stockage de l'email apres livraison reussie
- Pas de lien entre identite et transaction XMR
- Aucun KYC cote NeetPay
