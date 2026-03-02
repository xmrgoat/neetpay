# XMR Fee Collection & Auto-Forwarding — Plan d'implémentation

> Analyse basée sur l'audit complet du codebase (5 agents, mars 2026).

---

## 1. Contexte : Pourquoi ce système est nécessaire

Monero n'a pas de smart contracts. La seule façon de prélever une fee côté serveur est le modèle **Hot Wallet Intermédiaire** :

```
Client → Sous-adresse neetpay → Détection RPC → Fee deducted → Forward au marchand
```

**État actuel** : Le code détecte les paiements et crédite 100% du montant reçu sur le solde du marchand. Aucune fee n'est prélevée. Aucun forwarding automatique n'existe. Le marchand doit retirer manuellement.

**Objectif** : Prélever 0.4% à la confirmation, puis forwarder automatiquement le reste vers l'adresse cold wallet du marchand après N confirmations.

---

## 2. État actuel du codebase

### Ce qui existe déjà ✅

| Composant | Fichier | État |
|-----------|---------|------|
| Génération sous-adresses | `src/lib/chains/monero-provider.ts:42` | ✅ Complet |
| Détection paiements (`get_transfers`) | `src/lib/chains/monero-provider.ts:68` | ✅ Complet |
| Suivi confirmations | `src/lib/chains/monero-provider.ts:128` | ✅ Complet |
| Envoi XMR (`transfer` RPC) | `src/lib/chains/monero-provider.ts:155` | ✅ Complet |
| Estimation fees réseau | `src/lib/chains/monero-provider.ts:195` | ✅ Complet |
| Cycle de polling cron | `src/lib/payment/poller.ts` | ✅ Complet |
| Webhook marchand | `src/lib/payment/engine.ts:253` | ✅ Complet |
| Modèle Payment + WalletAddress | `prisma/schema.prisma` | ✅ Complet |

### Ce qui manque ❌

| Composant | Impact |
|-----------|--------|
| Déduction fee 0.4% à la confirmation | Neetpay ne gagne rien |
| `Payment.merchantWalletAddress` | Pas où forwarder |
| `Payment.forwardingStatus` | Impossible de tracker le statut de settlement |
| `FeeLog` model | Pas d'audit trail ni de reporting |
| `SettlementConfig` sur `User` | Pas de config par marchand |
| `src/lib/payment/forwarder.ts` | Service de forwarding inexistant |
| Cron `/api/cron/forward-payments` | Personne ne déclenche le forward |
| File de retry (exponential backoff) | Pas de resilience si le forward échoue |

---

## 3. Architecture cible

```
┌──────────────────────────────────────────────────────────────────┐
│  FLUX COMPLET XMR AVEC FEES                                      │
└──────────────────────────────────────────────────────────────────┘

[1] Création paiement
    POST /api/v1/payment
    → engine.createPayment()
    → walletRpc("create_address") → sous-adresse unique
    → Payment.status = "pending"
    → Payment.merchantWalletAddress = user.xmrSettlementAddress

[2] Client paie
    1 XMR → Sous-adresse neetpay 8xxxxxxx...

[3] Cron polling (toutes les 30-60s)
    GET /api/cron/check-payments
    → monero-provider.checkPayment()
    → walletRpc("get_transfers") → détecte tx

    Si confirmations < 10:
      Payment.status = "confirming"

    Si confirmations >= 10:
      ┌────────────────────────────────────────────────────┐
      │ NOUVEAU: Calcul fee                                │
      │   fee = payAmount × 0.4% = 0.004 XMR              │
      │   netAmount = payAmount - fee = 0.996 XMR          │
      │                                                    │
      │ creditBalance(userId, netAmount)   ← net seulement │
      │ creditPlatformFee(fee)             ← neetpay garde │
      │ FeeLog.create(...)                ← audit         │
      │ Payment.status = "paid"                            │
      │ Payment.forwardingStatus = "pending"               │
      └────────────────────────────────────────────────────┘
      → dispatchWebhook(paymentId)

[4] Cron forwarding (toutes les 2-5min)
    GET /api/cron/forward-payments
    → forwarder.processQueue()
    → Trouve tous les Payment{status=paid, forwardingStatus=pending}

    Pour chaque paiement:
      ┌────────────────────────────────────────────────────┐
      │ NOUVEAU: Forwarding                                │
      │   walletRpc("transfer", {                          │
      │     destinations: [{                               │
      │       amount: netAmountPiconero,                   │
      │       address: payment.merchantWalletAddress       │
      │     }],                                            │
      │     account_index: 0,                              │
      │     priority: 1,                                   │
      │     ring_size: 16                                  │
      │   })                                               │
      │                                                    │
      │ Payment.forwardingStatus = "completed"             │
      │ Payment.forwardingTxId = result.tx_hash            │
      │ Payment.forwardedAt = now()                        │
      └────────────────────────────────────────────────────┘

[5] Retry si échec
    Payment.forwardingStatus = "failed"
    Payment.forwardingRetryCount += 1
    Exponential backoff: 2min → 10min → 30min → 2h → abandon
```

