# Frontend WANS COMMERCE

Application web de gestion commerciale et d'intelligence décisionnelle de **WANS TECH**, réalisée à partir de la maquette Figma Make « Enterprise Management App UI ».

React 19 · TypeScript (strict) · Vite 7 · React Router 7 · Recharts 3 · Tailwind CSS 4 (utilitaires ponctuels) · Vitest.

Ce document reprend et met à jour l'ancien README du frontend. Le point d'entrée du projet est le [README principal](../README.md).

## Commandes

```bash
cd frontend           # toutes les commandes du frontend se lancent depuis ce dossier
cp .env.example .env  # variables VITE_* (voir ci-dessous)
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # contrôle TypeScript
npm test           # tests unitaires et de composants (Vitest + Testing Library)
npm run build      # typecheck + build de production dans dist/
npm run preview    # sert le build de production (http://localhost:4173)
```

## Sources de données

| Variable | Valeurs | Rôle |
|---|---|---|
| `VITE_DATA_SOURCE` | `demo` (défaut) / `api` | Source des données |
| `VITE_API_BASE_URL` | ex. `http://localhost:8000` ; vide = même origine | URL du backend Django |
| `VITE_API_PREFIX` | `/api/v1` (défaut) | Préfixe de version de l'API |

**Mode démonstration.** Les données proviennent de la maquette Figma (`frontend/src/services/demo/seed.ts`), signalées par la pastille « Données de démonstration ». Les opérations sont réellement exécutées dans le navigateur (stock décrémenté, paiement rapproché…) et conservées dans `sessionStorage` jusqu'à la fermeture de l'onglet. Le Centre d'aide permet de les réinitialiser. Rien n'est envoyé à un serveur. L'assistant IA y répond par règles, sans modèle, et l'interface l'indique.

**Mode API.** Toutes les pages de gestion utilisent le backend Django : connexion, entreprise active, produits, stocks, entrepôts, clients, ventes, paiements, rapports, tableau de bord, recherche, notifications, profil de l'entreprise, équipe et mot de passe. Les fonctions sans source réelle (synthèse Intelligence, anomalies, recommandations, assistant IA, radar de performance, courbe de prévision par modèle, indicateurs consolidés de rentabilité) affichent un message « non disponible » au lieu de chiffres simulés.

## Architecture

```
frontend/src/
  app/          routes (pages chargées à la demande), navigation, écran d'erreur
  layout/       AppShell (garde de session en mode API), Sidebar, Topbar, recherche globale, centre d'aide
  pages/        pages métier ; intelligence/ ; workflows/ (parcours /flux/*) ; settings/ ; LoginPage
  components/   ui/ (design system : Button, Card, Badge, Field, Modal, Toast, DataTable…), charts/
  services/     index.ts (point d'entrée), apiAdapters.ts (mode API), http.ts, session.ts, demo/ (mode démo)
  hooks/        useAsync, useForm, useQueryParam, useMediaQuery, useDataVersion, useSession
  lib/          formatage fr-FR, validation, règles métier, export CSV/Excel/PDF
  theme/        ThemeProvider (clair / sombre / système) et couleurs des graphiques
  styles/       index.css : jetons du design system Figma, composants, responsive
  types/        types du domaine (partagés avec le contrat d'API)
  test/         tests Vitest
```

Règles :

- Les composants n'appellent jamais `fetch` ni le magasin de démonstration : tout passe par `frontend/src/services/index.ts`, qui choisit l'implémentation selon `VITE_DATA_SOURCE`.
- Le jeton d'accès est gardé en mémoire (`frontend/src/services/http.ts`), jamais dans `localStorage`. Le jeton de rafraîchissement est un cookie HttpOnly.
- Après une écriture en mode API, `subscribeToData()` prévient les écrans, qui rechargent leurs listes sans repasser par l'état de chargement. Changer d'entreprise remonte entièrement l'interface (`key` sur le shell).
- Les filtres et recherches sont portés par l'URL (`/produits?q=ciment&statut=Actif`), donc partageables et compatibles avec le bouton Retour.

## Adaptations faites pour l'intégration du backend

- Ajout d'une page de connexion / création d'espace (`/connexion`), d'une garde de session et du menu de profil (changement d'entreprise, déconnexion), dans le style existant.
- Indicateurs d'en-tête des pages Ventes, Clients, Stocks et Paiements fournis par `statsService` (valeurs Figma en démonstration, valeurs réelles en API).
- Fonctions synchrones devenues asynchrones : recherche globale (temporisée en API), notifications, lignes de rapport. Le reste à payer provient de `Order.amountDue`.
- `OrderForm` : clé d'idempotence par saisie ; entrepôt par défaut choisi parmi les entrepôts réels.
- `ProductForm` et `RestockForm` : en mode API, catégorie et fournisseur sont saisis librement avec suggestions (une nouvelle entreprise n'en a encore aucun).
- Nouveau statut de commande `Annulée`.

## Décisions de conception (maquette)

- **Système de design retenu.** Le code Figma contenait deux styles : les écrans récents (bleu `#2563EB`, clair et sombre) et des écrans historiques sombres cyan. Tous les écrans utilisent le système récent.
- **Incohérences de la maquette corrigées** : pays des clients ramenés à la RDC, numéros de commande uniformisés en `CMD-`, stock du tissu Ankara harmonisé, entrepôts unifiés sur les 6 sites de la page Entrepôts.
- **Thème « Automatique »** ajouté aux deux thèmes de la maquette.
- **Accessibilité.** Gris « subtil » foncé à 4,6:1 ; texte bleu en thème sombre éclairci à 7,9:1 ; textes de 8 px portés à 10 px.
- **Export PDF** via la boîte d'impression du navigateur ; format Excel en SpreadsheetML (`.xls`).

## Zones sûres (encoche, barre d'accueil)

- `viewport-fit=cover` est activé ; les variables `--safe-top/right/bottom/left` sont appliquées à toutes les largeurs.
- La topbar collante, la sidebar, le tiroir mobile, les modales, les notifications, le lien d'évitement et la page de connexion en tiennent compte.
- `100dvh` remplace `100vh` sur mobile.

Vérifié par simulation (encoche de 47 px en portrait, 59 px en paysage). Le comportement réel reste à confirmer sur un iPhone physique.

## Limites connues

- L'image d'un produit est validée et prévisualisée, mais pas téléversée (aucun endpoint d'envoi de fichiers).
- Les listes sont chargées entièrement puis filtrées dans le navigateur ; adapté aux volumes d'une PME, à revoir au-delà (voir README, « Évolution »).
- Le rendu du mode API n'a pas été vérifié visuellement dans un navigateur réel lors de la livraison initiale (voir README, « État des fonctionnalités »).
