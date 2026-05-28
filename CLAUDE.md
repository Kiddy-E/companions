# Companions — App de suivi des animaux de compagnie

Application self-hostable, dockerisée et installable en PWA pour suivre la vie quotidienne des animaux de compagnie : sorties, repas, besoins effectués lors des sorties, vaccins et soins. Pensée pour une famille/un foyer, avec un compte admin créé à l'initialisation puis des utilisateurs supplémentaires, et une API REST propre pour les intégrations externes (Home Assistant, scripts, automatisations).

---

## 1. Stack technique

| Couche | Choix | Rôle |
|--------|-------|------|
| Framework | **Next.js 15 (App Router)** | Frontend React + API routes dans un seul projet/conteneur |
| Langage | **TypeScript** strict | Partout (front, API, scripts) |
| ORM | **Prisma** | Schéma typé, migrations versionnées |
| Base de données | **PostgreSQL 16** | Conteneur dédié, concurrence multi-utilisateurs |
| Auth UI | **Session cookie** (httpOnly, SameSite=Lax/Strict) | Navigation web |
| Auth API externe | **Bearer tokens révocables** + scopes | Home Assistant, scripts |
| PWA | **next-pwa / Workbox** | Service worker, manifest, offline shell |
| UI | **Tailwind CSS + shadcn/ui** | Composants accessibles, thème clair/sombre |
| Validation | **Zod** | Validation entrée API + parsing env |
| Stockage fichiers | **Volume disque local** (`/data/uploads`) | Photos animaux |
| Tests | **Vitest** (unit) + **Playwright** (e2e) | |

> Le tout démarre via `docker compose up` : deux services (`app`, `db`) + deux volumes (`pgdata`, `uploads`).

---

## 2. Architecture

```
companions/
├─ docker-compose.yml
├─ Dockerfile                 # build multi-stage Next standalone
├─ .env.example               # toutes les vars, valeurs factices
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login, setup/      # écran d'init admin + login
│  │  ├─ (app)/                    # UI authentifiée (dashboard, animaux, journal)
│  │  └─ api/
│  │     ├─ auth/                  # login, logout, session
│  │     ├─ setup/                 # création admin au 1er démarrage
│  │     ├─ users/                 # CRUD users (admin)
│  │     ├─ tokens/                # gestion API tokens
│  │     ├─ pets/                  # CRUD animaux + upload photo
│  │     ├─ events/                # sorties, repas, besoins (le cœur du journal)
│  │     ├─ vaccines/              # vaccins & rappels
│  │     └─ health/                # healthcheck conteneur
│  ├─ lib/
│  │  ├─ auth/                     # session, hashing, token verify, RBAC
│  │  ├─ db.ts                     # client Prisma singleton
│  │  ├─ validation/               # schémas Zod partagés
│  │  └─ storage/                  # abstraction upload (local d'abord)
│  ├─ components/                  # UI réutilisable (shadcn)
│  └─ middleware.ts                # garde session/token + rate-limit léger
└─ public/manifest.json, icons/
```

### Séparation claire
- **Logique métier** dans `src/lib/services/*` — testable, indépendante de la couche HTTP.
- **API routes** = parsing + validation Zod + appel service + sérialisation. Minces.
- **Aucun accès DB direct** depuis les composants React serveur métier ; passer par les services.

---

## 3. Modèle de données (Prisma — esquisse)

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String
  passwordHash  String
  role          Role     @default(MEMBER)   // ADMIN | MEMBER
  createdAt     DateTime @default(now())
  sessions      Session[]
  apiTokens     ApiToken[]
  events        Event[]
}

model Session {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash  String   @unique          // on stocke le hash, jamais le token clair
  expiresAt  DateTime
  createdAt  DateTime @default(now())
}

model ApiToken {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String                    // "Home Assistant", "script backup"...
  tokenHash   String    @unique         // hash du token, préfixe affiché seul
  prefix      String                    // ex: "cmp_ab12" pour identifier visuellement
  scopes      String[]                  // ["events:read","events:write","pets:read"]
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  revokedAt   DateTime?
  createdAt   DateTime  @default(now())
}

model Pet {
  id         String   @id @default(cuid())
  name       String
  species    String                     // chien, chat...
  breed      String?
  birthDate  DateTime?
  photoPath  String?                    // chemin relatif dans /data/uploads
  notes      String?
  createdAt  DateTime @default(now())
  events     Event[]
  vaccines   Vaccine[]
}

model Event {
  id         String     @id @default(cuid())
  petId      String
  pet        Pet        @relation(fields: [petId], references: [id], onDelete: Cascade)
  userId     String                     // qui a enregistré
  user       User       @relation(fields: [userId], references: [id])
  type       EventType                  // WALK | MEAL | PEE | POOP | MED | OTHER
  occurredAt DateTime   @default(now())
  durationMin Int?                      // pour les sorties
  note       String?
  metadata   Json?                      // extensible sans migration
  createdAt  DateTime   @default(now())
  @@index([petId, occurredAt])
}