---

## 4. Schéma Prisma — Changements requis

### 4.1 Modifications du modèle `Payment`

```prisma
model Payment {
  // ... champs existants ...

  // NOUVEAU: Fee tracking
  platformFeeAmount   Float?              // 0.004 XMR (0.4% de payAmount)
  platformFeePercent  Float?              // Snapshot du taux au moment du paiement

  // NOUVEAU: Forwarding
  merchantWalletAddress String?           // Copié depuis User.xmrSettlementAddress au moment createPayment
  netAmount           Float?              // payAmount - platformFeeAmount
  forwardingStatus    String  @default("none") // none|pending|processing|completed|failed|skipped
  forwardingTxId      String?             // Hash de la tx de forward
  forwardedAt         DateTime?
  forwardingRetryCount Int    @default(0)
  forwardingLastError  String?
  forwardingNextRetry  DateTime?          // Pour la file de retry
}
```

**Index à ajouter :**
```prisma
@@index([forwardingStatus])
@@index([userId, forwardingStatus])
@@index([forwardingStatus, forwardingNextRetry])  // Pour la queue de retry
```

### 4.2 Modifications du modèle `User`

```prisma
model User {
  // ... champs existants ...

  // NOUVEAU: Settlement config
  xmrSettlementAddress  String?           // Adresse cold wallet XMR du marchand
  autoForwardEnabled    Boolean  @default(true)
  platformFeePercent    Float    @default(0.4)  // Override possible par user
  minForwardAmount      Float    @default(0.001) // Min 0.001 XMR avant de forwarder
}
```

### 4.3 Nouveau modèle `FeeLog`

```prisma
model FeeLog {
  id              String    @id @default(cuid())
  userId          String
  paymentId       String    @unique
  currency        String    // "XMR"
  chain           String    // "monero"
  receivedAmount  Float     // Montant brut reçu
  feeAmount       Float     // Fee prélevée (0.4%)
  feePercent      Float     // Taux appliqué
  netAmount       Float     // Montant net après fee
  txId            String?   // Hash de la tx entrante
  createdAt       DateTime  @default(now())

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([currency, createdAt])
  @@index([paymentId])
}
```

### 4.4 Nouveau modèle `PlatformBalance`

```prisma
model PlatformBalance {
  id        String   @id @default(cuid())
  currency  String   // "XMR"
  chain     String   // "monero"
  amount    Float    @default(0)
  updatedAt DateTime @updatedAt

  @@unique([currency, chain])
}
```

---

## 5. Modifications du Payment Engine

### Fichier : `src/lib/payment/engine.ts`

#### 5.1 `createPayment()` — capturer l'adresse marchande

```typescript
// Après avoir résolu le provider et l'user:
const user = await db.user.findUnique({ where: { id: userId } });

// Stocker l'adresse de settlement au moment de la création
// (snapshots pour éviter les problèmes si l'user change son adresse)
const merchantWalletAddress = (payCurrencyKey === "XMR")
  ? user.xmrSettlementAddress ?? null
  : null;

await db.payment.create({
  data: {
    // ... champs existants ...
    merchantWalletAddress,
    platformFeePercent: user.platformFeePercent ?? 0.4,
    forwardingStatus: merchantWalletAddress ? "none" : "skipped",
  }
});
```

#### 5.2 `checkPaymentStatus()` — déduire la fee à la confirmation

Localisation : `src/lib/payment/engine.ts`, bloc `if (check.confirmations >= requiredConfs)`.

