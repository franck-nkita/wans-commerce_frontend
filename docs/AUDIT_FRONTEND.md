# Audit du frontend WANS COMMERCE

Date de l'audit : 16 octobre 2026. Dépôt audité : `frontend_project` (un seul commit, `1cb0942 initialisation`, arbre propre).

> **Note (17/10/2026)** : audit historique, antérieur à la réorganisation. Les chemins `src/`, `package.json` et `.env.example` cités ici se trouvent désormais dans `frontend/` (voir [REORGANIZATION_REPORT.md](REORGANIZATION_REPORT.md)).

Ce document décrit le frontend tel qu'il existait **avant** l'ajout du backend Django. Il distingue ce qui fonctionne réellement, ce qui est simulé et ce qui manque. Les décisions d'intégration qui en découlent sont résumées en fin de document.

## 1. Pile technique

| Élément | Version (package.json) | Remarque |
|---|---|---|
| React | ^19.0.0 | Composants fonctionnels, hooks |
| TypeScript | ^5.7.0 | Mode `strict`, `noUnusedLocals`, alias `@/` |
| Vite | ^7.0.0 | Dev sur `http://localhost:5173` |
| React Router | ^7.6.0 | `createBrowserRouter`, pages chargées à la demande (`lazy`) |
| Recharts | ^3.0.0 | Tous les graphiques |
| Tailwind CSS | ^4.0.0 | Utilitaires ponctuels ; l'essentiel du style est dans `src/styles/index.css` |
| Vitest + Testing Library | ^3.2.0 / ^16.3.0 | 3 fichiers de tests (`src/test/`) |

Aucune bibliothèque de gestion d'état, de requêtes (React Query…) ni de formulaires : hooks maison (`useAsync`, `useForm`, `useQueryParam`).

## 2. Routage

Défini dans `src/app/routes.tsx`, toutes les routes sont enfants de `AppShell` (sidebar + topbar).

| Chemin | Page | Chemin | Page |
|---|---|---|---|
| `/` | Vue générale (Dashboard) | `/intelligence` | Intelligence |
| `/produits` | Produits | `/previsions` | Prévisions |
| `/ventes` | Ventes | `/anomalies` | Anomalies |
| `/clients` | Clients | `/recommandations` | Recommandations |
| `/inventaire` | Stocks | `/rentabilite` | Rentabilité |
| `/entrepots` | Entrepôts | `/assistant-ia` | Assistant IA |
| `/paiements` | Paiements | `/parametres` | Paramètres |
| `/analyses` | Analyses | `/rapports` | Rapports |

Parcours (`/flux/*`) : `new-transaction`, `new-order`, `add-product`, `add-customer`, `reorder`, `record-payment`, `alerts`, `generate-report`, `export-report`.

Il n'existe **aucune route de connexion** ni garde d'authentification.

## 3. Écrans et interactions

| Écran | Données affichées | Actions |
|---|---|---|
| Vue générale | 4 KPI, courbe du CA (5 périodes), cartes « Intelligence », liste « À savoir aujourd'hui » | Exporter, nouvelle transaction |
| Produits | Tableau filtrable (recherche, catégorie, statut), fiche en modale | Ajouter, réapprovisionner |
| Ventes | 3 indicateurs, courbe 7 jours, bandeau d'analyse, tableau des commandes, détail en modale | Nouvelle commande |
| Clients | 3 indicateurs, tableau filtrable, fiche en modale | Ajouter, nouvelle commande pour le client |
| Stocks | 4 indicateurs, bandeau d'analyse, tableau avec demande prévue et niveau | Alertes, réapprovisionner |
| Entrepôts | Cartes (capacité, références, valeur du stock) | Ajouter, modifier |
| Paiements | 4 indicateurs, tableau filtrable | Enregistrer un paiement |
| Rapports | Liste des rapports générés | Générer, télécharger (PDF/Excel/CSV) |
| Analyses | CA mensuel, radar de performance, commandes/clients mensuels | — |
| Intelligence, Prévisions, Anomalies, Recommandations, Rentabilité, Assistant IA | Indicateurs, graphiques, listes, conversation | Changer le statut d'une anomalie, marquer une recommandation traitée, poser une question |
| Paramètres | Profil de l'entreprise, apparence ; Équipe, Sécurité, Facturation = « nécessite l'API » | Enregistrer le profil, choisir le thème |
| Topbar | Recherche globale, notifications, profil codé en dur (« Franck Mbuyi ») | — |

Formulaires et leurs règles côté client :

