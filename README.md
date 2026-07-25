# Citizen Development Watch (CDW)

Full-stack civic technology platform for public project monitoring, community evidence, RAG traffic-light status, household surveys, and ministry accountability.

## Stack

- **Next.js App Router** + TypeScript + Tailwind CSS
- **NextAuth (Auth.js)** JWT sessions with role-based access + MFA stub for admins/officers
- **Prisma ORM** + **SQLite** (local) / **PostgreSQL** (production) — or **`DATA_SOURCE=mock`** JSON demo store for Vercel without a live DB
- Modular services: RAG engine, escalation protocol, AES-256 encryption, AI sentiment/clustering mocks, offline sync

## Quick start

### Demo / Vercel (no live database)

Set `DATA_SOURCE=mock` in `.env` (already the default in `.env.example`). Data is served from `data/mock-db.json`. Writes are rejected as read-only.

```bash
npm install
npm run dev
```

On Vercel, set environment variables:

- `DATA_SOURCE=mock`
- `AUTH_SECRET` (generate with `npx auth secret`)
- `AUTH_URL` / `NEXTAUTH_URL` = your deployment URL
- `ENCRYPTION_KEY`, `ANONYMISATION_SALT` (any long secrets)

No `DATABASE_URL` required for mock mode.

### Local with Prisma / SQLite

```bash
# .env → DATA_SOURCE=prisma
npm install
npm run db:setup
npm run dev
```

By default the Prisma path uses **SQLite** (`file:./dev.db`).
For **PostgreSQL**: set `provider = "postgresql"` in `prisma/schema.prisma`, point `DATABASE_URL` at Postgres, then `docker compose up -d` (see `docker-compose.yml`).

## Demo accounts

Password for all: `password123`  
MFA code (admins / officers / parliamentary): `123456`

| Email | Role |
|-------|------|
| `superadmin@cdw.local` | Super Admin (ministry) |
| `district@cdw.local` | District Admin |
| `officer@cdw.local` | Field Officer |
| `citizen@cdw.local` | Citizen |
| `parliament@cdw.local` | Parliamentary / Audit |

## Core modules

### Module A — Project Monitoring Engine

- Admin project onboarding (details, GPS, milestones, baselines)
- Public map, evidence upload (photo/video/written/voice), milestone-aligned forms, subscriptions
- RAG traffic lights from ≥3 independent reports + mock AI sentiment/activity + weighted consensus
- Admin review publishes final status and triggers escalations

### Module B — Community Feedback & Survey Engine

- Roles: Super Admin, District Admin, Field Officer, Citizen (+ Parliamentary)
- Domains: Infrastructure, Healthcare, Education, Employment, Security
- Offline mode: auto-detect, encrypted local drafts, GPS/photo cache, sync + conflict resolution

### Analytics & escalation

- Geo clusters / heatmaps (mock services)
- Public dashboard: RAG map, feed, scorecards, ministry tracker
- Escalation: Green info · Amber 14-day · Red 5-day + IGG + public statement + parliamentary committee

### Security

- MFA for privileged roles (demo code `123456`)
- AES-256-GCM encrypted upload payloads
- Anonymised citizen reporters
- Survey raw data role-separated (not public)
- Audit trails + retention policies (GDPR-aligned)

## Key routes

| Path | Purpose |
|------|---------|
| `/` | Landing |
| `/map` | Interactive RAG map |
| `/projects` | Project register |
| `/reports` | Community feed |
| `/briefings` | Chamber Briefings (parliamentary sessions) |
| `/dashboard` | Public analytics |
| `/admin` | Ministry console |
| `/admin/briefings` | Publish Chamber Briefings (URL or Blob) |
| `/officer` | Field surveys + offline |
| `/login` | Auth |

## Architecture

```
src/
  app/           # App Router pages + API routes
  components/    # UI (map, forms, header, offline banner)
  lib/           # auth, prisma, rag-engine, escalation, encryption, rbac, ai/*
  types/         # shared types
prisma/          # schema + seed
```

AI modules are **env-switched** (demo defaults need no paid APIs):

| Variable | Values | Default |
|----------|--------|---------|
| `SENTIMENT_PROVIDER` | `mock` · `openai` · `remote` (HF/HTTP) | `mock` |
| `CLUSTER_PROVIDER` | `grid` · `supercluster` | `grid` (local; never an LLM) |
| `VOICE_STT_PROVIDER` | `browser` · `remote` | `browser` |
| `VISION_PROVIDER` | `mock` · `remote` | `mock` |

**Production pattern** (one OpenAI key + Supercluster):

```env
OPENAI_API_KEY=sk-...
SENTIMENT_PROVIDER=openai
VOICE_STT_PROVIDER=remote
VISION_PROVIDER=remote
CLUSTER_PROVIDER=supercluster
BLOB_READ_WRITE_TOKEN=...
DATA_SOURCE=prisma
```

Fallbacks: openai/remote AI → mock/browser on failure. Whisper/vision/sentiment share `OPENAI_API_KEY` unless service-specific keys are set.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server |
| `npm run db:up` | Start Postgres via Docker |
| `npm run db:setup` | Push schema + seed |
| `npm run db:seed` | Re-seed demo data |
| `npm run db:studio` | Prisma Studio |
| `npm run build` | Production build |

## License

Built as a civic-tech demonstration platform.