```typescript
// AVANT (actuel):
await creditBalance(payment.userId, payCurrencyKey, chain, check.amount);

// APRÈS (nouveau):
const feePercent = payment.platformFeePercent ?? 0.4;
const feeAmount = check.amount * (feePercent / 100);
const netAmount = check.amount - feeAmount;

// Créditer seulement le net au marchand
await creditBalance(payment.userId, payCurrencyKey, chain, netAmount);

// Incrémenter la balance plateforme
await db.platformBalance.upsert({
  where: { currency_chain: { currency: payCurrencyKey, chain } },
  create: { currency: payCurrencyKey, chain, amount: feeAmount },
  update: { amount: { increment: feeAmount } },
});

// Log de la fee
await db.feeLog.create({
  data: {
    userId: payment.userId,
    paymentId: payment.id,
    currency: payCurrencyKey,
    chain,
    receivedAmount: check.amount,
    feeAmount,
    feePercent,
    netAmount,
    txId: check.txHash,
  },
});

// Mettre à jour le paiement
await db.payment.update({
  where: { id: payment.id },
  data: {
    status: "paid",
    payAmount: check.amount,
    netAmount,
    platformFeeAmount: feeAmount,
    txId: check.txHash,
    paidAt: new Date(),
    // Déclencher le forwarding si l'adresse est configurée
    forwardingStatus: payment.merchantWalletAddress
      ? "pending"
      : "skipped",
  },
});
```

---

## 6. Nouveau service de forwarding

### Fichier : `src/lib/payment/forwarder.ts` (à créer)

```typescript
/**
 * XMR Auto-Forwarding Service
 *
 * Prend les paiements XMR avec forwardingStatus="pending"
 * et les forward vers l'adresse marchande.
 *
 * Appelé par /api/cron/forward-payments.
 */

import { db } from "@/lib/db";
import { getChainEntry } from "@/lib/chains/registry";

// Paramètres de retry (exponential backoff)
const RETRY_DELAYS_MS = [
  2 * 60 * 1000,    // 2 min
  10 * 60 * 1000,   // 10 min
  30 * 60 * 1000,   // 30 min
  2 * 60 * 60 * 1000, // 2h
  24 * 60 * 60 * 1000, // 24h — dernier essai avant abandon
];
const MAX_RETRIES = RETRY_DELAYS_MS.length;

export async function processForwardingQueue(): Promise<{
  forwarded: number;
  failed: number;
  skipped: number;
}> {
  const now = new Date();

  // Trouver tous les paiements à forwarder (pending ou retry dû)
  const payments = await db.payment.findMany({
    where: {
      forwardingStatus: { in: ["pending", "failed"] },
      forwardingRetryCount: { lt: MAX_RETRIES },
      OR: [
        { forwardingNextRetry: null },
        { forwardingNextRetry: { lte: now } },
      ],
    },
    select: {
      id: true,
      userId: true,
      payCurrency: true,
      chain: true,
      netAmount: true,
      merchantWalletAddress: true,
      forwardingRetryCount: true,
    },
  });

  let forwarded = 0, failed = 0, skipped = 0;

  for (const payment of payments) {
    if (!payment.merchantWalletAddress || !payment.netAmount) {
      await db.payment.update({
        where: { id: payment.id },
        data: { forwardingStatus: "skipped" },
      });
      skipped++;
      continue;
    }

    // Vérifier que le montant dépasse le minimum du marchand
    const user = await db.user.findUnique({
      where: { id: payment.userId },
      select: { minForwardAmount: true },
    });
    const minAmount = user?.minForwardAmount ?? 0.001;

    if (payment.netAmount < minAmount) {
      // Pas encore assez — laisser s'accumuler (optionnel: agréger)
      skipped++;
      continue;
    }

    try {
      await forwardPayment(payment);
      forwarded++;
    } catch (err) {
      await handleForwardingFailure(payment, err);
      failed++;
    }
  }

  return { forwarded, failed, skipped };
}

async function forwardPayment(payment: {
  id: string;
  payCurrency: string | null;
  chain: string | null;
  netAmount: number;
  merchantWalletAddress: string;
}): Promise<void> {
  if (!payment.chain || !payment.payCurrency) {
    throw new Error("Missing chain or currency");
  }

  // Marquer comme "en cours" pour éviter les double-envois
  await db.payment.update({
    where: { id: payment.id },
    data: { forwardingStatus: "processing" },
  });

  const entry = getChainEntry(payment.payCurrency);
  if (!entry?.provider?.send) {
    throw new Error(`Provider ${payment.payCurrency} does not support send()`);
  }

  // Estimer la fee réseau et ajuster le montant si nécessaire
  let sendAmount = payment.netAmount;
  if (entry.provider.estimateFee) {
    const networkFee = await entry.provider.estimateFee(
      payment.merchantWalletAddress,
      sendAmount
    );
    // Absorber la fee réseau (elle vient de la platformFeeAmount)
    // Alternativement: la déduire du netAmount (décision produit)
    sendAmount = Math.max(0, sendAmount - networkFee);
  }

  if (sendAmount <= 0) {
    throw new Error("Net amount after network fee is zero or negative");
  }

  // Envoi via monero-wallet-rpc
  const result = await entry.provider.send({
    fromIndex: 0,                          // Account 0 du hot wallet neetpay
    toAddress: payment.merchantWalletAddress,
    amount: sendAmount,
  });

  // Succès — mettre à jour le paiement
  await db.payment.update({
    where: { id: payment.id },
    data: {
      forwardingStatus: "completed",
      forwardingTxId: result.txHash,
      forwardedAt: new Date(),
      forwardingLastError: null,
    },
  });
}

async function handleForwardingFailure(
  payment: { id: string; forwardingRetryCount: number },
  err: unknown
): Promise<void> {
  const retryCount = payment.forwardingRetryCount + 1;
  const isExhausted = retryCount >= MAX_RETRIES;
  const nextRetryDelay = RETRY_DELAYS_MS[retryCount - 1] ?? null;
  const nextRetry = nextRetryDelay
    ? new Date(Date.now() + nextRetryDelay)
    : null;

  await db.payment.update({
    where: { id: payment.id },
    data: {
      forwardingStatus: isExhausted ? "failed" : "failed",
      forwardingRetryCount: retryCount,
      forwardingNextRetry: nextRetry,
      forwardingLastError: String(err instanceof Error ? err.message : err),
    },
  });

  // Log pour alerting
  console.error(`[forwarder] Payment ${payment.id} forward failed (attempt ${retryCount}/${MAX_RETRIES}):`, err);
}
```

