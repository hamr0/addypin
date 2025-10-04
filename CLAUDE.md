# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AddyPin is a location sharing service that transforms GPS coordinates into short, memorable links. Users create pins on an interactive map and share them via dual formats: web links (`ABC123.addypin.com`) or email addresses (`ABC123@addypin.com`).

**Live Production**: https://addypin.com
**Staging**: https://staging.addypin.com

## Technology Stack

- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui, Leaflet.js maps
- **Backend**: Node.js 20 + Express + TypeScript, Drizzle ORM
- **Database**: PostgreSQL 15 (containerized)
- **Infrastructure**: Docker + Docker Compose, GitHub Actions CI/CD, Nginx reverse proxy
- **Hosting**: RackNerd VPS ($2/month)

## Development Commands

```bash
# Development
npm run dev          # Start dev server with hot reload (Vite + tsx)
npm run check        # TypeScript type checking

# Building
npm run build        # Build frontend (vite) and backend (esbuild)
npm run start        # Start production server

# Database
npm run db:push      # Sync database schema with Drizzle
```

## Project Structure

```
addypin/
├── client/src/           # Frontend React application
│   ├── components/       # React components (ui/, forms/, maps/, layout/)
│   ├── pages/           # Route-based page components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Frontend utilities
│   └── utils/           # Helper functions
├── server/              # Backend Node.js application
│   ├── index.ts         # Main Express app entry point
│   ├── routes.ts        # API route handlers (pins, analytics, health, OTP)
│   ├── middleware/      # Rate limiting, auth, security, DDoS protection
│   ├── services/        # Email, analytics, Umami, security logging
│   ├── db.ts           # Drizzle database connection
│   └── storage.ts      # Data persistence layer
├── shared/             # Shared code between frontend/backend
│   ├── schema.ts       # Drizzle ORM schemas (users, pins, analytics, dailyStats)
│   └── utils.ts        # Shared utilities
├── .github/workflows/  # CI/CD automation
│   ├── deploy-production.yml
│   ├── deploy-staging.yml
│   └── rollback.yml
└── docs/              # Extensive documentation (90+ docs)
```

## Database Schema

**Key Tables**:
- `pins`: Core location data with shortcodes, lat/long, email verification, expiry
- `analytics`: Event tracking (create, click, email_sent, visit) with user agent, IP, country
- `dailyStats`: Aggregated metrics for dashboard
- `users`: Authentication (username, password)

**Important**: Pins without email (`createdBy`) expire after 72 hours. Pins with email are permanent.

## API Architecture

All routes defined in `server/routes.ts`:

### Core Endpoints
- `POST /api/pins` - Create new pin (rate-limited: 5/hour, 15/day per IP)
- `GET /api/pins/:shortcode` - Retrieve pin data
- `GET /api/map-links/:lat/:lng` - Get links for 12+ map apps
- `GET /api/health` - Health check endpoint (used by CI/CD)

### Security Middleware (Applied Order)
1. Config file blocking (`.env`, `vendor/*`)
2. DDoS protection
3. Bot detection & timing analysis
4. Honeypot traps
5. Rate limiting (general: 100 req/15min)
6. Pin-specific rate limiting (5/hour, 15/day)

### Whitelisted IPs/Emails
Development IPs and user's personal devices are whitelisted in `server/middleware/rateLimiter.ts`. Update when adding test environments.

## CI/CD Deployment

**Workflow**: GitHub Actions automated deployments via Docker

### Deployment Flow
1. Trigger: Manual via GitHub Actions UI
2. Build: Multi-stage Dockerfile (builder → runner)
3. Push: Image to GitHub Container Registry (GHCR)
4. Deploy: SSH to VPS, pull image, `docker-compose up -d`
5. Verify: Health check at `/api/health`
6. Rollback: Automatic if health check fails

### Key Files
- `Dockerfile` - Multi-stage build (Node 20 Alpine, non-root user)
- `docker-compose.yml` - Production orchestration
- `.github/workflows/deploy-production.yml` - Production pipeline
- `.github/workflows/deploy-staging.yml` - Staging pipeline