model Vaccine {
  id          String    @id @default(cuid())
  petId       String
  pet         Pet       @relation(fields: [petId], references: [id], onDelete: Cascade)
  name        String
  administeredAt DateTime
  dueAt       DateTime?                  // rappel prochaine dose
  vet         String?
  note        String?
}

enum Role { ADMIN MEMBER }
enum EventType { WALK MEAL PEE POOP MED OTHER }
```

> `metadata Json?` sur `Event` permet d'ajouter des champs (météo, quantité de croquettes…) sans migration. Ne pas en abuser pour des champs qu'on veut requêter/indexer.

---

## 4. API REST — conventions

Base : `/api`. JSON in/out. Verbes HTTP standards (GET/POST/PATCH/DELETE).

| Endpoint | Méthode | Scope requis | Description |
|----------|---------|--------------|-------------|
| `/api/setup` | POST | — (seulement si aucun admin) | Crée le 1er admin |
| `/api/auth/login` | POST | — | Ouvre session (cookie) |
| `/api/auth/logout` | POST | session | Détruit session |
| `/api/pets` | GET/POST | `pets:read` / `pets:write` | Liste / crée |
| `/api/pets/:id` | GET/PATCH/DELETE | idem | Détail / màj / suppr |
| `/api/pets/:id/photo` | POST | `pets:write` | Upload photo (multipart) |
| `/api/events` | GET/POST | `events:read` / `events:write` | Journal (filtres: `petId`, `type`, `from`, `to`) |
| `/api/events/:id` | PATCH/DELETE | `events:write` | |
| `/api/vaccines` | GET/POST | `vaccines:read` / `:write` | |
| `/api/summary` | GET | `events:read` | Récap (dernière sortie, repas du jour, rappels vaccins) |
| `/api/tokens` | GET/POST/DELETE | session admin/owner | Gérer ses API tokens |

### Règles API
- **Versionner si breaking** : préfixe `/api/v1` dès le départ recommandé pour les intégrations.
- Réponses d'erreur uniformes : `{ "error": { "code": "...", "message": "..." } }`, codes HTTP corrects (400/401/403/404/409/422/429).
- **Pagination** sur les listes (`?limit=&cursor=`), jamais de dump illimité.
- Filtres de dates en **ISO 8601 UTC** ; stocker en UTC, afficher en local côté UI.
- Documenter l'API : générer un **OpenAPI/Swagger** (ex. via `zod-to-openapi`) servi sur `/api/docs`. Crucial pour Home Assistant et l'écosystème.
- **Idempotence** : POST d'événement peut accepter un header `Idempotency-Key` pour éviter les doublons depuis des automatisations qui retentent.

### Exemple Home Assistant
```bash
# Enregistrer une sortie depuis une automatisation
curl -X POST https://companions.local/api/v1/events \
  -H "Authorization: Bearer cmp_ab12..." \
  -H "Content-Type: application/json" \
  -d '{"petId":"...","type":"WALK","durationMin":20}'
```

---

## 5. Sécurité — points d'attention (CRITIQUE)

### Initialisation / setup
- **First-run setup** : tant qu'aucun admin n'existe, `/setup` est accessible ; dès qu'un admin existe, l'endpoint `POST /api/setup` renvoie **409** et la route redirige vers login. Empêche la création d'admin sauvage.
- Ne jamais committer de compte/mot de passe par défaut. Pas de `admin/admin`.

### Mots de passe & sessions
- Hash mots de passe avec **argon2id** (ou bcrypt coût ≥ 12). Jamais de hash maison, jamais de SHA brut.
- Cookie session : `httpOnly`, `Secure` (en prod), `SameSite=Lax` (Strict si pas de flux cross-site).
- Stocker en DB le **hash** du token de session, pas le token clair. Expiration + rotation.
- Politique mot de passe minimale (longueur ≥ 12, vérif contre liste commune optionnelle).

### API tokens
- Générer un token aléatoire fort (≥ 256 bits, `crypto.randomBytes`). **Afficher en clair une seule fois** à la création.
- Stocker uniquement le **hash** (SHA-256 suffit pour un secret à haute entropie) + un `prefix` lisible pour l'identifier dans la liste.
- **Scopes** granulaires (lecture/écriture par ressource). Home Assistant n'a souvent besoin que de `events:write` + `*:read`.
- Tokens **révocables** et avec expiration optionnelle. Mettre à jour `lastUsedAt`.

### Autorisation (RBAC)
- Deux rôles : `ADMIN` (gère users, tokens de tous, settings) et `MEMBER` (journal, ses propres tokens).
- Vérifier l'autorisation **côté serveur sur chaque route**, jamais se fier au front.
- Centraliser dans `lib/auth/guard.ts` : `requireSession()`, `requireRole()`, `requireScope()`.

### Entrées & uploads
- **Valider tout** avec Zod (body, query, params). Rejeter l'inconnu (`.strict()`).
- Upload photos : whitelist MIME (`image/jpeg|png|webp`), limite taille (ex. 8 Mo), **re-encoder/redimensionner** avec `sharp` (détruit payloads cachés, normalise). Générer un nom de fichier aléatoire, jamais le nom client. Servir depuis un chemin contrôlé, pas d'exécution.
- Protéger contre **path traversal** sur tout accès fichier.

### Surface réseau
- **Rate limiting** sur `/api/auth/login` et endpoints API (par IP + par token). Mitige brute-force.
- **CORS** : par défaut fermé. Autoriser explicitement les origines de confiance si une app externe en a besoin.
- **CSRF** : sessions cookie → protéger les mutations (token CSRF ou double-submit) OU s'appuyer sur `SameSite=Strict` + vérif `Origin`. Les routes Bearer-token sont exemptées (pas de cookie).
- Headers de sécurité : `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, HSTS (en prod derrière TLS).

