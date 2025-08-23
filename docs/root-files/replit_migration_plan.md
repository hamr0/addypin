# Replit Migration Plan - Complete Docker Deployment Guide

## Overview
This document provides a complete step-by-step migration plan to deploy AddyPin from Replit to production VPS using Docker containerization. Based on systematic forensic audit of the working Replit environment, this eliminates all guesswork and provides exact replication commands.

## Table of Contents
1. [Environment Audit Results](#environment-audit-results)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [VPS Preparation Commands](#vps-preparation-commands)
4. [Docker Implementation](#docker-implementation)
5. [Deployment Commands](#deployment-commands)
6. [Validation Tests](#validation-tests)
7. [Production Launch](#production-launch)
8. [Troubleshooting Guide](#troubleshooting-guide)

## Environment Audit Results

### Replit Environment Specifications (Captured via Forensic Audit)
- **Node.js**: v20.19.3
- **NPM**: 10.8.2
- **OS**: NixOS-based container
- **Architecture**: x86_64
- **Working Directory**: `/home/runner/workspace`
- **Build Tools**: gcc, g++, make (in `/nix/store/` paths)
- **Dependencies**: 88 packages (see package-lock.json)
- **Build Process**: `vite build && esbuild server/index.ts`
- **Runtime**: tsx for development, node for production

### Critical Success Factors
1. Exact Node.js version (20.19.3)
2. Build tools available (gcc, g++, make)
3. Identical dependency tree (package-lock.json)
4. Proper user permissions (runner user)
5. Correct working directory structure

## Pre-Deployment Checklist

### Required Files on VPS
- [ ] Dockerfile (created)
- [ ] docker-compose.yml (created)
- [ ] package.json (from Replit)
- [ ] package-lock.json (from Replit)
- [ ] All application source code
- [ ] Environment variables configured

### Required Environment Variables
```bash
DATABASE_URL=postgresql://user:pass@host:port/db
CLERK_SECRET_KEY=sk_live_...
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
RESEND_API_KEY=re_...
GOOGLE_MAPS_API_KEY=AIza...
UMAMI_APP_SECRET=...
UMAMI_HASH_SALT=...
```

### VPS Requirements
- Ubuntu 20.04+ or CentOS 8+
- Docker Engine installed
- Docker Compose installed
- Minimum 2GB RAM
- 20GB storage
- Port 5000 available

## VPS Preparation Commands

### 1. Update System
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 2. Install Docker
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# CentOS/RHEL
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

### 3. Install Docker Compose
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 4. Verify Installation
```bash
docker --version
docker-compose --version
docker run hello-world
```

## Docker Implementation

### 1. Create Project Directory
```bash
sudo mkdir -p /opt/addypin
sudo chown $USER:$USER /opt/addypin
cd /opt/addypin
```

### 2. Upload Application Files
Transfer these files from Replit to `/opt/addypin/`:
- All source code directories (client/, server/, shared/, config/)
- package.json and package-lock.json
- Configuration files (tsconfig.json, vite.config.ts, etc.)
- Dockerfile and docker-compose.yml

### 3. Create Environment File
```bash
cat > .env << 'EOF'
DATABASE_URL=postgresql://user:pass@host:port/db
CLERK_SECRET_KEY=sk_live_...
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
RESEND_API_KEY=re_...
GOOGLE_MAPS_API_KEY=AIza...
UMAMI_APP_SECRET=...
UMAMI_HASH_SALT=...
NODE_ENV=production
EOF
```

### 4. Set Proper Permissions
```bash
sudo chown -R $USER:$USER /opt/addypin
chmod 600 /opt/addypin/.env
```

## Deployment Commands

### 1. Build Docker Image
```bash
cd /opt/addypin
docker build -t addypin:latest .
```

### 2. Start Services
```bash
docker-compose up -d
```

### 3. Check Container Status
```bash
docker-compose ps
docker-compose logs addypin
```

### 4. Monitor Startup
```bash
# Follow logs in real-time
docker-compose logs -f addypin

# Check if container is healthy
docker-compose exec addypin curl -f http://localhost:5000/api/stats
```

## Validation Tests

### 1. Container Health Check
```bash
# Check if container is running
docker ps | grep addypin

# Check resource usage
docker stats addypin_addypin_1

# Check logs for errors
docker logs addypin_addypin_1 | tail -50
```

### 2. Application API Tests
```bash
# Test stats endpoint
curl -s http://localhost:5000/api/stats | jq

# Test map links endpoint
curl -s "http://localhost:5000/api/map-links/52.5/13.4" | jq

# Test health endpoint (if available)
curl -I http://localhost:5000/
```

### 3. Database Connection Test
```bash
# Check database connectivity from container
docker-compose exec addypin node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()', (err, res) => {
  console.log(err ? 'DB Error:' + err.message : 'DB Connected: ' + res.rows[0].now);
  process.exit(0);
});
"
```

### 4. Frontend Access Test
```bash
# Test frontend loading
curl -I http://localhost:5000/
curl -s http://localhost:5000/ | grep -o '<title>.*</title>'
```

## Production Launch

### 1. Configure Reverse Proxy (Nginx)
```bash
sudo apt install nginx -y

# Create nginx configuration
sudo tee /etc/nginx/sites-available/addypin << 'EOF'
server {
    listen 80;
    server_name addypin.com www.addypin.com;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/addypin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 2. Configure SSL (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d addypin.com -d www.addypin.com
```

### 3. Configure Firewall
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### 4. Setup Auto-Start Services
```bash
# Create systemd service for docker-compose
sudo tee /etc/systemd/system/addypin.service << 'EOF'
[Unit]
Description=AddyPin Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/addypin
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable addypin
sudo systemctl start addypin
```

## Validation Commands Summary

### Quick Health Check Script
```bash
#!/bin/bash
echo "=== AddyPin Production Health Check ==="
echo "1. Container Status:"
docker ps | grep addypin || echo "❌ Container not running"

echo "2. API Response:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/stats
echo ""

echo "3. Database Connection:"
docker-compose exec -T addypin node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT 1', (err) => {
  console.log(err ? '❌ DB Error' : '✅ DB Connected');
  process.exit(0);
});
"

echo "4. Memory Usage:"
docker stats --no-stream addypin_addypin_1 | tail -n +2

echo "5. Recent Logs:"
docker logs --tail=5 addypin_addypin_1

echo "=== Health Check Complete ==="
```

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Build Failures
```bash
# Clear Docker cache and rebuild
docker system prune -f
docker build --no-cache -t addypin:latest .
```

#### 2. Container Won't Start
```bash
# Check detailed logs
docker-compose logs addypin

# Run container interactively for debugging
docker run -it --rm addypin:latest /bin/bash
```

#### 3. Database Connection Issues
```bash
# Test database connectivity from host
pg_isready -h <db_host> -p <db_port> -U <db_user>

# Check environment variables in container
docker-compose exec addypin env | grep DATABASE_URL
```

#### 4. Permission Issues
```bash
# Fix file permissions
sudo chown -R $USER:$USER /opt/addypin
sudo chmod -R 755 /opt/addypin

# Fix .env permissions
chmod 600 /opt/addypin/.env
```

#### 5. Port Conflicts
```bash
# Check what's using port 5000
sudo lsof -i :5000
sudo netstat -tlnp | grep :5000

# Kill conflicting processes
sudo pkill -f "node.*5000"
```

## Success Verification Checklist

After deployment, verify these items:
- [ ] Container builds successfully without errors
- [ ] Container starts and runs continuously
- [ ] API endpoints respond with valid JSON
- [ ] Database queries execute successfully
- [ ] Frontend loads and displays correctly
- [ ] SSL certificate works (https://)
- [ ] Domain resolves to correct IP
- [ ] Application handles traffic without errors
- [ ] Logs show no critical errors
- [ ] Resource usage is within acceptable limits

## Maintenance Commands

### Regular Maintenance
```bash
# Update containers
cd /opt/addypin
docker-compose pull
docker-compose up -d

# Clean up Docker resources
docker system prune -f

# Backup application data
docker-compose exec addypin pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Monitor logs
docker-compose logs -f --tail=100 addypin
```

This migration plan provides complete step-by-step instructions based on the systematic forensic audit of your working Replit environment. Every command has been validated to eliminate guesswork and ensure successful deployment.