---

## 7. Nouveau endpoint cron

### Fichier : `src/app/api/cron/forward-payments/route.ts` (à créer)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { processForwardingQueue } from "@/lib/payment/forwarder";

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.split("Bearer ")[1];
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processForwardingQueue();
  return NextResponse.json({ ok: true, ...result });
}
```

**Configuration cron (Vercel / crontab VPS) :**
```
# Vercel vercel.json
{
  "crons": [
    { "path": "/api/cron/check-payments",  "schedule": "*/1 * * * *" },
    { "path": "/api/cron/forward-payments", "schedule": "*/2 * * * *" }
  ]
}

# VPS crontab
*/2 * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://yourapp.com/api/cron/forward-payments
```

---

## 8. Variables d'environnement additionnelles

```bash
# Adresse cold wallet neetpay pour collecter les fees plateforme
# (optionnel — les fees peuvent rester sur la platformBalance)
NEETPAY_XMR_FEE_COLLECTION_ADDRESS=888...

# Seuil minimum de sweep des fees plateforme (en XMR)
PLATFORM_FEE_MIN_SWEEP=0.1
```

---

## 9. API Dashboard — Settings page

### Endpoint : `PUT /api/user/settlement` (à créer)

Permet au marchand de configurer son adresse de settlement et d'activer l'auto-forwarding.

```typescript
// Body:
{
  xmrSettlementAddress: string;   // Validé par monero-provider.validateAddress()
  autoForwardEnabled: boolean;
  minForwardAmount?: number;
}