### Secrets & config
- Tout par **variables d'environnement**, validées au boot via Zod (fail-fast si manquant).
- `SESSION_SECRET` / clés générés par l'utilisateur, jamais de valeur en dur. `.env.example` avec placeholders only.
- Ne jamais logger secrets, tokens, mots de passe. Logs structurés sans PII sensible.

### TLS
- L'app suppose un **reverse proxy** (Caddy/Traefik/nginx) en façade pour TLS. Documenter un exemple Caddy (TLS auto Let's Encrypt). Ne pas réinventer TLS dans le conteneur.

---

## 6. PWA

- `manifest.json` complet : nom, icônes (192/512 + maskable), `display: standalone`, `theme_color`, `start_url`.
- Service worker (Workbox) : **app shell offline**, cache des assets statiques. Stratégie réseau-first pour l'API, cache-first pour les assets.
- **Offline réaliste** : permettre la consultation du dernier récap hors-ligne ; pour l'écriture hors-ligne (file d'attente d'events à re-synchroniser), c'est un nice-to-have v2 — bien le cadrer pour éviter les conflits de données.
- Installable sur mobile (Android/iOS) ; tester l'ajout à l'écran d'accueil.
- Soigner le **mobile-first** : la saisie d'un event (sortie/repas) doit se faire en 2 taps depuis le dashboard.

---

## 7. Docker & déploiement

### Dockerfile
- Build **multi-stage** : `deps → build → runner`. Utiliser le mode `output: 'standalone'` de Next pour une image runner minimale.
- Image runner sur `node:22-alpine`, **user non-root**, `WORKDIR /app`.
- `HEALTHCHECK` → `GET /api/health`.

### docker-compose.yml (schéma)
```yaml
services:
  app:
    build: .
    environment:
      DATABASE_URL: postgres://companions:${DB_PASSWORD}@db:5432/companions
      SESSION_SECRET: ${SESSION_SECRET}
      UPLOAD_DIR: /data/uploads
    volumes:
      - uploads:/data/uploads
    depends_on:
      db: { condition: service_healthy }
    # exposé via reverse proxy, pas en direct sur Internet
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: companions
      POSTGRES_USER: companions
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U companions"]
volumes: { pgdata: {}, uploads: {} }
```

### Migrations
- Lancer `prisma migrate deploy` au démarrage du conteneur app (entrypoint), avant de servir. Idempotent.
- **Ne jamais** utiliser `migrate dev` ou `db push` en prod.

### Backups
- Documenter : `pg_dump` planifié + copie du volume `uploads`. Restauration testée. C'est un standard self-host attendu.

---

## 8. Standards self-host attendus (checklist)

- [ ] `docker compose up` fonctionne avec un `.env` rempli, rien d'autre.
- [ ] Écran de setup au premier lancement (création admin), puis verrouillé.
- [ ] Gestion users par l'admin (créer/désactiver/reset).
- [ ] Variables d'env documentées dans `.env.example` + README.
- [ ] Healthcheck + logs propres.
- [ ] Migrations auto au boot.
- [ ] API documentée (OpenAPI sur `/api/docs`).
- [ ] Reverse proxy + TLS documentés (exemple Caddy).
- [ ] Backups documentés et testés.
- [ ] Pas de secret en dur, fail-fast si config manquante.
- [ ] Image non-root, multi-stage, légère.

---

## 9. Roadmap suggérée (ordre d'implémentation)

1. **Socle** : Next + Prisma + Postgres + docker-compose qui boote. Healthcheck.
2. **Auth & setup** : first-run admin, login/session, RBAC, guards.
3. **Pets** : CRUD + upload photo (sharp, validation).
4. **Events** : journal sorties/repas/besoins, dashboard mobile-first, récap.
5. **Vaccins** : suivi + rappels (`dueAt`).
6. **API tokens & scopes** : gestion + doc OpenAPI. Tester avec Home Assistant.
7. **PWA** : manifest, service worker, installabilité.
8. **Durcissement** : rate-limit, headers sécurité, CSRF, audit.
9. **Backups & docs** déploiement.

---

## 10. Conventions de code

- TypeScript `strict: true`. Pas de `any` non justifié.
- Validation Zod à toutes les frontières (API, env, formulaires).
- Logique métier dans `lib/services`, testée (Vitest). Routes minces.
- Dates en UTC en base, conversion locale à l'affichage uniquement.
- Commits conventionnels (`feat:`, `fix:`, `chore:`…).
- Pas de secret, clé, ni PII dans les logs ou le repo.
