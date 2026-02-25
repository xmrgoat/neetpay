# Rapport Complet - OxaPay : Passerelle de Paiement Crypto

## 1. Présentation Générale

OxaPay est une passerelle de paiement en cryptomonnaies destinée aux entreprises et développeurs. Elle permet d'accepter des paiements en crypto sans gérer d'infrastructure blockchain. Point distinctif principal : **aucun KYC requis** (vérification d'email uniquement).

---

## 2. Services Offerts

### 2.1 Services de Paiement (Merchant)

| Service | Description | Frais |
|---------|-------------|-------|
| Merchant API | Intégration technique complète via API REST | Variable (à partir de 0.4%) |
| Merchant Invoice | Facturation automatisée sans code | 1.5% |
| White Label | Checkout personnalisé à la marque | 2% |
| Static Address | Adresses permanentes pour paiements récurrents | 2% + frais fixes |
| Payment Link | Liens de paiement partageables (sans site web) | 1.5% |
| Donation Service | Intégration de boutons de dons | 1.5% |
| POS System | Acceptation en magasin physique | Non précisé |

### 2.2 Services de Sortie (Payout)

- **Payout API** : transferts crypto automatisés et en masse
- **Mode Interne** : transferts entre adresses OxaPay = 0 frais, pas de minimum
- **Mode Externe** : transferts blockchain = frais réseau variables
- **Endpoint API** : `https://app-api.oxapay.com/v1/payout`
- Nécessite 2FA, IP autorisées, et limites configurables

### 2.3 Outils Complémentaires

- **Swap** : Conversion entre cryptos dans le wallet, frais < 1%, 32 paires disponibles, ordres limites possibles
- **Telegram Wallet** : Gestion crypto via bot Telegram
- **Extension navigateur** : Accès rapide depuis le navigateur

---

## 3. Cryptomonnaies Supportées (18+)

| Crypto | Symbole | Réseaux |
|--------|---------|---------|
| Bitcoin | BTC | Bitcoin |
| Ethereum | ETH | Ethereum, BSC, Base |
| Tether | USDT | Multi-chain (Tron, ETH, BSC, SOL, etc.) |
| USD Coin | USDC | Multi-chain |
| Tron | TRX | Tron |
| BNB | BNB | BSC |
| Solana | SOL | Solana |
| Ripple | XRP | XRP Ledger |
| Litecoin | LTC | Litecoin |
| Dogecoin | DOGE | Dogecoin |
| Monero | XMR | Monero |
| Toncoin | TON | TON |
| Polygon | POL | Polygon |
| Bitcoin Cash | BCH | Bitcoin Cash |
| Shiba Inu | SHIB | Multi-chain |
| DAI | DAI | Multi-chain |
| Notcoin | NOT | TON |
| DOGS | DOGS | TON |

---

## 4. Grille Tarifaire Détaillée

### Frais de Transaction

| Service | Frais |
|---------|-------|
| Payment Link / Donation / Invoice | 1.5% |
| White Label | 2% |
| Static Address | 2% + frais fixes |
| Réduction sur volume | Jusqu'à 0.4% (négociable) |
| Payout interne | Gratuit |
| Swap | < 1% (pas de frais réseau) |
| Transfert interne | Gratuit |

### Frais de Retrait (exemples)

| Crypto | Réseau | Min. retrait | Frais |
|--------|--------|-------------|-------|
| BTC | Bitcoin | 0.000045 BTC | 0.00001 BTC |
| ETH | Ethereum | 0.0001 ETH | 0.0002 ETH |
| ETH | BSC | 0.00025 ETH | 0.000014 ETH |
| USDT/USDC | Variable | Variable | 0.25 - 1 USDT |

---

## 5. Intégrations & Plugins

**13 plateformes e-commerce supportées :**

WooCommerce, WHMCS, Blesta, WISECP, ClientExec, PrestaShop, Easy Digital Downloads, Paid Memberships Pro, Gravity Forms, Restrict Content Pro, VirtueMart, OpenCart, Magento 2

Toutes les intégrations sont disponibles en téléchargement direct ou via GitHub.

---

## 6. API Technique

### Endpoints Disponibles

- **Paiements** : Generate Invoice, Generate White Label, Generate Static Address, Revoke Static Address, Static Address List, Payment Info/History, Accepted Currencies, Payment Status Table
- **Payouts** : Generate Payout, Payout Info/History, Payout Status Table
- **Swap** : Swap Request, Swap History, Swap Pairs, Swap Calculate, Swap Rate
- **Général** : Account Balance, Prices, Supported Currencies/Fiat/Networks, System Status

### Fonctionnalités Avancées

| Fonctionnalité | Description |
|----------------|-------------|
| Underpaid Coverage | Accepte les paiements légèrement inférieurs |
| Fee Paid by Payer | Frais reportés sur le client |
| Auto Convert | Conversion automatique en USDT |
| Auto Withdrawal | Retrait automatique vers un wallet |
| Mixed Payment | Paiement en plusieurs cryptos |
| Webhooks | Notifications temps réel |

---

## 7. Programme de Parrainage

- **Commission** : 30% sur les frais de transaction des filleuls
- **Durée** : Illimitée (à vie)
- Pas de plafond sur le nombre de parrainages
- **Referrals Plus** : les destinataires de vos factures deviennent automatiquement vos filleuls

---

## 8. Réputation & Avis

**Trustpilot** : 3.6/5 (20 avis) — 80% de 5 étoiles | 20% de 1 étoile (polarisé)

### Points Positifs (récurrents)

- Interface propre et facile d'utilisation
- Inscription sans KYC rapide
- Frais compétitifs (0.4%)
- API bien documentée
- Support réactif
- Fonctionnalité Static Address très appréciée

### Points Négatifs (récurrents)

- Cas de fonds bloqués signalés ($800 non remboursés)
- Allégations de faux avis positifs
- Délais de réponse support lors de litiges (20+ jours)
- Préoccupations de légitimité soulevées par certains utilisateurs
- Trustpilot signale une association avec des investissements à haut risque

---

## 9. Pays Restreints

Cuba, Iran, Corée du Nord, Crimée, Soudan, Syrie, **États-Unis**, Bangladesh, Hong Kong, Bolivie, et pays sous sanctions ONU.

> **Point important** : Les USA sont dans la liste des pays restreints, ce qui indique qu'OxaPay n'est pas conforme aux régulations américaines.

---

## 10. Langues Supportées

Anglais, Espagnol, Russe, Turc, Chinois, Français, Persan, Arabe

---

## 11. Analyse SWOT

| Forces | Faiblesses |
|--------|-----------|
| Pas de KYC (inscription rapide) | Pas de KYC (risque réglementaire) |
| Frais bas (0.4% - 2%) | Réputation polarisée |
| 18+ cryptos, multi-chain | USA + pays majeurs restreints |
| 13 plugins e-commerce | Pas d'entité juridique publique |
| API complète + webhooks | Pas d'audit de sécurité public |
| Swap intégré < 1% | |

| Opportunités | Menaces |
|-------------|---------|
| Marché crypto B2B en croissance | Régulations anti-crypto croissantes |
| Expansion géographique possible | Concurrence (NOWPayments, CoinGate, BTCPay) |
| Intégration Telegram (audience large) | Risque réputationnel si litiges non résolus |

---

## 12. Conclusion & Recommandation

OxaPay est une solution viable pour des projets qui :

- Ont besoin d'une intégration rapide sans processus KYC
- Ciblent des marchés hors USA/sanctionnés
- Veulent des frais bas et une API flexible
- Acceptent le risque d'une plateforme custodiale sans transparence légale

### Points de vigilance pour l'intégration dans VoidPay

- L'absence de KYC peut poser des problèmes de conformité selon votre juridiction
- La plateforme est **custodiale** (ils détiennent les fonds)
- Pas d'entité juridique clairement identifiée publiquement
- Les avis négatifs mentionnent des blocages de fonds non résolus
- Les USA étant restreints, cela exclut une part significative du marché
