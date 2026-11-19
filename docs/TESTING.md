# Tests et contrôles

Ce document détaille la section « L. Tests et qualité » du [README](../README.md) : organisation des tests, commandes, et résultats **réellement observés** le 16 octobre 2026.

## 1. Backend (pytest + pytest-django, PostgreSQL 16)

Les tests utilisent PostgreSQL, comme la production : verrous de lignes, contraintes `CHECK`, index uniques partiels et fonctions de date ne sont pas simulés par SQLite. pytest-django crée une base de test temporaire (`test_wanstech`) ; l'utilisateur PostgreSQL doit pouvoir créer des bases (c'est le cas du conteneur `db`).

```bash
docker compose up -d db
set -a && . ./.env && set +a            # charge les variables du .env racine (bash)
cd backend && .venv/Scripts/python -m pytest -q   # Linux/macOS : .venv/bin/python
# ou, dans Docker :
docker compose exec backend python -m pytest -q
```

Paramètres : `config/settings_test.py` (identique à la configuration réelle, hachage de mot de passe rapide). Les clients de test s'authentifient avec de **vrais jetons JWT** et l'en-tête `X-Company-ID`, comme le frontend.

| Fichier | Tests | Couverture |
|---|---|---|
| `test_isolation.py` | 28 | Lecture, modification, suppression et accès par l'URL entre entreprises ; vente avec produit, client ou entrepôt étranger ; entreprise forcée dans la requête ; paiements, clients, stocks, mouvements ; statistiques, tableau de bord, exports, recherche, notifications ; non-membre, en-tête absent, suspension, entreprise désactivée, membre de deux entreprises ; 10 endpoints sans authentification ; jeton falsifié |
| `test_auth.py` | 14 | Inscription (entreprise + propriétaire, cookie HttpOnly, pas de rôle choisi, fermeture), connexion, message d'échec générique sans donnée journalisée, compte désactivé, rafraîchissement avec rotation et liste noire, en-tête anti-CSRF, déconnexion, changement de mot de passe qui révoque les sessions, limitation de débit, adhésions utilisables |
| `test_company_members.py` | 9 | Profil d'entreprise, droits des rôles, ajout d'un compte nouveau ou existant, doublon, rôle propriétaire non attribuable, protections du propriétaire et de soi-même, suspension/réactivation, membre d'une autre entreprise, lecteur en lecture seule |
| `test_catalog_inventory.py` | 15 | Création de produit et mouvement initial, validations, SKU en double, stock non modifiable directement, suppression bloquée après vente, droits du vendeur, filtres, réapprovisionnement et réception, alertes et demande issue des ventes, entrepôts et valeur du stock |
| `test_sales.py` | 18 | Calcul des totaux et arrondis, totaux imposés par le serveur, mouvement de stock, brouillon puis confirmation, rollback complet en cas de stock insuffisant, transaction avec paiement, idempotence, annulation et restitution du stock, annulation refusée après paiement, transitions, prix et remise réservés, validations |
| `test_payments.py` | 9 | Paiement partiel puis solde, dépassement du reste à payer, commande réglée, référence en double (casse), référence identique dans une autre entreprise, commande d'un autre client, brouillon, date future, montants nuls ou négatifs, paiements non modifiables |
| `test_reports.py` | 11 | Périodes, chiffre d'affaires distinct des encaissements, évolution, séries, statistiques des pages, analyses mensuelles, marges (remise déduite), rapports enregistrés, période personnalisée, tous les types de rapports, droits, santé et schéma OpenAPI |
| `test_concurrency.py` | 2 | Deux ventes simultanées sur le même stock (une seule réussit, stock jamais négatif) ; numéros de commande uniques sous concurrence — vraies transactions PostgreSQL concurrentes (threads) |

**Résultat observé : 106 tests réussis**, sur la machine de développement (Windows, Python 3.13.9) et dans le conteneur Docker du backend (Python 3.13, Debian).

Corrections apportées grâce aux tests pendant la livraison : codes 401 transformés en 403 sur les vues publiques (en-tête `WWW-Authenticate` manquant), `last_login` non mis à jour, réponse 403 au lieu de 405 pour une méthode non prise en charge, contrainte d'unicité de l'e-mail exigée par Django.

## 2. Frontend (Vitest + Testing Library)

```bash
cd frontend
npm run typecheck
npm test
```

