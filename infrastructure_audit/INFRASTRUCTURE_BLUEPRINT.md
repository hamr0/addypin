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

## 3. Physical Layout on VPS

```
/home/user/ ——— app/ ——— production/ # Production Environment Directory |
                  |         ├── .env # PROD environment variables |
                  |         └── docker-compose.yml # PROD service definition |
                  ├── staging/ # Staging Environment Directory |
                  |         ├── .env # STAGING environment variables |
                  |         └── docker-compose.yml # STAGING service definition |
                  ├── sites-available/ |
                  |         ├── mapycom.com # PROD config |
                  |         └── staging.mapycom.com # STAGING config ——
                  └── sites-enabled/ # (symlinks to sites-available)
```

## 4. Network & Port Matrix (TARGET)
| Component | Host Interface | Host Port | Container Port | Protocol | Notes |
|---|---|---|---|---|---|
| **Nginx** | 0.0.0.0 | 80 | - | HTTP | Redirects to 443 |
| **Nginx** | 0.0.0.0 | 443 | - | HTTPS | Main entry point |
| **PostgreSQL** | localhost | 5432 | - | TCP | Only accessible from host and containers via host.docker.internal |
| **Prod App** | localhost | 3001 | 3000 | TCP | Nginx proxies "mapycom.com" -> "localhost:3001" |
| **Staging App** | localhost | 3002 | 3000 | TCP | Nginx proxies "staging.mapycom.com" -> "localhost:3002" |

## 5. Docker Strategy
- **One Dockerfile:** A single multi-stage `Dockerfile` at the project root.
- **Build in CI:** Images are built by GitHub Actions, tagged with `{commit-sha}`, `:staging`, `:prod`, and pushed to GitHub Container Registry (GHCR).
- **Run with Compose:** The VPS only pulls images from GHCR and uses `docker-compose.yml` files to run them. The VPS does not build images.
- **Image Command:** The container's default command must start the application. It must respect the `$PORT` environment variable.
- **Dockerfile**
- **Example Dockerfile CMD**
CMD ["node", "build/index.js"]

## 6. Environment Variables (TARGET)
The application must be configured solely through environment variables. The following are required:

### Application Variables
- NODE_ENV: 'production' or 'staging'
- PORT: 3000 (The port the Node.js app listens on *inside* the container)
- DATABASE_URL: Connection string to PostgreSQL (e.g., 'postgresql://user:pass@host.docker.internal:5432/app_production')

### External Service Variables
- RESEND_API_KEY
- VITE_API_URL: The public base URL for the API (e.g., 'https://myapp.com/api'), used by the frontend.

## 7. CI/CD Pipeline Flow (TARGET)
1. **Code Push:** Code is pushed to `main` or `staging` branch.
2. **Build Image:** GitHub Actions builds the Docker image.
3. **Push Image:** Image is tagged and pushed to GHCR.
4. **Deploy:** GitHub Actions SSHes into the VPS and executes a deployment script.
5. **Deploy Execution:** The deployment script:
   a. Goes to the correct directory (`/app/staging` or `/app/production`).
   b. Pulls the new Docker image.
   c. Runs `docker-compose up -d` which uses the `.env` file in that directory.
   d. Runs a health check validation script.
6. **Rollback:** If health checks fail, the script automatically re-deploys the previous known-good image.

---

# Phase 2: Current Reality Discovery

## Network Ports Analysis (CURRENT)
```
tcp        0      0 0.0.0.0:443             0.0.0.0:*               LISTEN      1977696/nginx: mast 
tcp        0      0 0.0.0.0:8080            0.0.0.0:*               LISTEN      2058739/docker-prox 
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN      1977696/nginx: mast 
tcp        0      0 0.0.0.0:3000            0.0.0.0:*               LISTEN      2030655/docker-prox 
tcp        0      0 0.0.0.0:5432            0.0.0.0:*               LISTEN      1989726/postmaster  
tcp6       0      0 :::5000                 :::*                    LISTEN      274720/node         
tcp6       0      0 :::5432                 :::*                    LISTEN      1989726/postmaster  
```

### Key Findings:
- ✅ Nginx running on ports 80/443 (correct)
- ❌ Docker containers exposed on host ports 3000 & 8080 (should be localhost only)
- ❌ Node.js process running directly on port 5000 (not containerized)
- ✅ PostgreSQL running on port 5432

## Current Directory Structure
### Actual App Locations:
- **Production**: `/opt/addypin/` (not `/home/user/app/production/`)
- **Staging**: `/opt/addypin-staging/` (not `/home/user/app/staging/`)

### Key Configuration Files Found:
- `/opt/addypin/docker-compose.yml`
- `/opt/addypin/nginx-api-fix.conf`
- `/opt/addypin/frontend/nginx.conf`
- `/opt/addypin-staging/docker-compose.yml`
- `/opt/addypin-staging/nginx-api-fix.conf`
- `/opt/addypin-staging/frontend/nginx.conf`

### Critical Gaps vs Target:
❌ **No `.env` files found** - Applications not using environment variables
❌ **Wrong directory structure** - Apps in `/opt/` instead of `/home/user/app/`
❌ **No sites-available/sites-enabled structure** - Custom nginx configs instead