- **Commande / transaction** (`OrderForm`) : client, lignes (SKU, quantité entière > 0, prix unitaire > 0 **modifiable**), remise 0–100 %, mode de paiement, entrepôt (valeur par défaut codée en dur `ENT-001`), date non future. Trois modes : brouillon (aucun mouvement de stock), vente (décrémente le stock), transaction (vente + paiement réglé).
- **Paiement** : client → commande non brouillon avec reste à payer → montant ≤ reste à payer, référence unique (≥ 4 caractères), date non future.
- **Produit** : SKU `^[A-Za-z0-9-]{4,20}$` unique, prix de vente ≥ prix d'achat, stock et minimum entiers ≥ 0, entrepôt, fournisseur. L'image est validée (2 Mo) mais jamais envoyée.
- **Client** : nom, téléphone, e-mail facultatif mais unique, ville, entreprise obligatoire sauf pour un particulier.
- **Réapprovisionnement** : produit, entrepôt, quantité entière > 0, fournisseur, date prévue non passée.
- **Entrepôt** : nom unique, ville, responsable, capacité > 0 et ≥ surface occupée.
- **Rapport** : type, période (dont personnalisée), format.

## 4. Couche d'accès aux données

Point d'entrée unique : `src/services/index.ts`. Les composants n'appellent jamais `fetch` directement — c'est l'atout principal pour l'intégration.

- `src/services/config.ts` : `VITE_DATA_SOURCE` (`demo` | `api`), `VITE_API_BASE_URL`, `VITE_API_PREFIX`.
- `src/services/http.ts` : `apiRequest()` minimal, **jamais utilisé**. Pas d'en-tête d'authentification, pas de gestion du 401, message d'erreur générique.
- En mode `api`, chaque service lève une `DomainError` explicite : le mode API n'est pas branché.
- `src/types/domain.ts` : types métier (Product, Order, Customer, Warehouse, Payment, Restock, Report, StockAlert, CompanyProfile…). Les identifiants sont des **codes lisibles** (`CMD-20491`, `CLI-1001`, `ENT-001`, `PAI-91821`, `RAP-006`) ; le produit est identifié par son SKU. Les montants sont des `number` en francs congolais (CDF).

Fonctions **synchrones** qui lisent directement le magasin de démonstration et ne peuvent pas être branchées telles quelles sur un réseau :

| Fonction | Utilisée par |
|---|---|
| `searchAll()` | `GlobalSearch` |
| `notifications()` | `Topbar` |
| `openAnomaliesCount()` | `Sidebar`, `Dashboard` |
| `paymentsService.amountDue()` | `PaymentForm` (filtrage et validation) |
| `inventoryService.suggestedQuantity()` | `RestockForm` |
| `reportsService.rows()` | `Reports`, `ReportForm` |

`useAsync` recharge les listes via `subscribeToData()`, branché uniquement sur le magasin de démonstration.

## 5. Données codées en dur et simulations

Le mode démonstration (`src/services/demo/`) est **fonctionnel** : les opérations modifient un état conservé dans `sessionStorage` (stock décrémenté, paiement rapproché…). Il est signalé dans l'interface par la pastille « Données de démonstration ».

En revanche, de nombreuses valeurs sont **écrites directement dans les pages**, indépendamment de la source de données :

