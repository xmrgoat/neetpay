# Plan d'Intégration — lume.rich × OxaPay

> Guide complet pour intégrer la passerelle de paiement crypto OxaPay dans lume.rich (Next.js).

---

## Table des matières

1. [Prérequis OxaPay](#1-prérequis-oxapay)
2. [Architecture technique](#2-architecture-technique)
3. [Endpoints API back-end](#3-endpoints-api-back-end)
4. [Front-end — Pages & composants](#4-front-end--pages--composants)
5. [Flux de paiement complet](#5-flux-de-paiement-complet)
6. [Sécurité](#6-sécurité)
7. [Base de données](#7-base-de-données)
8. [Variables d'environnement](#8-variables-denvironnement)
9. [Étapes d'implémentation](#9-étapes-dimplémentation)
10. [Invoice vs White Label](#10-invoice-vs-white-label)

---

## 1. Prérequis OxaPay

Avant tout développement :

| # | Action | Détails |
|---|--------|---------|
| 1 | **Activer la 2FA** | Page Profil & Sécurité — Google Authenticator ou Authy. Obligatoire pour générer les clés API. |
| 2 | **Compléter le profil** | Prénom, Nom, Entreprise, Site web (`lume.rich`), Pays. |
| 3 | **Générer la clé API Marchand** | Après la 2FA → cliquer "Générer" → récupérer `MERCHANT_API_KEY`. |
| 4 | **Clé API Générale** *(optionnel)* | Dans Paramètres du compte — pour accéder au solde programmatiquement. |

---

## 2. Architecture technique

```
┌─────────────────────────────────────────────────────┐
│                   FRONT-END (Next.js)               │
│  lume.rich                                          │
│  ├── /dashboard        (espace utilisateur)         │
│  ├── /pricing          (page d'achat)               │
│  ├── /checkout         (flux de paiement)           │
│  └── /payment/status   (suivi en temps réel)        │
└─────────────┬───────────────────────────────────────┘
              │ API Routes (Next.js)
┌─────────────▼───────────────────────────────────────┐
│                   BACK-END API                       │
│  /api/payment/                                       │
│  ├── create-invoice    → OxaPay Invoice API          │
│  ├── create-whitelabel → OxaPay White Label API      │
│  ├── webhook           → Réception callbacks OxaPay  │
│  ├── status/[trackId]  → OxaPay Payment Info API     │
│  └── currencies        → OxaPay Accepted Currencies  │
└─────────────┬───────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────┐
│              OxaPay API (api.oxapay.com/v1)          │
│  POST /payment/invoice                               │
│  POST /payment/white-label                           │
│  GET  /payment/{track_id}                            │
│  GET  /payment/accepted-currencies                   │
│  GET  /common/currencies (networks, fees)            │
│  GET  /common/prices     (taux en temps réel)        │
└─────────────────────────────────────────────────────┘
```

---

## 3. Endpoints API back-end

### 3.1 — `POST /api/payment/create-invoice`

Flux principal : l'utilisateur choisit un plan, le back-end appelle OxaPay pour générer une facture.

**Requête vers OxaPay :**

| Paramètre | Valeur |
|-----------|--------|
| URL | `POST https://api.oxapay.com/v1/payment/invoice` |
| Header | `merchant_api_key: TA_CLE_API` |

**Body :**

```json
{
  "amount": 29.99,
  "currency": "USD",
  "lifetime": 60,
  "callback_url": "https://lume.rich/api/payment/webhook",
  "return_url": "https://lume.rich/dashboard",
  "order_id": "order_abc123",
  "email": "user@example.com",
  "thanks_message": "Merci pour votre achat !",
  "description": "Plan Pro — lume.rich"
}
```

**Réponse :**

```json
{
  "track_id": "xxx",
  "payment_url": "https://pay.oxapay.com/xxx",
  "expired_at": "2025-01-01T12:00:00Z"
}
```

> L'utilisateur est redirigé vers `payment_url` (page OxaPay avec branding : couleur `#10b981`, thème sombre, logo).

---

### 3.2 — `POST /api/payment/create-whitelabel`

Flux intégré directement dans l'UI, sans redirection vers OxaPay.

**Requête vers OxaPay :**

| Paramètre | Valeur |
|-----------|--------|
| URL | `POST https://api.oxapay.com/v1/payment/white-label` |
| Header | `merchant_api_key: TA_CLE_API` |

**Body :**

```json
{
  "amount": 29.99,
  "currency": "USD",
  "pay_currency": "USDT",
  "network": "TRC20",
  "lifetime": 60,
  "callback_url": "https://lume.rich/api/payment/webhook",
  "order_id": "order_abc123",
  "email": "user@example.com",
  "description": "Plan Pro — lume.rich"
}
```

**Réponse :**

```json
{
  "track_id": "xxx",
  "address": "TXyz...",
  "pay_amount": 29.99,
  "qr_code": "data:image/png;base64,...",
  "rate": 1.0,
  "expired_at": "2025-01-01T12:00:00Z"
}
```

> Afficher dans l'UI : adresse + QR code + montant exact + countdown.

---

### 3.3 — `POST /api/payment/webhook`

URL configurée : `https://lume.rich/api/payment/webhook`

OxaPay envoie un `POST` JSON quand le statut change.

**Logique critique :**

1. Recevoir le `POST` body en JSON brut
2. Valider le **HMAC-SHA512** (header `HMAC`) avec `MERCHANT_API_KEY` comme secret
3. Vérifier le `status` — ignorer `"Paying"`, agir sur `"Paid"`
4. Quand `status === "Paid"` → activer le plan/produit en BDD
5. Répondre **HTTP 200** avec body `"ok"` (obligatoire, sinon OxaPay retry 5 fois)

**Statuts possibles :**

```
new → waiting → paying → paid
                       → expired
                       → underpaid
                       → refunded
```

---

### 3.4 — `GET /api/payment/status/[trackId]`

Polling côté front pour vérifier l'état d'un paiement en cours.

Appelle `GET https://api.oxapay.com/v1/payment/{track_id}` et retourne le `status` au front.

---

### 3.5 — `GET /api/payment/currencies`

Cache les devises acceptées côté serveur.

Appelle `GET https://api.oxapay.com/v1/payment/accepted-currencies` — utile pour afficher les options de paiement dans le checkout.

---

## 4. Front-end — Pages & composants

### 4.1 — Page `/pricing`

- Affiche les plans/offres
- Chaque plan a un bouton **"Acheter"**
- Au clic :
  - **Invoice** → `POST /api/payment/create-invoice` → redirection vers `payment_url`
  - **White Label** → ouvre un modal de paiement intégré

### 4.2 — Page `/checkout` *(si White Label)*

| Composant | Description |
|-----------|-------------|
| **Sélecteur de crypto** | Liste des devises depuis `/api/payment/currencies`, avec icônes |
| **Sélecteur de réseau** | Si multi-réseaux (ex: USDT → TRC20, ERC20, BSC, Polygon, TON) |
| **Affichage du montant** | USD → équivalent crypto via le `rate` retourné |
| **QR Code** | Champ `qr_code` de la réponse white-label |
| **Adresse wallet** | Avec bouton copier |
| **Countdown** | Timer basé sur `expired_at` — expiration à 0 |
| **Status live** | Polling 10-15s sur `/api/payment/status/[trackId]` |

### 4.3 — Page `/dashboard`

- Page de retour après paiement (`return_url`)
- Affiche : plan actif, historique de paiements, date d'expiration

### 4.4 — Composant `<PaymentStatus />`

Composant réutilisable — état du paiement en temps réel avec badges colorés :

| Status | Couleur | Icône |
|--------|---------|-------|
| `new` | Gris | — |
| `waiting` | Jaune | — |
| `paying` | Orange animé | — |
| `paid` | Vert | ✅ |
| `expired` | Rouge | — |
| `underpaid` | Orange warning | ⚠️ |

---

## 5. Flux de paiement complet

```
User clique "Acheter"
       │
       ▼
Front → POST /api/payment/create-invoice
       │   body: { amount, currency:"USD", order_id, email }
       │
       ▼
Back → POST api.oxapay.com/v1/payment/invoice
       │   reçoit: track_id + payment_url
       │
       ▼
Sauvegarde en BDD
       │   { track_id, user_id, plan, status:"pending" }
       │
       ▼
Redirect user → payment_url (page OxaPay branded)
       │
       ▼
User paie en crypto
       │
       ▼
OxaPay → POST /api/payment/webhook
       │   { track_id, status:"Paying", amount, currency, txs:[...] }
       │   (paiement détecté, PAS encore confirmé)
       │
       ▼
OxaPay → POST /api/payment/webhook
       │   { track_id, status:"Paid", amount, currency, txs:[...] }
       │   (paiement CONFIRMÉ)
       │
       ▼
Webhook handler :
       │   1. Valide HMAC-SHA512
       │   2. Vérifie status === "Paid"
       │   3. Met à jour BDD: order.status = "paid"
       │   4. Active le plan pour l'utilisateur
       │   5. Répond HTTP 200 "ok"
       │
       ▼
User clique "Retour au site" → /dashboard
       │
       ▼
Dashboard affiche : "Plan activé ✅"
```

---

## 6. Sécurité

### Validation HMAC (obligatoire)

Chaque callback OxaPay contient un header `HMAC` = hash **SHA-512** du body JSON avec `MERCHANT_API_KEY` comme clé.

```
HMAC reçu === HMAC-SHA512(body_json, MERCHANT_API_KEY)
```

Si mismatch → rejeter avec code **400**.

### Règles

| Règle | Détails |
|-------|---------|
| **Clé API** | Ne JAMAIS exposer côté client. Tous les appels OxaPay passent par le back-end. |
| **Vérification montant** | Comparer le montant reçu (webhook) avec le montant attendu (BDD). |
| **Variables d'env** | Stocker dans `.env.local` → `OXAPAY_MERCHANT_API_KEY=xxx` |
| **Whitelist IP** | Contacter `support@oxapay.com` pour obtenir les IPs à whitelister sur Cloudflare/firewall. |

---

## 7. Base de données

### Table `payments`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | PK | Identifiant unique |
| `user_id` | FK | Référence utilisateur |
| `track_id` | string | ID de suivi OxaPay |
| `order_id` | string | ID de commande interne |
| `amount` | decimal | Montant |
| `currency` | string | Devise (USD) |
| `plan_type` | string | Type de plan acheté |
| `status` | enum | `pending` / `paying` / `paid` / `expired` / `underpaid` |
| `oxapay_data` | JSON | Données complètes du webhook |
| `created_at` | timestamp | Date de création |
| `updated_at` | timestamp | Dernière mise à jour |

### Table `subscriptions` (ou `user_plans`)

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | PK | Identifiant unique |
| `user_id` | FK | Référence utilisateur |
| `plan` | string | Nom du plan |
| `payment_id` | FK | Référence au paiement |
| `starts_at` | timestamp | Début de la période |
| `expires_at` | timestamp | Fin de la période |
| `is_active` | boolean | Plan actif ou non |

---

## 8. Variables d'environnement

```env
# OxaPay
OXAPAY_MERCHANT_API_KEY=xxx
OXAPAY_API_BASE_URL=https://api.oxapay.com/v1
OXAPAY_WEBHOOK_URL=https://lume.rich/api/payment/webhook

# App
NEXT_PUBLIC_SITE_URL=https://lume.rich
```

---

## 9. Étapes d'implémentation

### Phase 1 — Fondations

- [ ] Activer la 2FA sur OxaPay
- [ ] Générer la clé API Marchand
- [ ] Tester en sandbox (`sandbox: true` dans le body de l'invoice)

### Phase 2 — Backend

- [ ] Créer la route `POST /api/payment/create-invoice`
- [ ] Créer la route `POST /api/payment/webhook`
- [ ] Créer la route `GET /api/payment/status/[trackId]`
- [ ] Implémenter la validation HMAC-SHA512

### Phase 3 — Base de données

- [ ] Créer la table `payments`
- [ ] Créer la table `subscriptions`
- [ ] Connecter le webhook à la logique d'activation de plan

### Phase 4 — Frontend

- [ ] Page `/pricing` avec boutons d'achat
- [ ] Flux checkout (Invoice redirect ou White Label intégré)
- [ ] Page de confirmation de paiement
- [ ] Dashboard avec état du plan utilisateur

### Phase 5 — Tests

- [ ] Tester avec le mode sandbox OxaPay
- [ ] Débuguer les webhooks en local avec ngrok ou requestcatcher.com

### Phase 6 — Production

- [ ] Retirer `sandbox: true`
- [ ] Ajouter les URLs de logo sur R2
- [ ] Whitelister les IPs OxaPay
- [ ] Monitorer les webhooks

---

## 10. Invoice vs White Label

| Critère | Invoice (recommandé pour commencer) | White Label (évolution future) |
|---------|--------------------------------------|-------------------------------|
| **Complexité** | Simple — redirection vers OxaPay | Plus complexe — tout dans ton UI |
| **UX** | L'utilisateur quitte le site | L'utilisateur reste sur lume.rich |
| **Gestion** | OxaPay gère la sélection crypto, adresse, QR, confirmation | Toi tu gères tout côté front |
| **Branding** | Couleur emerald, thème sombre, logo appliqués | 100% ton design |
| **Frais** | 1.5% | 2% |
| **Recommandation** | **Commencer ici** | Migrer après validation du flux |
