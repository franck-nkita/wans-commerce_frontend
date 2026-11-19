# Rapport de réorganisation frontend / backend

Date : 17/10/2026. Plan initial : [REORGANIZATION_PLAN.md](REORGANIZATION_PLAN.md).

## 1. Résultat

Le dépôt (racine Git `frontend_project/`) contient désormais deux applications physiquement séparées, `frontend/` et `backend/`, orchestrées depuis la racine par Docker Compose. Le backend Django était déjà isolé dans `backend/` et n'a pas été modifié ; le travail a porté sur le frontend, Docker, les variables d'environnement et la documentation.

```
frontend_project/                  racine Git (inchangée)
├── frontend/
│   ├── src/  public/  index.html
│   ├── package.json  package-lock.json  tsconfig.json  vite.config.ts
│   ├── Dockerfile  Caddyfile  .dockerignore  .env.example
│   └── (node_modules/, dist/, .env : locaux, ignorés par Git)
├── backend/                       inchangé : manage.py, config/, apps/, tests/, docker/, Dockerfile…
├── docs/  scripts/  backups/
├── docker-compose.yml  docker-compose.prod.yml
├── .env.example  .env.production.example  (.env local, ignoré)
├── .gitignore  .gitattributes  README.md
```

## 2. Déplacements réalisés

| Origine | Destination | Méthode |
|---|---|---|
| `src/` (68 fichiers suivis + 8 non suivis), `public/`, `index.html`, `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts` | `frontend/` | `git mv` : renommages indexés, modifications non commitées conservées (marquées `RM`) |
| `node_modules/`, `dist/` | `frontend/` | `mv` (ignorés par Git) |
| `deploy/web/Dockerfile` | `frontend/Dockerfile` | déplacé puis adapté |
| `deploy/web/Caddyfile` | `frontend/Caddyfile` | déplacé, contenu inchangé |
| `.dockerignore` (racine) | `frontend/.dockerignore` | déplacé puis adapté |
| `deploy/` | — | dossier vide supprimé après déplacement |

Aucun fichier source n'a été modifié : aucun import ni alias à corriger (alias `@/*` et chemins de Vite relatifs à `frontend/`). `index.html` est intact, le hachage CSP de `Caddyfile` reste valide (recalculé et comparé).

## 3. Configurations modifiées

| Fichier | Changement |
|---|---|
| `frontend/Dockerfile` | Multi-étapes : `deps` (npm ci), `dev` (serveur Vite `--host 0.0.0.0`), `build` (Vite, mode API, même origine), finale `web` (Caddy). Contexte `./frontend`. |
| `frontend/.dockerignore` | Exclut `node_modules`, `dist`, `.env*`, Dockerfile. |
| `frontend/.env.example` (nouveau) | Variables `VITE_*` seules, avec l'explication « URL vue par le navigateur ». |
| `frontend/.env` (nouveau, ignoré) | Créé à partir des seules lignes `VITE_*` du `.env` racine. Le `.env` racine n'a pas été modifié (il contient encore ces lignes, sans effet). |
| `.env.example` (racine) | Section `VITE_*` retirée et renvoi vers `frontend/.env.example`. |
| `docker-compose.yml` | Ajout du service `frontend` (cible `dev`, port `127.0.0.1:5173`, `VITE_DATA_SOURCE=api`, `VITE_API_BASE_URL=http://localhost:8000`, `CHOKIDAR_USEPOLLING`, volume anonyme `node_modules`) ; sonde de santé du `backend` sur `/api/v1/health/` ; `frontend` attend un backend sain. Noms `db`, `backend`, volume `pgdata`, projet `wanstech` inchangés. |
| `docker-compose.prod.yml` | Service `web` : `context: ./frontend` (au lieu de `.` + `deploy/web/Dockerfile`). |
| `.gitignore` | Réorganisé et commenté ; motifs inchangés (valables à toute profondeur). |
| `README.md` | Structure, installation (3 options), deux fichiers d'environnement, Docker (3 services, adresses navigateur/conteneur, persistance), tests, déploiement séparé, maintenance. |
| `docs/*.md` | Chemins `src/…` → `frontend/src/…`, `deploy/web/Caddyfile` → `frontend/Caddyfile`, commandes `cd frontend`, note historique dans `AUDIT_FRONTEND.md`. Fins de ligne d'origine conservées. |

**Connexions entre services.** Navigateur → `http://localhost:8000` (port publié) ; backend → PostgreSQL par `db:5432` (forcé par Compose) ; en production, Caddy → `backend:8000`, navigateur → même origine. PostgreSQL n'est publié que sur `127.0.0.1` en développement et pas du tout en production.

## 4. Tests exécutés

Référence avant déplacement : `tsc --noEmit` sans erreur, 38/38 tests Vitest.

