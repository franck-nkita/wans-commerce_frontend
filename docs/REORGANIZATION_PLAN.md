# Plan de réorganisation frontend / backend

Date de l'audit : 17/10/2026.

## 1. État initial constaté

### Dépôt Git

- Racine du dépôt : `frontend_project/` (le dossier parent `app getion stock/` n'est **pas** un dépôt Git et ne contient que `frontend_project/`).
- Branche `main`, un seul commit (`initialisation`), remote `origin` → `github.com/humvee1025/wans-commerce-frontend`.
- Travail non commité important, à préserver :
  - 40 fichiers suivis modifiés (frontend, README, `.env.example`, `.gitignore`, `vite.config.ts`) ;
  - fichiers non suivis : **tout le backend** (`backend/`), `deploy/`, `docs/`, `scripts/`, les fichiers Compose, `.dockerignore`, `.gitattributes`, `.env.production.example` et plusieurs fichiers frontend (`LoginPage.tsx`, `session.ts`, `apiAdapters.ts`, etc.).
- Aucun workflow CI/CD (`.github/` absent), aucun espace de travail npm/pnpm/yarn.
- Une copie de sauvegarde existe à côté du projet : `app getion stock save01/`.

### Technologies réellement utilisées

| Partie | Technologie | Versions |
|---|---|---|
| Frontend | React + Vite + TypeScript + Tailwind CSS 4, React Router 7, Recharts 3, Vitest | React 19, Vite 7, TS 5.7+, Node 24.13 / npm 11.6 (poste) |
| Backend | Django + Django REST Framework, SimpleJWT, drf-spectacular, django-cors-headers, Gunicorn | Django 5.2.18 (LTS), DRF 3.18.3, Python 3.13 (`backend/.venv`) |
| Base | PostgreSQL | `postgres:16-alpine` |
| Production | Caddy (HTTPS + reverse proxy + fichiers du SPA) | `caddy:2.10-alpine` |

### Organisation initiale

```
frontend_project/            (racine Git)
├── src/ public/ index.html  frontend mélangé à la racine
├── package.json package-lock.json tsconfig.json vite.config.ts
├── node_modules/ dist/      (ignorés par Git)
├── .dockerignore            contexte de build de l'image web = racine du dépôt
├── deploy/web/              Dockerfile (build Vite + Caddy) et Caddyfile de production
├── backend/                 Django déjà isolé (manage.py, config/, apps/, tests/, Dockerfile, docker/)
├── docker-compose.yml       dev : db + backend (frontend lancé à part avec npm run dev)
├── docker-compose.prod.yml  prod : db + backend + web (contexte de build « . »)
├── scripts/                 sauvegarde / restauration PostgreSQL
├── backups/                 sauvegardes .dump (ignorées par Git)
├── docs/                    documentation
├── .env / .env.example      un seul fichier pour VITE_*, Django et PostgreSQL
└── .env.production.example
```

Constat : le backend est déjà physiquement séparé ; **seul le frontend est mélangé à la racine**.

### Données persistantes

- Volume Docker `wanstech_pgdata` (projet Compose nommé explicitement `wanstech` via `name:`) : le nom ne dépend pas de l'emplacement du fichier Compose.
- Volumes de production `wanstech-prod_*` (sur le serveur).
- `backups/wanstech-20261016T193827Z.dump` (+ `.sha256`).

### Architecture SaaS existante (constat)

Multi-tenant par ligne : `companies` (Company, Membership, rôles dans `roles.py`, résolution du tenant dans `tenancy.py` via l'en-tête `X-Company-ID`), authentification JWT (jeton d'accès en mémoire, refresh en cookie HttpOnly), journal d'audit, tests d'isolation (`tests/test_isolation.py`).

## 2. Architecture cible

```
frontend_project/            (racine Git inchangée)
├── frontend/
│   ├── src/ public/ index.html
│   ├── package.json package-lock.json tsconfig.json vite.config.ts
│   ├── Dockerfile           cibles « dev » (serveur Vite) et finale (build + Caddy, production)
│   ├── Caddyfile            reverse proxy de production (ex-deploy/web/Caddyfile)
│   ├── .dockerignore
│   └── .env.example         variables VITE_* uniquement
├── backend/                 inchangé (Dockerfile, .dockerignore, config/, apps/, tests/…)
├── docker-compose.yml       dev : db + backend + frontend
├── docker-compose.prod.yml  prod : db + backend + web (contexte ./frontend)
├── scripts/ backups/ docs/
├── .env.example             Compose + Django + PostgreSQL
├── .env.production.example
├── .gitignore .gitattributes README.md
```

Le dossier `frontend_project/` n'est pas renommé (il est en dehors de Git et ouvert dans l'éditeur) ; un renommage en `wans-tech/` est possible ultérieurement sans impact sur Git ni sur les volumes Docker.

