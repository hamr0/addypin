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

## Docker Container Analysis (CURRENT)
```
CONTAINER ID   IMAGE                    COMMAND                  CREATED      STATUS                PORTS                    NAMES
858a9eb1c964   addypin-staging:latest   "docker-entrypoint.s…"   4 days ago   Up 4 days (healthy)   0.0.0.0:8080->3000/tcp   addypin-staging
028c8a3d0cf8   addypin:latest           "docker-entrypoint.s…"   4 days ago   Up 4 days (healthy)   0.0.0.0:3000->3000/tcp   addypin
```

### Docker Images:
```
REPOSITORY        TAG       IMAGE ID       CREATED      SIZE
addypin-staging   latest    7808f5d86e99   4 days ago   1.37GB
addypin           latest    dd423ae9f1c2   4 days ago   1.37GB
```

### Critical Issues vs Target:
❌ **Containers exposed on all interfaces** - Should be localhost only (TARGET: localhost:3001, localhost:3002)  
❌ **Wrong port mapping** - Production using port 3000, Staging using port 8080 (not 3001/3002)  
✅ **Health checks working** - Containers show "(healthy)" status  
❌ **Local image tags** - Images built locally, not pulled from GHCR as per target blueprint

## Nginx Configuration Analysis (CURRENT)
### Configuration Status:
✅ **Syntax Valid** - `nginx: configuration file /etc/nginx/nginx.conf test is successful`  
✅ **AlmaLinux Structure** - Uses `/etc/nginx/conf.d/` directory (correct for AlmaLinux)  
❌ **Single Config File** - `addypin.conf` handles both staging and production (should be separate)

### Current Config Structure:
- `/etc/nginx/conf.d/addypin.conf` - Combined configuration
- **Missing**: Separate staging configuration file

### Gaps vs Target:
❌ **No environment separation** - One config handling both prod/staging  
❌ **Wrong proxy targets** - Not proxying to correct localhost ports (3001/3002)

## Database Analysis (CURRENT)
### PostgreSQL Status:
✅ **Service Running** - `Active: active (running) since Wed 2025-09-03 06:11:35 EDT`  
✅ **Correct Databases** - `addypin` (production) and `addypin_staging` databases exist  
✅ **Proper User Access** - `addypin_user` has CTc privileges on both databases  
✅ **Port Configuration** - Running on port 5432 as expected

### Database Structure:
```
     Name       |  Owner   | Encoding |   Collate   |    Ctype    |     Access privileges     
-----------------+----------+----------+-------------+-------------+---------------------------
 addypin         | postgres | UTF8     | en_US.UTF-8 | en_US.UTF-8 | addypin_user=CTc/postgres
 addypin_staging | postgres | UTF8     | en_US.UTF-8 | en_US.UTF-8 | addypin_user=CTc/postgres
```

### Analysis vs Target:
✅ **Database isolation achieved** - Separate databases for production and staging  
✅ **Proper encoding** - UTF8 with correct collation  
✅ **Security model** - Dedicated user with appropriate permissions

---

# PHASE 2 SUMMARY: Current Reality vs Target Blueprint

## ✅ What's Working (Aligned with Target)
1. **Nginx Running** - Web server operational on ports 80/443
2. **Docker Containerization** - Applications running in containers with health checks
3. **Database Separation** - Proper production/staging database isolation
4. **PostgreSQL Stable** - Database service running reliably with correct permissions
5. **Basic Container Orchestration** - Docker containers managed and persistent

## 🚨 Critical Gaps Requiring Immediate Attention

### **SECURITY RISK: Container Network Exposure**
- **Current**: Containers exposed on `0.0.0.0:3000` and `0.0.0.0:8080` (public internet)
- **Target**: Containers on `localhost:3001` and `localhost:3002` (internal only)
- **Impact**: Applications directly accessible without nginx proxy protection

### **INFRASTRUCTURE ISOLATION FAILURE**
- **Current**: Single nginx config for both environments
- **Target**: Separate configs in `/home/user/app/production/` and `/home/user/app/staging/`
- **Impact**: Changes affect both environments simultaneously

### **CONFIGURATION MANAGEMENT BREAKDOWN**  
- **Current**: No `.env` files, hardcoded configuration
- **Target**: Environment variables for all configuration
- **Impact**: Cannot modify settings without rebuilding containers

### **CI/CD PIPELINE MISSING**
- **Current**: Local image builds (`addypin:latest`, `addypin-staging:latest`)
- **Target**: GHCR-sourced images with commit-sha tags
- **Impact**: No automated deployments, manual container management

## 📊 Gap Analysis Summary

| Component | Current State | Target State | Compliance |
|-----------|---------------|--------------|------------|
| **Directory Structure** | `/opt/addypin/`, `/opt/addypin-staging/` | `/home/user/app/production/`, `/home/user/app/staging/` | 🚨 **0%** |
| **Container Networking** | Public exposure (0.0.0.0) | localhost only | 🚨 **0%** |
| **Port Mapping** | 3000, 8080 | 3001, 3002 | 🚨 **0%** |
| **Environment Variables** | None found | Required for all config | 🚨 **0%** |
| **Nginx Separation** | Single config | Separate prod/staging configs | 🚨 **0%** |
| **Image Strategy** | Local builds | GHCR with CI/CD | 🚨 **0%** |
| **Database Setup** | ✅ Separated databases | ✅ Separate databases | ✅ **100%** |
| **Health Monitoring** | ✅ Container health checks | ✅ Health checks | ✅ **100%** |

## 🎯 Next Phase Requirements

**Phase 3: Migration Strategy** - Create step-by-step migration plan to align current infrastructure with target blueprint while maintaining zero downtime.

**Infrastructure Audit Status: COMPLETE ✅**  
**Critical Issues Identified: 6 Major Security & Architecture Gaps**  
**Foundation Fix Required: YES - Comprehensive restructuring needed**