### Deployment Commands (VPS)
```bash
# On VPS at /opt/addypin
docker-compose down              # Stop containers
docker-compose up -d             # Start containers
docker logs addypin -f           # View production logs
docker logs addypin-staging -f   # View staging logs
docker exec -it addypin-postgres psql -U postgres -d addypin  # Access DB
```

### Environment Variables
Required in VPS `.env`:
- `DATABASE_URL` - PostgreSQL connection string
- `RESEND_API_KEY` - Email service API key
- `NODE_ENV` - production/development
- `PORT` - Application port (3000 for prod, 8080 for staging)

## Build Strategy

**Critical**: The backend uses `esbuild` with `--packages=external` flag. This treats ALL `node_modules` as external dependencies to avoid "Dynamic require not supported" errors. Do NOT bundle dependencies into the backend build.

Build command in `package.json`:
```bash
vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
```

## Security Features

### Rate Limiting
- Pin creation: 5 per hour, 15 per day per IP
- General API: 100 requests per 15 minutes
- Implemented in-memory (consider Redis for horizontal scaling)

### Security Middleware Stack
- **DDoS Protection**: `server/middleware/ddosProtection.ts`
- **Bot Detection**: User agent analysis, timing analysis
- **Honeypot Fields**: Hidden form fields to catch bots
- **Config Blocking**: Prevents access to sensitive files

### Container Security
- Non-root user execution (`addypin:nodejs`)
- Localhost-only database binding (127.0.0.1)
- Ed25519 SSH keys for CI/CD
- Minimal Alpine base images

## Testing & Monitoring

### Health Checks
- Endpoint: `GET /api/health`
- Response: JSON with database status, uptime, response times
- Automated: VPS cron job every 5 minutes (`/opt/infra-health-check.sh`)
- Logs: `/var/log/infra-health-check.log`

### Monitoring
```bash
# View health logs
sudo tail -f /var/log/infra-health-check.log

# Manual health check
sudo /opt/infra-health-check.sh

# Check specific errors
sudo grep "ERROR" /var/log/infra-health-check.log
```

## Common Development Patterns

### Adding New API Endpoint
1. Define route in `server/routes.ts`
2. Add schema validation with Zod if needed
3. Apply appropriate middleware (rate limiting, auth)
4. Update `docs/API_DOCUMENTATION.md`
5. Test locally with `npm run dev`

### Database Schema Changes
1. Modify `shared/schema.ts` with Drizzle schema
2. Run `npm run db:push` to sync (development)
3. For production: Create migration, test in staging first
4. Schema uses UUIDs with `gen_random_uuid()`, timestamps with `defaultNow()`

### Frontend Components
- Use shadcn/ui components from `client/src/components/ui/`
- Follow Tailwind CSS utility-first approach
- Map components in `client/src/components/maps/`
- Forms use React Hook Form + Zod validation

## Key Architectural Decisions

1. **Docker-First**: All deployments containerized (vs systemd services)
2. **Monolithic Container**: Frontend + backend in single container for simplicity
3. **Manual CI/CD Triggers**: Prevents accidental production deployments
4. **External Package Strategy**: ESBuild treats all node_modules as external
5. **Dual Link Format**: Web subdomain (`ABC123.addypin.com`) + email (`ABC123@addypin.com`)

## Documentation Index

Essential docs in `docs/`:
- `HIGH_LEVEL_DESIGN.md` - Complete architecture overview
- `API_DOCUMENTATION.md` - REST API reference
- `DEPLOYMENT-GUIDE.md` - Production deployment procedures
- `QUICK-DEPLOYMENT-REFERENCE.md` - Quick ops reference
- `CI-CD-BREAKTHROUGH-SUCCESS.md` - CI/CD technical breakdown
- `ARCHITECTURE-SUMMARY.md` - Current state summary

## Performance Targets

- **Deployment Time**: 2 minutes (automated)
- **Database Queries**: 3-16ms average
- **API Response**: <100ms
- **Memory Usage**: ~65MB per container
- **Uptime**: 99.9% target

## Important Notes

- Database uses Drizzle ORM - type-safe queries required
- All pins auto-generate 6-character shortcodes (uppercase alphanumeric)
- Email service uses Resend API (free tier limits apply)
- Nginx reverse proxy handles SSL termination
- Both production and staging share same PostgreSQL container (separate databases)
- When making changes to rate limiting, update whitelists in `rateLimiter.ts`