## 3. Déplacements prévus

| Origine | Destination | Méthode |
|---|---|---|
| `src/`, `public/`, `index.html`, `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts` | `frontend/` | `git mv` (fichiers suivis : historique et modifications non commitées conservés) ; `mv` pour les fichiers non suivis de `src/` |
| `node_modules/`, `dist/` | `frontend/` | `mv` (ignorés par Git) |
| `deploy/web/Dockerfile` | `frontend/Dockerfile` | `mv` (non suivi) puis adaptation |
| `deploy/web/Caddyfile` | `frontend/Caddyfile` | `mv` |
| `.dockerignore` (racine) | `frontend/.dockerignore` | `mv` puis adaptation |

Restent à la racine : `.git*`, `README.md`, `docs/`, `scripts/`, `backups/`, fichiers Compose, `.env*`.

## 4. Configurations à modifier

- `docker-compose.yml` : ajout d'un service `frontend` (serveur Vite, cible `dev`), noms `db`/`backend` et volume `pgdata` inchangés.
- `docker-compose.prod.yml` : service `web` construit depuis `./frontend`.
- `frontend/Dockerfile` : chemins de copie relatifs au nouveau contexte.
- Variables d'environnement : `frontend/.env(.example)` pour `VITE_*` (Vite lit `.env` dans son propre dossier) ; `.env` racine pour Compose et Django. Le `.env` local existant n'est pas modifié ; un `frontend/.env` est créé à partir de ses seules variables `VITE_*` (publiques par nature).
- `.gitignore` : chemins `frontend/node_modules`, `frontend/dist`, etc.
- README et documents `docs/*.md` : commandes (`cd frontend`), chemins (`deploy/web` → `frontend/`).
- Le backend n'a pas besoin de modification (aucun chemin vers le frontend).

## 5. Risques identifiés

| Risque | Mesure |
|---|---|
| Perte du travail non commité | `git mv` déplace aussi les modifications ; aucune commande destructive ; sauvegarde `save01` existante |
| Volume PostgreSQL « orphelin » si le projet Compose change de nom | Compose reste à la racine avec `name: wanstech` : volume `wanstech_pgdata` réutilisé |
| Vite ne trouve plus `.env` | création de `frontend/.env` (VITE_* seulement) |
| Hachage CSP du script de thème | `index.html` déplacé sans modification : hachage inchangé |
| Bind mount `node_modules` Windows/Linux dans le conteneur frontend | volume anonyme dédié à `/app/node_modules` |
| Docker Desktop non démarré | démarrage tenté ; sinon tests Docker marqués « bloqués » |

## 6. Tests prévus

- Frontend : `npm ci`, `npm run typecheck`, `npm test`, `npm run build` (référence avant déplacement : typecheck OK, 38/38 tests).
- Backend : `manage.py check`, `check --deploy` (avec variables de production fictives), `makemigrations --check --dry-run`, `pytest` (PostgreSQL requis).
- Docker : `docker compose config --quiet` (dev et prod), build des images, démarrage, healthchecks, `/api/v1/health/`, inscription/connexion via l'API, accès au frontend, CORS depuis l'origine du frontend.
