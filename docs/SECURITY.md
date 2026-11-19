# Sécurité de WANS TECH

Ce document détaille la section « K. Authentification et sécurité » du [README](../README.md). Il décrit ce qui est réellement implémenté et testé, puis les limites connues.

## 1. Authentification

| Élément | Implémentation |
|---|---|
| Mots de passe | Hachage Django (PBKDF2 par défaut), validateurs : 10 caractères minimum, pas trop courant, pas uniquement numérique, différent du nom/e-mail. |
| Jeton d'accès | JWT HS256 (Simple JWT), 10 min (`JWT_ACCESS_MINUTES`), envoyé en `Authorization: Bearer`. Gardé **en mémoire** par le frontend, jamais dans `localStorage`. |
| Jeton de rafraîchissement | 7 jours (`JWT_REFRESH_DAYS`), **rotation** à chaque usage, ancien jeton mis en **liste noire**. Cookie `wans_refresh` `HttpOnly`, `SameSite=Lax`, `Secure` en production, chemin `/api/v1/auth/`. |
| Rafraîchissement / déconnexion | Exigent `X-Requested-With: XMLHttpRequest` : un autre site ne peut pas l'ajouter sans requête de contrôle CORS, refusée hors liste blanche. Défense en profondeur avec `SameSite=Lax`. |
| Déconnexion | Met le jeton de rafraîchissement en liste noire et efface le cookie. |
| Changement de mot de passe | Révoque **tous** les jetons de rafraîchissement de l'utilisateur, puis ouvre une nouvelle session. |
| Compte désactivé | Refusé à la connexion, au rafraîchissement et sur tout jeton d'accès encore valide. |
| Échec de connexion | Message identique pour un e-mail inconnu ou un mauvais mot de passe ; journalisé sans aucune donnée d'identification. |
| Limitation de débit | `login` 10/min, `register` 5/h, `refresh` 30/min, anonymes 60/min, utilisateurs 600/min (variables `THROTTLE_*`). |
| Inscription | Crée uniquement un compte **propriétaire de sa nouvelle entreprise**. Impossible de rejoindre une entreprise existante ou de choisir un rôle. Désactivable : `REGISTRATION_OPEN=false` (recommandé en production si les comptes sont créés par WANS TECH). |
| Administration Django | Réservée aux comptes `is_staff` (opérateurs WANS TECH), jamais aux clients. |

**Risque résiduel assumé** : un jeton d'accès volé reste utilisable jusqu'à son expiration (10 min au plus). La suspension d'une adhésion, elle, est immédiate (vérifiée à chaque requête).

