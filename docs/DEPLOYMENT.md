# Déploiement, sauvegardes et continuité

Ce document détaille la section « M. Déploiement en production » du [README](../README.md).

## 1. Architecture de départ

Un serveur Linux (VPS) avec Docker exécute trois conteneurs (`docker-compose.prod.yml`) :

| Service | Rôle | Exposition |
|---|---|---|
| `web` | Caddy : HTTPS automatique (Let's Encrypt), fichiers du frontend, relais `/api` et `/admin` vers Django, fichiers statiques de l'administration | Ports 80 et 443 |
| `backend` | Django + Gunicorn (3 workers par défaut) | Réseau interne uniquement |
| `db` | PostgreSQL 16, volume `pgdata` | Réseau interne uniquement |

Toutes les PME partagent ce déploiement : on n'ajoute ni code ni conteneur par client. Le frontend et l'API sont servis sur **le même domaine** : pas de CORS, cookie de session limité à ce domaine.

Point de départ raisonnable, à confirmer par des mesures : 2 vCPU, 4 Go de RAM, disque SSD avec de la marge pour la base et les sauvegardes locales temporaires.

## 2. Première installation

Prérequis : Docker Engine et le plugin Compose, un nom de domaine dont l'enregistrement DNS A/AAAA pointe vers le serveur, ports 80 et 443 ouverts.

```bash
git clone <dépôt> wanstech && cd wanstech
cp .env.production.example .env.production
chmod 600 .env.production
# Éditer .env.production : APP_DOMAIN, DJANGO_SECRET_KEY, DJANGO_ALLOWED_HOSTS, CSRF_TRUSTED_ORIGINS, POSTGRES_PASSWORD…
python3 -c "import secrets; print(secrets.token_urlsafe(50))"   # pour DJANGO_SECRET_KEY

docker compose -f docker-compose.prod.yml --env-file .env.production build
docker compose -f docker-compose.prod.yml --env-file .env.production up -d db
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm backend python manage.py migrate
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm backend python manage.py createsuperuser
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
curl https://<APP_DOMAIN>/api/v1/health/   # {"status": "ok", "database": "ok"}
```

Le superutilisateur sert aux opérateurs WANS TECH (administration Django, documentation API). Les comptes des clients se créent par l'inscription (si `REGISTRATION_OPEN=true`) ou par l'administration, puis chaque propriétaire ajoute ses collaborateurs depuis Paramètres → Équipe.

## 3. Variables de production

Voir `.env.production.example` et le tableau complet dans le README (section J). Points obligatoires :

- `DJANGO_DEBUG` est forcé à `false` par le Compose de production ;
- `DJANGO_SECRET_KEY` aléatoire et propre à l'environnement ; sa modification invalide toutes les sessions ;
- `DJANGO_ALLOWED_HOSTS` et `CSRF_TRUSTED_ORIGINS` = le domaine public ;
- `SECURE_SSL_REDIRECT=true`, `SECURE_HSTS_SECONDS=31536000`, `REFRESH_COOKIE_SECURE=true` ;
- `API_DOCS_PUBLIC=false`.

## 4. Mise à jour et retour arrière

```bash
scripts/backup.sh   # avec COMPOSE_FILE et ENV_FILE de production, voir §6
git fetch && git checkout <version>
docker compose -f docker-compose.prod.yml --env-file .env.production build
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm backend python manage.py migrate
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

Retour à la version précédente :

- **sans migration de schéma** entre les deux versions : `git checkout <version précédente>`, `build`, `up -d` ;
- **avec migration** : appliquer d'abord la migration inverse (`python manage.py migrate <app> <migration précédente>`) si elle est réversible et sans perte ; sinon restaurer la sauvegarde prise avant la mise à jour (§7). Toute migration qui supprime des données doit être signalée dans la note de version.

Les fichiers statiques de l'administration sont recopiés dans le volume partagé à chaque démarrage du backend (`COLLECT_STATIC=true`).

## 5. Journaux et surveillance

```bash
docker compose -f docker-compose.prod.yml logs -f backend   # requêtes (statut, durée) et erreurs Django
docker compose -f docker-compose.prod.yml logs -f web       # accès HTTPS, certificats
docker compose -f docker-compose.prod.yml logs -f db
```

À surveiller : sonde `GET /api/v1/health/` (un service externe de disponibilité peut l'interroger), taux d'erreurs 5xx, durée des requêtes, espace disque, taille de la base, réussite des sauvegardes. Configurer la rotation des journaux Docker (`/etc/docker/daemon.json` : `"log-opts": {"max-size": "20m", "max-file": "5"}`). Une centralisation (Loki, Sentry…) est recommandée dès les premiers clients payants.

## 6. Sauvegardes

| Élément | Choix |
|---|---|
| Outil | `pg_dump` au format personnalisé (`scripts/backup.sh`), cohérent même pendant l'activité |
| Contrôle immédiat | `pg_restore --list` sur l'archive + empreinte SHA-256 |
| Stockage | `./backups` (hors du conteneur et du volume de la base), droits `600` sous Linux, **puis copie hors serveur** (stockage objet ou second serveur), chiffrée (ex. `restic`, `age` ou `gpg`) |
| Fréquence recommandée | Quotidienne au minimum ; plus fréquente quand l'activité le justifie. Pour un objectif de perte de données de quelques minutes : archivage continu des WAL (pgBackRest, WAL-G), non mis en place à ce jour |
| Conservation suggérée | 7 quotidiennes, 4 hebdomadaires, 12 mensuelles. **Aucun script ne supprime automatiquement de sauvegarde** : la purge doit être une politique écrite, appliquée sur le stockage externe. |
| Accès | Réservé aux opérateurs ; les sauvegardes contiennent les données de toutes les entreprises et des données personnelles |

Exemple de planification (cron, utilisateur dédié) :

```cron
30 2 * * * cd /srv/wanstech && COMPOSE_FILE=docker-compose.prod.yml ENV_FILE=.env.production scripts/backup.sh >> /var/log/wanstech-backup.log 2>&1
```

## 7. Restauration

**Contrôle régulier (non destructif)** — à faire au moins chaque mois et après tout changement de version de PostgreSQL :

```bash
COMPOSE_FILE=docker-compose.prod.yml ENV_FILE=.env.production scripts/verify-backup.sh backups/wanstech-<horodatage>.dump
```

Le script vérifie l'empreinte, restaure dans une base temporaire `wanstech_restore_check`, affiche le nombre d'entreprises, d'utilisateurs, de produits, de commandes, de paiements et de migrations, puis supprime cette base. **Il a été exécuté avec succès** sur la base de développement lors de la livraison (voir [TESTING.md](TESTING.md)).

**Restauration réelle (destructive)** :

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production stop backend
COMPOSE_FILE=docker-compose.prod.yml ENV_FILE=.env.production scripts/restore.sh backups/wanstech-<horodatage>.dump
docker compose -f docker-compose.prod.yml --env-file .env.production start backend
```

Le script demande de taper `RESTAURER`, puis remplace le contenu de la base dans une transaction unique. Prendre une sauvegarde de l'état courant avant, même dégradé. `restore.sh` **n'a pas été exécuté** pendant la livraison (opération destructive) : seule la restauration de contrôle l'a été.

Restaurer **une seule entreprise** n'est pas possible avec ces scripts (base partagée) : il faudrait restaurer dans une base temporaire puis extraire ses lignes. C'est l'une des raisons possibles de passer, pour certains clients, à une base dédiée (voir [ARCHITECTURE.md](ARCHITECTURE.md) §7).

## 8. Sécurité opérationnelle

- Pare-feu : seuls 22 (SSH par clé), 80 et 443 ouverts ; PostgreSQL jamais exposé.
- Mises à jour du système et de Docker ; reconstruction régulière des images pour intégrer les correctifs de `python:3.13-slim`, `postgres:16-alpine` et `caddy`.
- `.env.production` en `600`, hors dépôt ; rotation de `POSTGRES_PASSWORD` et `DJANGO_SECRET_KEY` en cas de doute.
- Comptes `is_staff` limités aux opérateurs, mots de passe forts.
- Tester la restauration (§7) avant d'accueillir le premier client.
