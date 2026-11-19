# Contrat d'API WANS TECH — v1

Ce contrat relie les écrans du frontend aux endpoints du backend Django. Il est la référence commune des deux parties : toute modification d'un format de réponse doit être répercutée ici, dans les adaptateurs `frontend/src/services/apiAdapters.ts` du frontend et dans les tests du backend.

Le schéma OpenAPI généré par drf-spectacular fait foi pour le détail des champs : `GET /api/v1/schema/` (Swagger : `/api/v1/docs/`).

## 1. Conventions générales

| Sujet | Convention |
|---|---|
| Préfixe | `/api/v1/` |
| Format | JSON UTF-8 ; noms de champs en **camelCase**, identiques aux types de `frontend/src/types/domain.ts` |
| Identifiants publics | Codes lisibles **uniques par entreprise** : `CMD-00001`, `CLI-0001`, `ENT-001`, `PAI-00001`, `REA-0001`, `RAP-001`. Le produit est identifié par son SKU. Les entreprises et les adhésions sont identifiées par un UUID. Les clés primaires internes ne sont jamais exposées. |
| Montants | Nombres JSON en francs congolais (`CDF`), deux décimales au plus. Le backend calcule en `Decimal` (`NUMERIC(14,2)` en base) et arrondit au centime, demi supérieur. |
| Quantités | Entiers positifs |
| Dates | `YYYY-MM-DD` pour les dates métier ; ISO 8601 avec fuseau (`2026-10-16T09:14:00+01:00`) pour les horodatages. Fuseau de référence : `Africa/Kinshasa` (UTC+1), stockage en UTC. |
| Pourcentages | Nombres (`12.5` = 12,5 %), `null` quand la comparaison est impossible (période précédente nulle) |
| Langue des messages | Français ; les messages `detail` des erreurs 4xx sont rédigés pour être affichés tels quels |

## 2. Authentification et entreprise active

### Jetons

- **Jeton d'accès** (JWT, 10 minutes) : renvoyé dans le corps des réponses de connexion et de rafraîchissement. Le frontend le garde **en mémoire uniquement** et l'envoie dans `Authorization: Bearer <jeton>`.
- **Jeton de rafraîchissement** (7 jours, rotation à chaque usage, ancien jeton mis en liste noire) : déposé dans un cookie `wans_refresh` **HttpOnly**, `SameSite=Lax`, `Secure` en production, limité au chemin `/api/v1/auth/`. Il n'est jamais lisible par JavaScript.
- `POST /auth/refresh/` et `POST /auth/logout/` exigent l'en-tête `X-Requested-With: XMLHttpRequest`. Un site tiers ne peut pas l'ajouter sans requête de contrôle CORS, refusée hors de la liste blanche.
- Les requêtes du navigateur utilisent `credentials: 'include'` pour transmettre le cookie.

### Entreprise active

