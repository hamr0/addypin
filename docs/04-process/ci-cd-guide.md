# CI/CD Guide

## Overview

AddyPin uses GitHub Actions with Docker for automated deployments. Deployments are manually triggered to prevent accidental production releases.

## Architecture

```
GitHub Actions Workflow
├── 1. Manual trigger (workflow_dispatch)
├── 2. Checkout code
├── 3. Setup Node.js 20
├── 4. Install dependencies (npm ci)
├── 5. Build application (npm run build)
├── 6. Build Docker image (multi-stage)
├── 7. Push to GHCR
├── 8. SSH to VPS (Ed25519 key)
├── 9. Pull image from GHCR
├── 10. docker-compose up -d
├── 11. Health check verification
└── 12. Success or rollback
```

## Docker Build

Multi-stage Dockerfile:

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci
RUN addgroup -g 1001 -S nodejs && \
    adduser -S addypin -u 1001 && \
    chown -R addypin:nodejs /app
USER addypin
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

Key: `--packages=external` in ESBuild treats all node_modules as external.

## GitHub Actions Secrets

| Secret | Purpose |
|--------|---------|
| `VPS_HOST` | VPS IP address |
| `VPS_USER` | SSH username |
| `VPS_SSH_KEY` | Ed25519 private key |
| `DATABASE_URL` | PostgreSQL connection string |
| `RESEND_API_KEY` | Email service key |

## Workflow Files

- `.github/workflows/deploy-production.yml` - Production deployment
- `.github/workflows/deploy-staging.yml` - Staging deployment
- `.github/workflows/rollback.yml` - Rollback procedure

## Container Security

- Non-root user execution (`addypin:nodejs`)
- Alpine Linux base (minimal attack surface)
- Localhost-only port binding (127.0.0.1)
- Ed25519 SSH keys for authentication
- Docker health checks with auto-restart