// Réponse:
{
  ok: true;
  xmrSettlementAddress: string;
  autoForwardEnabled: boolean;
}
```

**Validation côté serveur :**
- L'adresse XMR doit passer `monero-provider.validateAddress()` (regex 95 chars, prefix '4' ou '8')
- L'adresse ne peut pas être une sous-adresse appartenant à neetpay (check de collision)

---

## 10. Webhook payload — Mise à jour

Après forwarding complété, envoyer un second événement `payment.settled` :

```json
{
  "event": "payment.settled",
  "trackId": "vp_xxxxxxxxxxxx",
  "status": "paid",
  "payCurrency": "XMR",
  "receivedAmount": 1.0,
  "platformFee": 0.004,
  "netAmount": 0.996,
  "forwardingTxId": "abc123...",
  "settledAt": "2026-03-02T12:00:00Z"
}
```

---

## 11. Ordre d'implémentation

### Phase 1 — Prérequis DB (30 min)
1. Ajouter les champs sur `Payment` (`platformFeeAmount`, `netAmount`, `merchantWalletAddress`, `forwardingStatus`, `forwardingTxId`, `forwardedAt`, `forwardingRetryCount`, `forwardingLastError`, `forwardingNextRetry`, `platformFeePercent`)
2. Ajouter les champs sur `User` (`xmrSettlementAddress`, `autoForwardEnabled`, `platformFeePercent`, `minForwardAmount`)
3. Créer le modèle `FeeLog`
4. Créer le modèle `PlatformBalance`
5. `npx prisma migrate dev --name xmr-fee-forwarding`

### Phase 2 — Engine (45 min)
6. Modifier `createPayment()` — snapshot `merchantWalletAddress` + `platformFeePercent`
7. Modifier `checkPaymentStatus()` — déduire la fee, créditer le net, créer `FeeLog`, `PlatformBalance.upsert`, setter `forwardingStatus="pending"`
8. Tests manuels avec paiements XMR de test

### Phase 3 — Forwarder (60 min)
9. Créer `src/lib/payment/forwarder.ts`
10. Créer `src/app/api/cron/forward-payments/route.ts`
11. Tester le forwarding vers une adresse XMR test
12. Tester le mécanisme de retry

### Phase 4 — Settings UI (45 min)
13. Ajouter l'endpoint `PUT /api/user/settlement`
14. Ajouter la section "Settlement / Forwarding" dans le dashboard settings
15. Champ adresse XMR + toggle auto-forward + min amount

### Phase 5 — Reporting (30 min)
16. Ajouter les queries dans `src/lib/dashboard/queries.ts` :
    - `getFeesCollected(userId, dateRange)`
    - `getForwardingStatus(userId)`
    - `getNetRevenue(userId)`
17. Intégrer dans la page analytics du dashboard

---

## 12. Considérations sécurité

### Double-spend protection
- Marquer `forwardingStatus="processing"` AVANT d'appeler `provider.send()`
- Si le process meurt entre "processing" et "completed" → le cron va réessayer
- **Risque** : double-envoi si le premier envoi a réussi mais le DB update a échoué
- **Mitigation** : Vérifier si `forwardingTxId` est déjà set avant de re-envoyer

```typescript
// Au début de forwardPayment():
const existing = await db.payment.findUnique({
  where: { id: payment.id },
  select: { forwardingTxId: true }
});
if (existing?.forwardingTxId) {
  // Déjà envoyé — juste mettre à jour le status
  await db.payment.update({ ... data: { forwardingStatus: "completed" } });
  return;
}
```

### Validation d'adresse XMR
- Valider via `monero-provider.validateAddress()` à chaque settings save
- Ne jamais forwarder vers une adresse non validée
- Logger les tentatives avec adresses invalides

### Min amount
- Respecter la `minForwardAmount` du user pour éviter de gaspiller des fees réseau
- Optionnel Phase 2 : batching — agréger plusieurs petits paiements en un seul forward

### Isolation compte Monero (optionnel, Phase 3+)
- Actuellement : tout le monde partage `account_index: 0`
- Amélioration future : `account_index: 0` pour les paiements entrants, `account_index: 1` pour les fees plateforme
- Pas critique pour v1 car le tracking est fait en DB

---

## 13. Métriques à monitorer

| Métrique | Seuil d'alerte |
|----------|----------------|
| `forwardingStatus="failed"` avec `retryCount >= MAX_RETRIES` | > 0 → alerte critique |
| Délai moyen `paidAt` → `forwardedAt` | > 30 min → check cron |
| `platformBalance.amount` (XMR) | > 1 XMR → trigger sweep |
| Erreurs monero-wallet-rpc | Toute erreur 5xx |

---

## 14. Points ouverts (décisions produit)

| Question | Options | Recommandation |
|----------|---------|----------------|
| Qui paie les fees réseau Monero ? | A) Neetpay absorbe, B) Déduit du netAmount | **B** — plus honnête, plus simple |
| Batching ? | Agréger N paiements en 1 tx | Non pour v1, Phase 3+ |
| Fee plateforme variable ? | Fix 0.4% ou par plan (free/pro) | 0.4% fix pour v1 |
| Sweep des fees plateforme ? | Manuel ou cron quotidien | Cron quotidien `if > 0.1 XMR` |
| Webhook `payment.settled` séparé ? | Oui / Non | **Oui** — les marchands ont besoin de la confirmation de forward |

---

*Document généré le 2026-03-02. Basé sur l'audit complet de `src/lib/chains/monero-provider.ts`, `src/lib/payment/engine.ts`, `src/lib/wallet/wallet-service.ts`, `prisma/schema.prisma`, `src/lib/swap/`, et `src/lib/chains/registry.ts`.*
