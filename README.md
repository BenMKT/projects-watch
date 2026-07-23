# Citizen Development Watch (CDW)

Full-stack civic technology platform for public project monitoring, community evidence, RAG traffic-light status, household surveys, and ministry accountability.

## Stack

- **Next.js App Router** + TypeScript + Tailwind CSS
- **NextAuth (Auth.js)** JWT sessions with role-based access + MFA stub for admins/officers
- **Prisma ORM** + **SQLite** (local) / **PostgreSQL** (production via Docker Compose)
- Modular services: RAG engine, escalation protocol, AES-256 encryption, AI sentiment/clustering mocks, offline sync

## Quick start

### 1. Prerequisites

- Node.js 20+
- Optional: Docker (for PostgreSQL in production-like setups)

### 2. Install & configure

```bash
npm install
cp .env.example .env
```

By default the app uses **SQLite** (`file:./dev.db`) so you can run without Docker.
For **PostgreSQL**: set `provider = "postgresql"` in `prisma/schema.prisma`, point `DATABASE_URL` at Postgres, then `docker compose up -d` (see `docker-compose.yml`).

### 3. Database setup & seed

```bash
npm run db:setup
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

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
- Escalation: Green info · Amber 14-day · Red 5-day + ACA + public statement + parliamentary committee

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
| `/dashboard` | Public analytics |
| `/admin` | Ministry console |
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

AI sentiment (`lib/ai/sentiment.ts`) and geoclustering (`lib/ai/clustering.ts`) are pluggable mocks ready for real NLP/CV services.

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