| Page | Valeurs figées |
|---|---|
| Vue générale | Cartes Intelligence (« +18 % de ventes attendues », « 3 produits… »), liste « À savoir aujourd'hui », texte « Analyse IA », « Bonjour, Franck », heure de dernière analyse |
| Ventes | « 24 821 commandes », Ventes du jour, Commandes du jour, Panier moyen, bandeau d'analyse |
| Clients | « 8 394 comptes… », Total, Platine, Nouveaux ce mois |
| Stocks | Total des références, Valeur du stock, Stock faible, Ruptures, texte d'analyse |
| Paiements | Total encaissé, En attente, Échoués, Délai de traitement, « 5 modes actifs » |
| Analyses | Radar de performance (satisfaction client, taux de retour… : aucune source de données) |
| Intelligence | Page entière |
| Prévisions | Mini-indicateurs (prévision d'octobre, confiance 87 %), courbe de prévision |
| Anomalies | Liste de démonstration ; « 18 + … résolues ce mois » |
| Recommandations | Liste de démonstration ; « FC 15,0 M », « 12 + … » |
| Rentabilité | Mini-indicateurs, marges par catégorie, texte d'analyse |
| Assistant IA | Réponses calculées par règles ; sources « 24 821 transactions… » |
| Sidebar / Topbar | Utilisateur « Franck Mbuyi », rôle « Administrateur » |

Indicateurs consolidés du tableau de bord (`dashboardSummary`, `revenueByPeriod`) : valeurs de la maquette Figma.

## 6. Utilisateurs, entreprises, rôles

- Aucune connexion, déconnexion, inscription ni gestion de session.
- Aucune notion d'entreprise active ou multiple : le profil d'entreprise est un objet unique stocké dans `localStorage`.
- Aucun rôle ni permission dans l'interface (tout le monde peut tout faire).
- Les onglets Équipe et Sécurité annoncent qu'ils nécessitent l'API.

## 7. Domaines présents et absents

| Domaine | Présent dans le frontend ? |
|---|---|
| Produits, catégories, fournisseurs (liste de noms) | Oui |
| Stocks, alertes, réapprovisionnements | Oui (création seulement ; pas de réception) |
| Entrepôts | Oui |
| Clients | Oui (création, consultation ; pas de modification) |
| Ventes / commandes et lignes | Oui (création ; pas de confirmation ultérieure ni d'annulation) |
| Paiements | Oui (création, consultation) |
| Rapports et exports | Oui (export généré côté navigateur) |
| Notifications | Oui (dérivées des alertes de stock et des anomalies) |
| Fournisseurs (écran dédié), achats, **dépenses** | **Non** |
| Unités de mesure | **Non** |
| Prévisions, anomalies, recommandations, assistant IA | Interface présente, données simulées |

## 8. Backend existant hors dépôt

Un dossier voisin `../backend_project` contient un backend **FastAPI + MySQL** (SQLAlchemy, `pymysql`), avec des contrôleurs pour produits, variantes, marques, catégories, clients, ventes, stocks, entrepôts, tableau de bord et prévisions (scikit-learn). Son authentification est vide (`auth_routes.py`), il n'a ni paiements ni rapports, ni notion d'entreprise. Il contient un fichier `.env` local.

Il n'est **ni modifié ni réutilisé** : la mission impose Django + PostgreSQL et interdit FastAPI en parallèle. Une migration de ses données MySQL n'est pas couverte (voir « Décisions en attente » du README).

## 9. Scripts et configuration

- `npm run dev | build | typecheck | test | preview`.
- `.env.example` : `VITE_DATA_SOURCE=demo`, `VITE_API_BASE_URL=http://localhost:8000`.
- `.gitignore` minimal (`node_modules`, `dist`, `.env`…). Le dossier `dist/` est présent localement mais ignoré.

## 10. Risques et points bloquants pour l'intégration

1. **Fonctions synchrones** (§4) : elles doivent devenir asynchrones ou s'appuyer sur des données déjà chargées.
2. **Valeurs figées dans les pages** (§5) : en mode API, elles afficheraient de faux résultats à côté de vraies données. Elles doivent provenir des services ou être masquées.
3. **Entrepôt par défaut `ENT-001`** dans `OrderForm` : il n'existera pas forcément dans une entreprise réelle.
4. **Prix unitaire modifiable** dans les commandes : le backend doit recalculer les totaux et encadrer cette liberté par des droits.
5. **Pas d'authentification** : il faut ajouter une page de connexion, une session et la sélection de l'entreprise active, sans refaire le design.
6. **Pas d'idempotence** : un double clic sur « Valider la transaction » peut créer deux ventes.
7. **Un seul stock par produit** dans le modèle frontend (`Product.stock` + `warehouseId`) : le stock multi-entrepôts par produit n'est pas représenté.
8. Les **fonctions d'intelligence** n'ont aucune source de données réelle : il n'existe pas de modèle de prévision dans ce dépôt.

## 11. Hypothèses retenues

- Le frontend reste la référence : les réponses de l'API reprennent les noms de champs des types TypeScript (camelCase) et les codes lisibles comme identifiants publics, uniques **par entreprise**.
- Le mode démonstration est conservé tel quel (`VITE_DATA_SOURCE=demo`) pour les présentations ; le mode `api` devient pleinement fonctionnel.
- Un produit possède un entrepôt principal qui porte tout son stock (modèle du frontend). Le stock par entrepôt est une évolution documentée.
- La devise est le franc congolais (CDF) pour toutes les entreprises en première version.
- Les fonctions d'intelligence sans source réelle sont **désactivées et signalées** en mode API, au lieu d'afficher des chiffres inventés. Exceptions calculées à partir de données réelles : demande des 30 derniers jours (projection naïve), marges par catégorie, CA mensuel.
