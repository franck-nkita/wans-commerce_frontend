# Image du frontend WANS COMMERCE (React + Vite). Contexte de build : ./frontend.
#   - cible « dev »   : serveur de développement Vite (docker-compose.yml) ;
#   - cible finale    : build de production servi par Caddy, qui termine HTTPS (certificats Let's Encrypt
#                       automatiques) et relaie /api et /admin vers Django (docker-compose.prod.yml).
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Développement : les sources sont montées par Docker Compose (rechargement à chaud). ---
FROM deps AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]

# --- Build de production ---
FROM deps AS build
COPY index.html tsconfig.json vite.config.ts ./
COPY public ./public
COPY src ./src
# VITE_API_BASE_URL vide : le navigateur appelle /api/v1 sur la même origine (pas de CORS en production).
ENV VITE_DATA_SOURCE=api VITE_API_BASE_URL= VITE_API_PREFIX=/api/v1
RUN npm run build

# --- Production : Caddy (cible par défaut) ---
FROM caddy:2.10-alpine AS web
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv/app
