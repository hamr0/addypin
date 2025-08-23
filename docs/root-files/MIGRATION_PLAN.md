# Comprehensive Migration Plan: Replit to VPS

## Overview
Systematic migration from Replit managed environment to self-hosted RackNerd VPS using Docker containerization to eliminate environment incompatibility issues.

## Current Stack (Keep)
✅ **Infrastructure**: RackNerd VPS, DigitalOcean DNS
✅ **Email**: Resend API (working in Replit)
✅ **Mail Server**: Maddy (for email receiving)
✅ **Database**: PostgreSQL (containerized)
✅ **Code**: Working TypeScript/Node.js application

## Phase 1: Build Pipeline (Revised)
**Goal**: Prepare application for containerized deployment

### Key Changes from Original Plan
- ❌ **Removed**: ESBuild bundling attempt (architectural mismatch)
- ✅ **Added**: Docker containerization strategy
- ✅ **Kept**: Frontend build process (Vite)
- ✅ **Added**: TypeScript source execution via tsx (like Replit)

### Implementation
```bash
# 1. Frontend build only (no backend bundling)
npm run build  # Vite builds client assets

# 2. Type checking (no compilation)
npm run type-check  # Verify TS correctness

# 3. Docker preparation
# Create Dockerfile and docker-compose.yml
```

## Phase 2: VPS Environment (Unchanged)
**Goal**: Provision clean VPS infrastructure

- PostgreSQL database setup
- Docker installation
- Nginx reverse proxy configuration
- SSL certificates (Let's Encrypt)
- User management and security

## Phase 3: Docker Deployment (NEW APPROACH)
**Goal**: Deploy application using Docker containers

### Architecture
- **Application Container**: Node.js 20 + tsx runtime (replicates Replit)
- **Database Container**: PostgreSQL 15
- **Reverse Proxy**: Nginx (host level)
- **Container Orchestration**: Docker Compose

### Benefits
- Environment encapsulation (eliminates "works on Replit" issues)
- Dependency isolation (no more systemd permission problems)
- Exact replication of Replit's runtime environment
- Production-grade deployment patterns
- Easy rollbacks and updates

## Phase 4: Production Hardening (Enhanced)
- Container security policies
- Automated backups
- Monitoring and logging
- CI/CD pipeline setup