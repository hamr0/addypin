# Insights

Learnings, patterns discovered, and things worth remembering.

## Infrastructure

- PostgreSQL containerized with localhost-only binding is both secure and performant (3-16ms queries)
- Multi-stage Docker builds keep production images lean while avoiding dependency issues
- ESBuild `--packages=external` is essential - never bundle node_modules into the backend

## Development

- SSH tunnel to VPS PostgreSQL works reliably for local development
- OTP codes show in toast notifications during development mode
- Whitelisted IPs in `server/middleware/rateLimiter.ts` bypass rate limits for testing

## Deployment

- Manual CI/CD triggers prevent accidents - worth the extra click
- Health check at `/api/health` returns HTTP 503 on any dependency failure - good for automation
- Docker cleanup should be run periodically to avoid disk space issues on VPS

---

<!-- Add new insights as they're discovered -->