**Pourquoi pas tout en cookies ?** Un jeton d'accès en cookie imposerait une protection CSRF sur toute l'API. Le choix retenu (accès en mémoire + rafraîchissement HttpOnly restreint à `/auth/`) limite l'exposition au XSS (le jeton durable n'est jamais lisible par JavaScript) et au CSRF (les endpoints métier exigent un en-tête `Authorization` qu'un site tiers ne peut pas poser). Une faille XSS permettrait néanmoins d'agir au nom de l'utilisateur pendant sa session : la CSP de production réduit ce risque.

## 2. Autorisations et isolation

- Rôles par entreprise et capacités : `backend/apps/companies/roles.py` (matrice dans [API_CONTRACT.md](API_CONTRACT.md) §2).
- Par défaut, toute écriture non déclarée dans `capabilities` est **refusée** (`CompanyScopedMixin`).
- Un membre ne peut attribuer qu'un rôle **inférieur** au sien ; le propriétaire et sa propre adhésion sont protégés.
- Un vendeur ne peut ni modifier un prix ni accorder une remise (`price_override_forbidden`).
- Isolation entre entreprises : voir [ARCHITECTURE.md](ARCHITECTURE.md) §5 et les tests `test_isolation.py`.

## 3. Protection des échanges

| Élément | Configuration |
|---|---|
| CORS | Liste blanche `CORS_ALLOWED_ORIGINS`, identifiants autorisés, en-têtes limités (`authorization`, `content-type`, `x-company-id`, `x-requested-with`). En production, frontend et API sont sur la **même origine** : aucune origine n'est nécessaire. |
| CSRF | L'API utilise des jetons Bearer (non envoyés automatiquement par le navigateur). L'administration Django garde sa protection CSRF native (`CSRF_TRUSTED_ORIGINS`). |
| HTTPS | Terminé par Caddy (certificats automatiques), redirection HTTP → HTTPS, HSTS 1 an. Django : `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`, cookies `Secure`, `SECURE_PROXY_SSL_HEADER`. |
| En-têtes | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, **CSP** stricte pour le frontend (`frontend/Caddyfile`). |
| Documentation API | Publique uniquement si `API_DOCS_PUBLIC=true` (développement) ; sinon réservée aux opérateurs. |

**CSP et script en ligne.** `index.html` contient un petit script qui applique le thème avant le premier rendu. La CSP l'autorise par son hachage SHA-256. Si ce script est modifié, recalculez le hachage :

```bash
python -c "import re,hashlib,base64;s=re.findall(r'<script>(.*?)</script>',open('frontend/dist/index.html',encoding='utf-8').read(),re.S)[0];print('sha256-'+base64.b64encode(hashlib.sha256(s.encode()).digest()).decode())"
```

puis remplacez la valeur dans `frontend/Caddyfile`.

`SECURE_HSTS_PRELOAD` n'est pas activé : l'inscription dans la liste de préchargement des navigateurs est quasi irréversible et doit être une décision explicite (seul avertissement restant de `manage.py check --deploy`).

## 4. Données et journaux

- Validation stricte des entrées (serializers DRF, contraintes PostgreSQL), ORM uniquement (aucune requête SQL concaténée).
- Erreurs 500 : message générique côté client, détail uniquement dans les journaux serveur. Les conflits d'intégrité concurrents sont renvoyés en 409.
- Journaux applicatifs sur la sortie standard, **sans** corps de requête ni en-têtes `Authorization`/`Cookie`. Format d'accès Gunicorn : hôte, ligne de requête, statut, taille, durée.
- **Journal d'audit** (`apps/audit`) : inscription, connexions et échecs, déconnexion, changement de mot de passe, modifications du profil et des membres, création/modification/suppression de produits, entrepôts, clients, commandes (dont annulation et prix modifié), paiements, réapprovisionnements, génération et **export** de rapports. Il contient l'action, la cible (code public), quelques métadonnées métier et l'adresse IP ; jamais de secret ni de donnée personnelle superflue. Consultation seule dans l'administration.
- Données personnelles des clients (nom, téléphone, e-mail, adresse) : stockées dans l'entreprise qui les a saisies, jamais partagées entre entreprises. Les obligations applicables (loi congolaise, RGPD pour des clients européens…) restent à qualifier juridiquement : droit d'accès et d'effacement non outillés à ce jour.
- Les sauvegardes contiennent toutes les données : à chiffrer et à stocker hors du serveur (voir [DEPLOYMENT.md](DEPLOYMENT.md)).

## 5. Dépendances

- Versions entièrement verrouillées (`backend/requirements.txt`, `package-lock.json`).
- Django 5.2 **LTS** : correctifs de sécurité jusqu'en avril 2028.
- Procédure : README, section « N. Maintenance ». Recommandé : `pip-audit` et `npm audit` mensuels, et à chaque alerte de sécurité Django.

## 6. Limites connues

- Pas de RLS PostgreSQL (évaluée, voir [ARCHITECTURE.md](ARCHITECTURE.md) §5).
- Pas d'authentification à deux facteurs, pas de réinitialisation de mot de passe par e-mail, pas d'invitation par e-mail (le mot de passe initial d'un collaborateur est transmis hors application).
- Un administrateur peut rattacher un compte existant par son e-mail, ce qui révèle l'existence de ce compte.
- L'adresse IP journalisée est `REMOTE_ADDR` : derrière Caddy, c'est l'adresse du proxy. Pour journaliser l'IP réelle, configurer un middleware de confiance sur `X-Forwarded-For` limité au proxy.
- La limitation de débit utilise le cache mémoire local : chaque worker Gunicorn a ses propres compteurs (limite effective multipliée par le nombre de workers). Un cache partagé (Redis) sera nécessaire avec plusieurs réplicas.
- Aucun test d'intrusion externe n'a été réalisé.
