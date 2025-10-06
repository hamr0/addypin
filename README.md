# addypin - Location Sharing Application

A modern, full-stack location sharing application that allows users to create pins on a map with shareable links.

## 🚀 Infrastructure Status

**✅ FULLY MODERNIZED - Professional CI/CD Implementation Complete**

- **Phase 1-4 Complete**: Security hardening, routing fixes, database containerization, and professional CI/CD
- **Production**: https://addypin.com (Healthy - 16ms database response)
- **Staging**: https://staging.addypin.com (Healthy - 3ms database response) 
- **CI/CD**: GitHub Actions with automated Docker builds and VPS deployments
- **Database**: Containerized PostgreSQL 15 with zero data loss migration
- **Security**: Ed25519 SSH authentication, non-root containers, encrypted credentials

## 🏗️ Technology Stack

### Frontend
- **React + TypeScript** with Vite build tool
- **Radix UI** components for accessibility
- **Tailwind CSS** with shadcn/ui design system
- **TanStack Query** for state management
- **Leaflet** for interactive maps

### Backend  
- **Node.js 20** with Express.js and TypeScript
- **Drizzle ORM** with PostgreSQL 15
- **ESBuild** for optimized production bundles
- **Docker** containerization with multi-stage builds

### Infrastructure
- **Docker Compose** for container orchestration
- **GitHub Actions** for CI/CD pipeline
- **GitHub Container Registry** for image management
- **Nginx** reverse proxy with SSL termination
- **PostgreSQL 15** containerized database

### DevOps & Security
- **Multi-stage Docker builds** with security hardening
- **SSH automation** with Ed25519 key authentication  
- **Manual approval gates** for production deployments
- **Automated health verification** with rollback capability
- **Container security** with non-root execution

## 🔧 Development

### Local Development
```bash
# Start development server
npm run dev

# Build for production  
npm run build

# Start production server
npm run start

# Database schema sync
npm run db:push
```

### CI/CD Pipeline
- **Staging**: Manual trigger via GitHub Actions
- **Production**: Manual approval required
- **Health Checks**: Automated verification after deployment
- **Rollback**: Automatic on health check failures

## 📊 System Health

**Production Environment:**
- Database: 16ms response time ✅
- SSL: Valid certificates ✅  
- Health: All systems operational ✅

**Staging Environment:**
- Database: 3ms response time ✅
- SSL: Valid certificates ✅
- Health: All systems operational ✅

## 📈 Production Monitoring

**Automated Health Monitoring:**
- **Frequency**: 5-minute cron-based health checks
- **Coverage**: Nginx, Docker containers, API endpoints
- **Auto-Recovery**: Nginx automatic restart on failures
- **Logging**: Comprehensive audit trail with 7-day rotation
- **Manual Verification**: `sudo /opt/infra-health-check.sh`
- **Live Monitoring**: `sudo tail -f /var/log/infra-health-check.log`

**Monitored Services:**
- ✅ Nginx web server (auto-restart enabled)
- ✅ Production container (addypin) 
- ✅ Staging container (addypin-staging)
- ✅ Database container (addypin-postgres)
- ✅ Health endpoints (localhost:3000, localhost:8080)

## 🛡️ Security Features

- **Database**: Secure credentials with container isolation
- **Authentication**: Ed25519 SSH keys for CI/CD
- **Containers**: Non-root execution with minimal attack surface
- **Network**: Localhost database binding with Docker network isolation
- **Deployments**: Manual approval gates preventing accidental releases

## 📈 Performance

- **Database Response**: 3-16ms PostgreSQL queries
- **Container Startup**: ~10 seconds
- **Build Time**: Optimized multi-stage Docker builds
- **Deployment**: Zero-downtime with health verification

---

**Status**: Production-ready with professional CI/CD pipeline ✅
