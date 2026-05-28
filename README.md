# Companions

Application self-hostable de suivi des animaux de compagnie. PWA installable, API REST pour Home Assistant.

## Déploiement rapide

### Prérequis
- Docker + Docker Compose
- Un reverse proxy avec TLS (Caddy recommandé)

### 1. Préparer l'environnement

```bash
cp .env.example .env
```

Remplir `.env` :

```env
DB_PASSWORD=<mot_de_passe_fort>
SESSION_SECRET=<openssl rand -hex 32>
NEXT_PUBLIC_APP_URL=https://companions.yourdomain.com
```

### 2. Démarrer

```bash
docker compose up -d
```

Au premier démarrage, le conteneur applique automatiquement les migrations Prisma, puis démarre l'app.

Ouvrir `https://companions.yourdomain.com` → écran de création du compte admin.

### 3. Reverse proxy (Caddy)

```caddyfile
companions.yourdomain.com {
  reverse_proxy localhost:3000
}
```

Caddy gère TLS automatiquement via Let's Encrypt.

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
