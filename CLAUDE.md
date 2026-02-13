# CLAUDE.md

AddyPin is a location sharing service that turns GPS coordinates into short, memorable links. Users drop pins on a map and share them as web links (`ABC123.addypin.com`) or email addresses (`ABC123@addypin.com`). Live at https://addypin.com, staging at https://staging.addypin.com.

## Dev Rules

**POC first.** Always validate logic with a ~15min proof-of-concept before building. Cover happy path + common edges. POC works → design properly → build with tests. Never ship the POC.

**Build incrementally.** Break work into small independent modules. One piece at a time, each must work on its own before integrating.

**Dependency hierarchy — follow strictly:** vanilla language → standard library → external (only when stdlib can't do it in <100 lines). External deps must be maintained, lightweight, and widely adopted. Exception: always use vetted libraries for security-critical code (crypto, auth, sanitization).

**Lightweight over complex.** Fewer moving parts, fewer deps, less config. Express over NestJS, Flask over Django, unless the project genuinely needs the framework. Simple > clever. Readable > elegant.

**Open-source only.** No vendor lock-in. Every line of code must have a purpose — no speculative code, no premature abstractions.

For full development and testing standards, see `.claude/memory/AGENT_RULES.md`.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Leaflet.js, Wouter, TanStack Query
- **Backend**: Node.js 20, Express, TypeScript, Drizzle ORM, Resend (email)
- **Database**: PostgreSQL 15 (containerized)
- **Infra**: Docker + Docker Compose, GitHub Actions CI/CD (manual trigger), Nginx reverse proxy, RackNerd VPS

## Commands

```bash
./dev.sh              # Start dev server (SSH tunnel + hot reload at localhost:5000)
./dev-stop.sh         # Stop dev server
npm run dev           # Dev server without tunnel script
npm run check         # TypeScript type check
npm run build         # Build frontend (Vite) + backend (ESBuild)
npm run start         # Start production server
npm run db:push       # Sync Drizzle schema to database
```

## Project Layout

| Path | Purpose |
|------|---------|
| client/src/ | React frontend (components/, pages/, hooks/, lib/) |
| server/ | Express backend (routes.ts, middleware/, services/) |
| shared/ | Shared code (schema.ts for Drizzle ORM, utils.ts) |
| .github/workflows/ | CI/CD (deploy-production.yml, deploy-staging.yml, rollback.yml) |
| docs/ | All documentation, see docs/README.md |

## Key Patterns

1. **ESBuild `--packages=external`**: All node_modules treated as external. Never bundle dependencies into backend build.
2. **Pin expiry**: Pins without email expire in 72 hours. Pins with verified email are permanent.
3. **Rate limiting**: Pin creation 5/hour, 15/day per IP. General API 100 req/15min. Whitelists in `server/middleware/rateLimiter.ts`.

## Database Tables

`pins` (shortcode, lat/long, email, expiry), `analytics` (events), `daily_stats` (aggregated metrics), `users` (auth)

Schema defined in `shared/schema.ts`. UUIDs via `gen_random_uuid()`, timestamps via `defaultNow()`.

## Core API Endpoints

| Method | Path | Notes |
|--------|------|-------|
| POST | /api/pins | Create pin (rate-limited) |
| GET | /api/pins/:shortcode | Retrieve pin |
| GET | /api/map-links/:lat/:lng | Map app deep links |
| GET | /api/health | Health check (used by CI/CD) |

All routes in `server/routes.ts`. Security middleware: config blocking, DDoS, bot detection, honeypot, rate limiting.

## Deployment

Manual trigger via GitHub Actions UI. Builds Docker image, pushes to GHCR, deploys to VPS via SSH, verifies health check, auto-rollbacks on failure. Takes ~2 minutes.

VPS: production at /opt/addypin (port 3000), staging at /opt/addypin-staging (port 8080). Both share one PostgreSQL container (separate databases).

## Documentation

Full documentation index at `docs/README.md`. Organized as:

| Tier | Path | Content |
|------|------|---------|
| Context | docs/00-context/ | Vision, system state, assumptions |
| Product | docs/01-product/ | PRD and requirements |
| Features | docs/02-features/ | API, email, monitoring, analytics, testing, backups |
| Logs | docs/03-logs/ | Implementation, decisions, bugs, validation, insights |
| Process | docs/04-process/ | Dev workflow, deployment, CI/CD, task management |

## Important Notes

- Drizzle ORM requires type-safe queries
- Shortcodes are 6 uppercase alphanumeric characters, auto-generated
- Nginx handles SSL termination (Let's Encrypt)
- Local dev connects to VPS PostgreSQL via SSH tunnel
- Frontend uses React Hook Form + Zod validation
- Map components in client/src/components/maps/
