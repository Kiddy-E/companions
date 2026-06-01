# Companions

Application self-hostable de suivi des animaux de compagnie. PWA installable, API REST pour Home Assistant.

## Déploiement

### Option A — Docker Compose classique (Caddy/Traefik/nginx)

#### 1. Préparer l'environnement

```bash
cp .env.example .env
```

Remplir `.env` :

```env
DB_PASSWORD=<mot_de_passe_fort>
SESSION_SECRET=<64 caractères aléatoires minimum>
NEXT_PUBLIC_APP_URL=https://companions.yourdomain.com
```

Générer `SESSION_SECRET` :
```bash
openssl rand -hex 32
```

#### 2. Démarrer

```bash
docker compose up -d
```

Au premier démarrage, les migrations Prisma s'appliquent automatiquement, puis l'app démarre.

Ouvrir `https://companions.yourdomain.com/` (la racine `/`, pas `/login`) → écran de création du compte admin.

#### 3. Reverse proxy (Caddy)

```caddyfile
companions.yourdomain.com {
  reverse_proxy localhost:3000
}
```

Caddy gère TLS automatiquement via Let's Encrypt.

---

### Option B — Portainer + Cloudflare Tunnel (NAS/homelab)

Pour un déploiement sur Proxmox, Synology ou tout homelab avec Portainer et tunnel Cloudflare (sans exposer de port directement sur Internet).

#### 1. Image Docker

L'image est publiée automatiquement sur GHCR à chaque push sur `master` :

```
ghcr.io/kiddy-e/companions:latest
```

#### 2. Stack Portainer

Dans Portainer → **Stacks** → **Add stack** → **Web editor**, coller :

```yaml
version: "3.8"
services:
  app:
    image: ghcr.io/kiddy-e/companions:latest
    container_name: companions
    restart: unless-stopped
    ports:
      - "8484:3000"
    volumes:
      - companions_uploads:/data/uploads
    environment:
      - TZ=Europe/Paris
      - DATABASE_URL=postgresql://companions:${COMPANIONS_DB_PASSWORD}@db:5432/companions?schema=public
      - SESSION_SECRET=${COMPANIONS_SESSION_SECRET}
      - UPLOAD_DIR=/data/uploads
      - NEXT_PUBLIC_APP_URL=${COMPANIONS_APP_URL}
      - NODE_ENV=production
      - SECURE_COOKIES=false
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 90s

  db:
    image: postgres:16-alpine
    container_name: companions_db
    restart: unless-stopped
    volumes:
      - companions_pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=companions
      - POSTGRES_USER=companions
      - POSTGRES_PASSWORD=${COMPANIONS_DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U companions -d companions"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

volumes:
  companions_pgdata:
  companions_uploads:
```

En bas de la page, ajouter les variables d'environnement :

| Variable | Valeur |
|----------|--------|
| `COMPANIONS_DB_PASSWORD` | mot de passe fort |
| `COMPANIONS_SESSION_SECRET` | 64 caractères aléatoires minimum |
| `COMPANIONS_APP_URL` | `https://companions.yourdomain.com` |

> `SECURE_COOKIES=false` est nécessaire si tu accèdes aussi via HTTP local (IP directe). Si tu passes exclusivement par Cloudflare HTTPS, tu peux le passer à `true`.

#### 3. Cloudflare Tunnel

Dans le dashboard Cloudflare → **Zero Trust** → **Networks** → **Tunnels** → ton tunnel → **Edit** → **Public Hostnames** → **Add a public hostname** :

| Champ | Valeur |
|-------|--------|
| Subdomain | `companions` |
| Domain | `yourdomain.com` |
| Type | `HTTP` |
| URL | `IP-DE-TA-VM:8484` |

> Utiliser l'IP de la VM (ex: `192.168.1.x`), pas `localhost` — le container cloudflared a son propre `localhost`.

#### 4. Premier lancement