| Test | Commande | Résultat |
|---|---|---|
| Installation reproductible | `cd frontend && npm ci` | Réussi |
| TypeScript | `npm run typecheck` | Réussi, aucune erreur |
| Tests frontend | `npm test` | **38/38 réussis** |
| Build de production | `npm run build` | Réussi |
| Lint frontend | — | **Non exécuté** : aucun linter configuré |
| Vérifications Django | `manage.py check` | Aucun problème |
| Migrations | `manage.py makemigrations --check --dry-run` | Aucune modification ; 40 migrations appliquées, 0 en attente sur la base existante |
| Configuration de production | `manage.py check --deploy` (variables fictives) | 1 avertissement préexistant et délibéré : `SECURE_HSTS_PRELOAD` |
| Tests backend (hôte) | `.venv/Scripts/python -m pytest -q` | **106/106 réussis** |
| Tests backend (conteneur) | `docker compose exec backend python -m pytest -q` | **106/106 réussis** |
| Compose dev | `docker compose config --quiet` | Valide |
| Compose prod | `config --quiet` avec une copie temporaire de `.env.production.example` (supprimée ensuite) | Valide |
| Build des images de dev | `docker compose build` | `wanstech-backend` et `wanstech-frontend` construites |
| Démarrage | `docker compose up -d` | 3 services démarrés ; `db` et `backend` **healthy** |
| Santé / PostgreSQL | `GET /api/v1/health/` | `{"status":"ok","database":"ok"}` |
| Frontend (dev Docker) | `GET :5173/`, `/connexion` | 200 ; Vite reçoit `VITE_DATA_SOURCE=api` et l'URL `http://localhost:8000` |
| Swagger, administration | `/api/v1/docs/`, `/admin/login/` | 200 |
| CORS | pré-requête depuis `localhost:5173` / origine inconnue | Autorisée avec `X-Company-ID` / refusée |
| Parcours de bout en bout (script Node, origine `localhost:5173`) | inscription, cookie, profil, entrepôt, tableau de bord, isolation, rafraîchissement, déconnexion | **14/14 réussis** (1 échec au premier passage dû à mon script, qui ignorait la mise en minuscules de l'e-mail ; corrigé et relancé) |
| Rechargement à chaud dans Docker | `touch` d'un fichier source | Mise à jour HMR détectée |
| Image de production `web` | `docker build ./frontend` puis Caddy sur `127.0.0.1:8088` | SPA et routes servies (200), CSP et `X-Frame-Options` présents, bundle en mode API même origine, aucun secret backend ; image de test supprimée |
| Journaux | `docker compose logs` | Aucune erreur ; seuls des `FATAL: the database system is starting up` au démarrage de Docker Desktop, avant que la sonde ne passe au vert |
| `npm audit` | `npm audit` | 3 vulnérabilités **préexistantes** (2 critiques, 1 modérée) dans `vitest`/`tinypool` (outils de test, hors bundle) |

**Non exécutés / bloqués**

| Test | Raison |
|---|---|
| Vérification visuelle dans un navigateur (pages, console, mobile) | Aucun outil de navigateur piloté disponible : non vérifié visuellement |
| Pile de production complète (`docker-compose.prod.yml up`) | Non lancée pour ne pas toucher aux volumes `wanstech-prod_*` existants ni aux ports 80/443 ; image `web` et configuration validées séparément |
| Déploiement séparé frontend/backend | Documenté, non testé |

## 5. Données et environnement

- Volume `wanstech_pgdata` conservé ; le conteneur `wanstech-db-1` n'a pas été recréé (configuration inchangée). Volumes `wanstech-prod_*` non touchés.
- Le conteneur `backend` a été recréé (ajout de la sonde) et un conteneur `frontend` créé. La pile de dev reste lancée.
- Le parcours de bout en bout a créé dans la base de **développement** 4 entreprises de test nommées `TEST RÉORGANISATION A|B <horodatage>` (comptes `test-reorg-…@exemple.test`) et 2 entrepôts. Elles peuvent être désactivées ou supprimées depuis l'administration Django.

## 6. Architecture SaaS (constat, inchangée)

Isolation multi-entreprise par ligne (`TenantModel`, `X-Company-ID` revérifié à chaque requête, `CompanyScopedViewSet`), rôles par adhésion, JWT + cookie HttpOnly, CORS en liste blanche, hôtes autorisés et secret obligatoires hors DEBUG : tout est côté serveur et couvert par 28 tests d'isolation, tous réussis, plus le parcours ci-dessus (403 entre entreprises). Limites connues, non traitées ici : pas de Row-Level Security PostgreSQL, pas de double authentification, limitation de débit en mémoire par worker.

## 7. Actions restantes

1. Vérifier l'interface dans un navigateur en mode API (`http://localhost:5173`).
2. Commit : les renommages sont **indexés** par `git mv`, rien n'est commité. Le backend, les fichiers Docker et `docs/` ne sont toujours pas suivis par Git ; à ajouter lors du commit.
3. Le remote `origin` s'appelle `wans-commerce-frontend` alors que le dépôt contient désormais tout le produit : renommage du dépôt GitHub à envisager.
4. Renommage facultatif du dossier local `frontend_project/` (hors Git ; sans effet sur les volumes Docker).
5. Planifier la montée de version de Vitest (vulnérabilités `npm audit`).
6. Ajouter un linter frontend et une CI (`npm ci && npm run typecheck && npm test && npm run build` ; `pytest` avec un service PostgreSQL ; `makemigrations --check`).
