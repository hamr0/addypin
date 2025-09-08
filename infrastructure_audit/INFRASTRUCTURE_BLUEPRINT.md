# Infrastructure Blueprint: Target State

## 1. Core Principles
- **Simplicity:** The simplest solution is the best. Avoid unnecessary complexity.
- **Explicitness:** No magic. All configuration must be defined in version-controlled files or environment variables.
- **Isolation:** Staging and Production are isolated at the application (container) level but can share underlying services (DB, Nginx).
- **Portability:** The entire system should be definable with Docker Compose for local simulation.

## 2. Technology Stack & Roles
| Component | Technology | Purpose |
|---|---|---|
| **Web Server** | Nginx | SSL termination, static file serving, reverse proxy to correct app container |
| **Application** | Node.js in Docker | Runs the actual application (Frontend + API) |
| **Database** | PostgreSQL (External) | Single instance on VPS hosting `app_production` and `app_staging` databases |
| **CI/CD** | GitHub Actions | Builds Docker images, pushes to GHCR, triggers deployment scripts on VPS |
| **Deployment** | Docker Compose | Defines and manages the application container on the VPS |