Naviguer vers `https://companions.yourdomain.com/` (la racine) → l'app redirige automatiquement vers l'écran de création du compte admin.

---

## Variables d'environnement

| Variable | Requis | Description |
|----------|--------|-------------|
| `DATABASE_URL` | ✅ | Connection string PostgreSQL (injecté par compose) |
| `DB_PASSWORD` | ✅ | Mot de passe PostgreSQL |
| `SESSION_SECRET` | ✅ | Secret de signature des cookies (≥ 32 chars aléatoires) |
| `UPLOAD_DIR` | — | Dossier photos (défaut: `/data/uploads`) |
| `NEXT_PUBLIC_APP_URL` | — | URL publique (défaut: `http://localhost:3000`) |
| `PORT` | — | Port d'écoute (défaut: `3000`) |
| `SECURE_COOKIES` | — | `true` (défaut) en HTTPS, `false` si accès HTTP local |

---

## Intégration Home Assistant

### 1. Créer un token API

Dans l'app → **Paramètres** → **Nouveau token** → Scopes : `events:write`, `pets:read`.

### 2. Récupérer l'ID de votre animal

```bash
curl -H "Authorization: Bearer <token>" https://companions.yourdomain.com/api/pets
```

### 3. configuration.yaml

```yaml
rest_command:
  log_dog_walk:
    url: "https://companions.yourdomain.com/api/events"
    method: POST
    headers:
      Authorization: "Bearer <token>"
      Content-Type: "application/json"
    payload: >
      {"petId": "<id>", "type": "WALK", "durationMin": {{ duration }}}

  log_dog_meal:
    url: "https://companions.yourdomain.com/api/events"
    method: POST
    headers:
      Authorization: "Bearer <token>"
      Content-Type: "application/json"
    payload: >
      {"petId": "<id>", "type": "MEAL"}
```

### 4. Récap (sensor)

```yaml
sensor:
  - platform: rest
    name: Companions Summary
    resource: https://companions.yourdomain.com/api/summary
    headers:
      Authorization: "Bearer <token>"
    scan_interval: 300
    value_template: "{{ value_json.stats.totalPets }}"
    json_attributes:
      - pets
      - stats
      - overdueVaccines
```

---

## Backup

```bash
# Base de données
docker exec companions-db-1 pg_dump -U companions companions > backup_$(date +%Y%m%d).sql

# Photos
docker cp companions-app-1:/data/uploads ./uploads_backup_$(date +%Y%m%d)
```

---

## API REST

Base URL : `/api`

| Route | Méthode | Auth | Description |
|-------|---------|------|-------------|
| `/api/health` | GET | — | Healthcheck |
| `/api/setup` | GET/POST | — | First-run setup |
| `/api/auth/login` | POST | — | Login (cookie) |
| `/api/auth/logout` | POST | Session | Logout |
| `/api/auth/me` | GET | Session/Token | Utilisateur courant |
| `/api/pets` | GET/POST | `pets:read/write` | Animaux |
| `/api/pets/:id` | GET/PATCH/DELETE | `pets:read/write` | Animal |
| `/api/pets/:id/photo` | GET/POST | `pets:read/write` | Photo |
| `/api/events` | GET/POST | `events:read/write` | Événements (filtrables) |
| `/api/events/:id` | PATCH/DELETE | `events:write` | Événement |
| `/api/vaccines` | GET/POST | `vaccines:read/write` | Vaccins |
| `/api/vaccines/:id` | GET/PATCH/DELETE | `vaccines:read/write` | Vaccin |
| `/api/summary` | GET | `events:read` | Récap complet |
| `/api/tokens` | GET/POST | Session | Tokens API |
| `/api/tokens/:id` | DELETE | Session | Révoquer token |
| `/api/users` | GET/POST | Admin | Utilisateurs |
| `/api/users/:id` | PATCH/DELETE | Admin | Utilisateur |

Rate limits : login 10 req/15min, events 60 req/min, API globale 120 req/min.