| Fichier | Tests | Couverture |
|---|---|---|
| `lib.test.ts` | 11 | Formatage, recherche, validation, règles métier, export |
| `services.test.ts` | 12 | Services en mode démonstration (commandes, paiements, stocks, rapports) |
| `app.test.tsx` | 7 | Navigation, thème, formulaires, recherche et filtres (rendu complet de l'application) |
| `api.test.ts` | 8 | **Nouveau** : client HTTP (en-têtes, nouvel essai après 401, expiration de session, messages d'erreur, pagination) et adaptateurs API (conversion du tableau de bord, millions de FC, champs envoyés pour une commande) |

**Résultat observé : 38 tests réussis, `tsc --noEmit` sans erreur.**

Instabilité constatée puis corrigée : quand les fichiers s'exécutaient en parallèle sur la machine (chargée par Docker), un test de rendu dépassait parfois le délai d'attente (1 échec sur 2 à 3 exécutions complètes ; 4 exécutions isolées sur 4 réussies). Les fichiers s'exécutent désormais l'un après l'autre (`fileParallelism: false`) : 3 exécutions complètes consécutives réussies, en 18 s environ.

Les tests de composants s'exécutent en **mode démonstration**. Le mode API est couvert par `api.test.ts` (unités) et par le parcours d'intégration ci-dessous, mais **aucun test de composant ne rend les pages en mode API**.

## 3. Contrôles complémentaires

| Contrôle | Commande | Résultat observé |
|---|---|---|
| Vérifications Django | `manage.py check` | Aucun problème |
| Migrations à jour | `manage.py makemigrations --check --dry-run` | Aucune modification détectée |
| Configuration de production | `manage.py check --deploy` (variables de production) | 1 avertissement : `SECURE_HSTS_PRELOAD` (délibéré, voir SECURITY.md) |
| Schéma OpenAPI | `manage.py spectacular --validate` | Valide, sans avertissement |
| Compose développement / production | `docker compose config` | Valides |
| Image du backend | `docker compose build backend` | Construite ; 106 tests réussis dans le conteneur |
| Build du frontend en mode API | `VITE_DATA_SOURCE=api vite build` | Réussi ; aucun secret ni variable backend dans le bundle |
| Parcours d'intégration (développement) | script Node, origine `http://localhost:5173` → backend Docker | 22 vérifications réussies : CORS (origine autorisée, origine inconnue refusée, en-tête `X-Company-ID`), inscription, cookie HttpOnly à chemin restreint, entrepôt, produit, client, vente au total recalculé, renvoi idempotent, stock insuffisant (409 lisible), paiement partiel, reste à payer, tableau de bord, statistiques, notification, rapport financier, recherche, rafraîchissement par cookie, déconnexion et révocation |
| Pile de production locale | `docker-compose.prod.yml`, `APP_DOMAIN=localhost` | Images `backend` et `web` construites ; redirection HTTP→HTTPS (308) ; en-têtes HSTS, CSP, X-Frame-Options, nosniff, Referrer-Policy ; frontend et routes monopage servis ; santé OK ; Swagger et schéma refusés (401) ; administration et ses fichiers statiques servis ; inscription fermée ; cookie `Secure` ; connexion, création d'entrepôt, produit, client, transaction, tableau de bord et stock vérifiés (7 vérifications réussies) |
| Sauvegarde et restauration de contrôle | `scripts/backup.sh` puis `scripts/verify-backup.sh` | Réussies : empreinte vérifiée, restauration dans une base temporaire, comptages conformes aux données (1 entreprise, 1 utilisateur, 1 produit, 1 commande, 1 paiement, 40 migrations) |

Défaut trouvé par le test de la pile de production et corrigé : la sonde de santé interne était refusée par Django (`DisallowedHost`), ce qui bloquait le démarrage du service `web`.

## 4. Contrôles non exécutés

| Contrôle | Raison |
|---|---|
| Vérification visuelle du mode API dans un navigateur (connexion, toutes les pages, formulaires, mobile, thème sombre) | Aucun navigateur piloté disponible pendant la livraison. **À faire en premier** : `VITE_DATA_SOURCE=api` dans `frontend/.env`, `npm run dev` depuis `frontend/`, parcourir chaque écran. |
| `scripts/restore.sh` (restauration destructive dans la base principale) | Opération destructive ; seule la restauration de contrôle a été exécutée |
| Production avec un vrai domaine et un certificat Let's Encrypt | Pas de serveur ni de domaine public ; vérifié avec le certificat interne de Caddy pour `localhost` |
| Tests de charge et de capacité | Hors périmètre de la livraison ; nécessaires avant de dimensionner |
| Audit de sécurité externe, `pip-audit`, `npm audit` | Non lancés |
| Tests de composants des panneaux Équipe et Sécurité | Non écrits |