Chaque endpoint métier exige l'en-tête `X-Company-ID: <uuid de l'entreprise>`. À **chaque requête**, le backend vérifie que :

1. l'utilisateur est authentifié et actif ;
2. l'entreprise existe et est active ;
3. l'utilisateur en est membre avec une adhésion **active** ;
4. le rôle de l'adhésion autorise l'action demandée.

Sinon : `400 company_required` (en-tête absent ou invalide), `403 company_access_denied` (non membre, adhésion suspendue ou entreprise désactivée), `403 permission_denied` (rôle insuffisant). L'identifiant d'entreprise n'est **jamais** lu dans le corps des requêtes : l'entreprise propriétaire d'un objet est toujours celle de l'en-tête vérifié.

Un objet d'une autre entreprise répond `404`, exactement comme un objet inexistant, pour ne pas révéler son existence.

### Rôles

| Rôle (`role`) | Libellé | Droits |
|---|---|---|
| `owner` | Propriétaire | Tout, y compris la désactivation de l'entreprise |
| `admin` | Administrateur | Tout sauf désactiver l'entreprise ; gère les membres (sauf le propriétaire) |
| `manager` | Gestionnaire | Opérations métier complètes : catalogue, stocks, entrepôts, clients, ventes, paiements, rapports |
| `seller` | Vendeur | Lecture du catalogue et des stocks ; création de clients, de ventes **au prix catalogue** et de paiements |
| `viewer` | Lecteur | Lecture seule |

Matrice des capacités utilisées dans ce contrat :

| Capacité | owner | admin | manager | seller | viewer |
|---|:-:|:-:|:-:|:-:|:-:|
| `read` (toute lecture métier) | ✓ | ✓ | ✓ | ✓ | ✓ |
| `sell` (créer client, vente, paiement) | ✓ | ✓ | ✓ | ✓ | |
| `override_price` (prix différent du catalogue, remise) | ✓ | ✓ | ✓ | | |
| `manage_catalog` (produits, catégories, fournisseurs) | ✓ | ✓ | ✓ | | |
| `manage_stock` (entrepôts, réapprovisionnements, réception) | ✓ | ✓ | ✓ | | |
| `manage_orders` (confirmer, faire avancer, annuler) | ✓ | ✓ | ✓ | | |
| `manage_reports` (générer un rapport) | ✓ | ✓ | ✓ | | |
| `manage_company` (profil de l'entreprise) | ✓ | ✓ | | | |
| `manage_members` | ✓ | ✓ | | | |

## 3. Erreurs

Toutes les erreurs ont la même forme :

```json
{ "detail": "Stock insuffisant pour « Onduleur solaire 5 KVA » : 34 disponible(s), 35 demandé(s).", "code": "insufficient_stock", "fields": {} }
```

`fields` détaille les erreurs de validation par champ (`{"sku": ["Cette référence existe déjà."]}`).

| Code HTTP | Usage |
|---|---|
| 200 / 201 / 204 | Succès (lecture ou action / création / suppression ou déconnexion) |
| 400 | Validation (`validation_error`), en-tête d'entreprise absent |
| 401 | Non authentifié ou jeton expiré (`not_authenticated`, `token_not_valid`) |
| 403 | Accès à l'entreprise ou rôle refusé |
| 404 | Objet inexistant **ou** appartenant à une autre entreprise |
| 409 | Conflit métier : stock insuffisant, commande déjà réglée, référence de paiement déjà utilisée, transition de statut interdite, suppression d'un produit déjà vendu |
| 429 | Limitation de débit (connexion, inscription, rafraîchissement) |
| 500 | Erreur interne ; message générique, détail uniquement dans les journaux serveur |

## 4. Pagination, recherche et tri

Les listes sont paginées : `?page=1&pageSize=100` (défaut 100, maximum 500).

```json
{ "count": 132, "next": "…?page=2", "previous": null, "results": [ … ] }
```

Paramètres communs : `search` (recherche texte), `ordering` (champ, préfixé de `-` pour un tri décroissant). Les filtres propres à chaque ressource sont indiqués ci-dessous.

Le frontend filtre les listes côté navigateur (recherche portée par l'URL). Son adaptateur parcourt donc toutes les pages. Ce choix convient aux volumes d'une PME ; au-delà, les pages devront transmettre leurs filtres au serveur (voir README, « Évolution »).

## 5. Endpoints

### 5.1 Santé et documentation

| Méthode | Chemin | Accès | Réponse |
|---|---|---|---|
| GET | `/health/` | Public | `{"status": "ok", "database": "ok"}` ; `503` si la base est injoignable |
| GET | `/schema/`, `/docs/` | Public en développement ; administrateurs Django en production (`API_DOCS_PUBLIC=false`) | OpenAPI 3 / Swagger UI |

### 5.2 Authentification et profil — `/auth/`

| Méthode | Chemin | Corps | Réponse |
|---|---|---|---|
| POST | `/auth/register/` | `{email, password, fullName, companyName}` | `201 {access, user}` + cookie. Crée l'utilisateur, l'entreprise et l'adhésion `owner` dans une même transaction. Désactivable (`REGISTRATION_OPEN=false` → `403`). |
| POST | `/auth/login/` | `{email, password}` | `200 {access, user}` + cookie ; `401 invalid_credentials` |
| POST | `/auth/refresh/` | — (cookie) | `200 {access}` + nouveau cookie ; `401` si absent, expiré ou révoqué |
| POST | `/auth/logout/` | — (cookie) | `204` ; jeton mis en liste noire, cookie effacé |
| GET | `/auth/me/` | — | `200 user` |
| PATCH | `/auth/me/` | `{fullName}` | `200 user` |
| POST | `/auth/change-password/` | `{currentPassword, newPassword}` | `204` ; les jetons de rafraîchissement existants sont révoqués |

Objet `user` :

```json
{
  "id": "6f1c…", "email": "franck@exemple.cd", "fullName": "Franck Mbuyi", "initials": "FM",
  "memberships": [
    { "id": "a2b3…", "role": "owner", "roleLabel": "Propriétaire", "status": "active",
      "company": { "id": "0d9e…", "name": "WANS TECH Ltd.", "isActive": true } }
  ]
}
```

Seules les adhésions actives d'entreprises actives sont listées.

### 5.3 Entreprise active — `/company/`

| Méthode | Chemin | Capacité | Corps / réponse |
|---|---|---|---|
| GET | `/company/` | `read` | `CompanyProfile` : `{companyName, product, market, activity, taxId, timezone}` |
| PATCH | `/company/` | `manage_company` | Mêmes champs |
| GET | `/company/members/` | `manage_members` | `[{id, email, fullName, role, roleLabel, status, joinedAt}]` |
| POST | `/company/members/` | `manage_members` | `{email, fullName, role, password?}` : rattache un compte existant ou crée le compte avec le mot de passe initial fourni. `role` ≠ `owner`. |
| PATCH | `/company/members/{id}/` | `manage_members` | `{role?, status?}` (`active` / `suspended`). Interdit sur le propriétaire et sur soi-même. Un administrateur ne peut pas nommer un autre administrateur. |

La désactivation d'une entreprise (`isActive=false`) se fait par l'administration Django (opérateur WANS TECH) : elle coupe immédiatement l'accès de tous ses membres.

### 5.4 Catalogue

| Méthode | Chemin | Capacité | Notes |
|---|---|---|---|
| GET | `/products/` | `read` | Filtres : `category`, `warehouse`, `status` (`Actif`, `Stock faible`, `Rupture de stock`) |
| POST | `/products/` | `manage_catalog` | `ProductInput` ; voir ci-dessous |
| GET | `/products/{sku}/` | `read` | |
| PATCH | `/products/{sku}/` | `manage_catalog` | Le stock ne se modifie **pas** ici (mouvements uniquement) |
| DELETE | `/products/{sku}/` | `manage_catalog` | `409` si le produit a déjà été vendu ou réapprovisionné |
| GET | `/categories/` | `read` | `["Électronique", …]` |
| POST | `/categories/` | `manage_catalog` | `{name}` |
| GET | `/suppliers/` | `read` | `["Kano Textile Co.", …]` |
| POST | `/suppliers/` | `manage_catalog` | `{name}` |

`ProductInput` : `{name, sku, category, brand, description, purchasePrice, price, stock, minStock, warehouseId, supplier}`. La catégorie et le fournisseur sont désignés par leur nom ; ils sont créés dans l'entreprise s'ils n'existent pas (capacité `manage_catalog`). Le stock initial crée un mouvement `initial`.

Réponse `Product` : champs du type TypeScript, plus `status`. `performance` est calculée : ventes des 30 derniers jours comparées aux 30 jours précédents (`Forte demande` si les ventes récentes dépassent le stock disponible, `En croissance` au-delà de +20 %, `En baisse` en dessous de −20 %, sinon `Stable`).

### 5.5 Entrepôts et stocks

| Méthode | Chemin | Capacité | Notes |
|---|---|---|---|
| GET | `/warehouses/` | `read` | `skus` et `stockValue` (stock × prix d'achat) sont calculés |
| POST | `/warehouses/` | `manage_stock` | `{name, city, manager, capacity, status}` |
| PATCH | `/warehouses/{code}/` | `manage_stock` | Capacité ≥ surface occupée |
| GET | `/inventory/` | `read` | `InventoryItem[]` ; `predicted` = unités vendues sur les 30 derniers jours (projection naïve) ; `value` = stock × prix d'achat |
| GET | `/inventory/alerts/` | `read` | `StockAlert[]` : produits sous leur minimum |
| GET | `/inventory/movements/` | `read` | Journal des mouvements ; filtre `sku` |
| GET | `/restocks/` | `read` | Filtre `status` (`planned`, `received`, `cancelled`) |
| POST | `/restocks/` | `manage_stock` | `{sku, warehouseId, quantity, supplier, expectedDate, notes}` |
| POST | `/restocks/{code}/receive/` | `manage_stock` | Ajoute la quantité au stock (mouvement `restock`) ; une seule réception |
| POST | `/restocks/{code}/cancel/` | `manage_stock` | Uniquement si non reçu |

### 5.6 Clients

| Méthode | Chemin | Capacité | Notes |
|---|---|---|---|
| GET | `/customers/` | `read` | Filtre `tier`. `spent` et `orders` sont calculés à partir des commandes confirmées non annulées. |
| POST | `/customers/` | `sell` | `{name, phone, email, address, city, company, type, notes}` ; e-mail unique dans l'entreprise |
| GET / PATCH | `/customers/{code}/` | `read` / `manage_orders` | |

### 5.7 Ventes (commandes)

| Méthode | Chemin | Capacité | Notes |
|---|---|---|---|
| GET | `/orders/` | `read` | Filtres `status`, `customer`. Chaque commande inclut `amountDue`. |
| POST | `/orders/` | `sell` | Voir ci-dessous |
| GET | `/orders/{code}/` | `read` | |
| POST | `/orders/{code}/confirm/` | `manage_orders` | Brouillon → En traitement ; décrémente le stock |
| POST | `/orders/{code}/status/` | `manage_orders` | `{status}` : En traitement → Expédiée → Livrée ; En attente ↔ En traitement |
| POST | `/orders/{code}/cancel/` | `manage_orders` | Interdit si un paiement réglé existe ; le stock est restitué (mouvement `cancellation`) si la commande avait été confirmée |

Création : `{customerId, lines: [{sku, quantity, unitPrice}], discountPct, paymentMethod, warehouseId, notes, date, mode, idempotencyKey}`.

- `mode` : `brouillon` (statut `Brouillon`, aucun mouvement), `vente` (statut `En traitement`, stock décrémenté), `transaction` (statut `Livrée`, stock décrémenté et paiement réglé du montant total).
- Le backend ignore tout total envoyé : sous-total, remise et total sont recalculés. Le nom des lignes est repris du catalogue.
- Sans la capacité `override_price`, chaque `unitPrice` doit être égal au prix catalogue et la remise doit être nulle (`403 price_override_forbidden`).
- Les produits sont verrouillés (`SELECT … FOR UPDATE`) dans un ordre déterministe ; un stock insuffisant annule toute l'opération (`409 insufficient_stock`).
- `idempotencyKey` (UUID généré par le frontend à l'ouverture du formulaire) : un second envoi avec la même clé renvoie `200` et la commande déjà créée, sans doublon.
- Date dans le futur refusée.

Réponse `Order` : type TypeScript + `amountDue`, `subtotal`, `discount`, `createdBy`.

### 5.8 Paiements

| Méthode | Chemin | Capacité | Notes |
|---|---|---|---|
| GET | `/payments/` | `read` | Filtres `status`, `method`, `order` |
| POST | `/payments/` | `sell` | `{customerId, orderId, amount, method, reference, date, notes}` |

Règles : la commande doit appartenir au client et à l'entreprise, ne pas être un brouillon ni annulée ; `amount` > 0 et ≤ reste à payer, calculé sous verrou de la commande ; `reference` unique dans l'entreprise, sans tenir compte de la casse (`409 duplicate_reference`). Un paiement enregistré n'est ni modifiable ni supprimable par l'API : une erreur se corrige par l'administration, tracée dans le journal d'audit.

### 5.9 Tableau de bord, statistiques et analyses

Périodes (`period`) : `7j`, `30j`, `3m`, `6m`, `1a`. Une période se termine aujourd'hui (inclus) ; la période précédente a la même durée et la précède immédiatement.

| Méthode | Chemin | Réponse |
|---|---|---|
| GET | `/dashboard/summary/?period=30j` | `{revenue: {value, changePct}, sales: {value, changePct}, orders: {value, changePct, processing}, stock: {value, alerts, warehouses}}` |
| GET | `/dashboard/revenue/?period=30j` | `[{label, current, previous}]` en FC ; points quotidiens (7j, 30j) ou mensuels (3m, 6m, 1a) |
| GET | `/stats/sales/` | `{todayRevenue, todayRevenueChangePct, todayOrders, todayOrdersChangePct, averageBasket, averageBasketChangePct, ordersThisQuarter}` (aujourd'hui comparé à hier ; panier moyen sur 30 jours comparé aux 30 jours précédents) |
| GET | `/stats/customers/` | `{total, platinum, newThisMonth}` |
| GET | `/stats/inventory/` | `{references, stockValue, lowStock, outOfStock}` |
| GET | `/stats/payments/` | `{settledYear, pendingAmount, pendingCount, failedAmount, failedCount, activeMethods}` |
| GET | `/analytics/monthly/?year=2026` | `[{month, revenue, customers, orders}]` |
| GET | `/analytics/margins/` | `[{name, margin}]` : marge brute % par catégorie sur 90 jours |

Définitions des indicateurs :

- **Chiffre d'affaires** : somme des totaux des commandes confirmées (statuts En traitement, En attente, Expédiée, Livrée), datées dans la période. Les brouillons et commandes annulées sont exclus. Ce n'est **pas** un encaissement.
- **Ventes** (« transactions réalisées ») : nombre de paiements réglés dans la période.
- **Encaissements** : somme des paiements au statut Réglé.
- **Marge brute** : (prix de vente − coût d'achat enregistré sur la ligne au moment de la vente) × quantité, remise répartie au prorata.
- Ne sont **pas** calculés, faute de données : bénéfice net, dépenses, trésorerie disponible.

### 5.10 Rapports

| Méthode | Chemin | Capacité | Notes |
|---|---|---|---|
| GET | `/reports/` | `read` | Historique des rapports générés |
| POST | `/reports/` | `manage_reports` | `{type, period, format, from?, to?}` → `Report` |
| GET | `/reports/rows/?type=…&period=…&from=…&to=…` | `read` | `{columns, rows}` calculés à la volée |
| GET | `/reports/{code}/rows/` | `read` | Lignes d'un rapport enregistré, recalculées sur sa période |

Le fichier (PDF, Excel, CSV) est produit par le navigateur à partir de ces lignes (`frontend/src/lib/exportFile.ts`). Chaque consultation de lignes est tracée dans le journal d'audit.

### 5.11 Recherche et notifications

| Méthode | Chemin | Réponse |
|---|---|---|
| GET | `/search/?q=…` (≥ 2 caractères) | `SearchResult[]` (produits, clients, commandes, paiements ; 8 au plus) |
| GET | `/notifications/` | `AppNotification[]` dérivées des alertes de stock |

### 5.12 Fonctions non couvertes par l'API

Aucun endpoint n'existe pour : prévisions par modèle statistique, anomalies, recommandations, assistant IA, radar de performance, facturation de l'abonnement, téléversement d'images, dépenses, achats fournisseurs au-delà des réapprovisionnements. En mode API, le frontend affiche pour ces écrans un message « non disponible » au lieu de données simulées.

## 6. Correspondance écrans → endpoints

| Écran / composant | Endpoints |
|---|---|
| Connexion, inscription (nouveaux) | `/auth/login/`, `/auth/register/`, `/auth/refresh/`, `/auth/me/` |
| Topbar (profil, entreprise active, déconnexion) | `/auth/me/`, `/auth/logout/` |
| Recherche globale | `/search/` |
| Notifications | `/notifications/` |
| Vue générale | `/dashboard/summary/`, `/dashboard/revenue/` |
| Produits / Ajouter un produit | `/products/`, `/categories/`, `/suppliers/`, `/warehouses/` |
| Ventes | `/orders/`, `/stats/sales/`, `/dashboard/revenue/?period=7j` |
| Nouvelle commande / transaction | `/customers/`, `/products/`, `/warehouses/`, `POST /orders/` |
| Clients / Ajouter un client | `/customers/`, `/stats/customers/` |
| Stocks, Alertes critiques | `/inventory/`, `/inventory/alerts/`, `/stats/inventory/`, `/warehouses/` |
| Réapprovisionnement | `/products/`, `/inventory/`, `/suppliers/`, `/warehouses/`, `POST /restocks/` |
| Entrepôts | `/warehouses/` |
| Paiements / Enregistrer un paiement | `/payments/`, `/stats/payments/`, `/orders/`, `/customers/` |
| Rapports / Générer / Exporter | `/reports/`, `/reports/rows/` |
| Analyses | `/analytics/monthly/` (radar non disponible) |
| Prévisions | `/inventory/`, `/products/`, `/warehouses/` (courbe et indicateurs de modèle non disponibles) |
| Rentabilité | `/analytics/margins/` (indicateurs consolidés non disponibles) |
| Paramètres → Entreprise | `/company/` |
| Paramètres → Équipe | `/company/members/` |
| Paramètres → Sécurité | `/auth/change-password/` |
| Intelligence, Anomalies, Recommandations, Assistant IA | Aucun (non disponible en mode API) |
