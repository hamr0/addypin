# GitHub Deployment Guide - AddyPin Production Workflow

## Overview
Complete guide for deploying AddyPin from GitHub to VPS production environment with automated build process and dependency management.

## Architecture
```
Replit Development → GitHub Repository → VPS Production
     ↓                       ↓                ↓
- Code & test          - Version control   - Live website
- Dev database         - Source of truth   - Production database
- localhost:5000       - Git history       - https://addypin.com
```

## Prerequisites Setup

### 1. GitHub Repository Configuration
- **Repository**: https://github.com/hamr0/addypin (private)
- **Access**: Personal Access Token with "repo" permissions
- **Branches**: `main` branch for production deployments

### 2. VPS Environment
- **Server**: RackNerd VPS (155.94.144.191)
- **Domain**: addypin.com with SSL certificates
- **Database**: PostgreSQL with clean production schema
- **Service**: systemd service `addypin`
- **Web Server**: Nginx reverse proxy

### 3. Authentication Setup
```bash
# GitHub Personal Access Token stored in Replit Secrets
GITHUB_PERSONAL_ACCESS_TOKEN="ghp_..."
```

## Deployment Script Configuration

### VPS Deployment Script Location
```
/opt/addypin/deploy.sh
```

### Clean Deployment Process
1. **Stop production service**
2. **Create timestamped backup**
3. **Pull latest code from GitHub**
4. **Build React client** (Vite)
5. **Build Node.js server** (esbuild with bundled dependencies)
6. **Deploy built files**
7. **Install minimal production dependencies**
8. **Start service and verify health**

## Step-by-Step Deployment

### Initial Setup (One-time)
```bash
# On VPS, create the deployment script
cat > /opt/addypin/deploy.sh << 'EOF'
#!/bin/bash
set -e
echo "🚀 Starting AddyPin deployment from GitHub..."
cd /opt/addypin
echo "Stopping AddyPin service..."
systemctl stop addypin
echo "Creating backup..."
if [ -d "app" ]; then
    cp -r app app-backup-$(date +%Y%m%d-%H%M%S)
fi
if [ ! -d "addypin-repo" ]; then
    echo "Cloning repository..."
    git clone https://${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/hamr0/addypin.git addypin-repo
else
    echo "Updating repository..."
    cd addypin-repo && git pull origin main && cd ..
fi
echo "Building application..."
cd addypin-repo
npm install
echo "Building React client..."
npx vite build
echo "Building Node.js server..."
npx esbuild server/index.ts --platform=node --bundle --format=esm --outdir=dist --external:pg-native --minify
echo "Deploying files..."
mkdir -p ../app
rm -rf ../app/*
cp -r dist/* ../app/
cp package.json ../app/
echo "Installing production dependencies..."
cd ../app
npm install --only=production pg
chown -R addypin:addypin /opt/addypin/app
echo "Starting AddyPin service..."
systemctl start addypin
sleep 3
curl -f http://localhost:3000/api/health && echo "✅ Deployment complete!" || echo "⚠️ Check logs: journalctl -u addypin -n 20"
EOF

chmod +x /opt/addypin/deploy.sh
```

### Regular Deployment Process

#### From Replit (Development to GitHub)
```bash
# 1. Make changes in Replit
# 2. Commit and push to GitHub
git add .
git commit -m "Description of changes"
git push origin main
```

#### From VPS (GitHub to Production)
```bash
# SSH to VPS
ssh root@155.94.144.191

# Set GitHub token
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_your_token_here"

# Run deployment
/opt/addypin/deploy.sh
```

## Build Process Details

### Client Build (React)
- **Tool**: Vite
- **Output**: `dist/public/` directory
- **Contains**: HTML, CSS, JavaScript assets
- **Optimized**: Minified, compressed, production-ready

### Server Build (Node.js)
- **Tool**: esbuild
- **Output**: `dist/index.js` (single bundled file)
- **Dependencies**: Bundled internally (except pg-native)
- **Format**: ES modules
- **Optimized**: Minified, tree-shaken

### Dependency Management
- **Development**: Full node_modules in repository
- **Production**: Only essential packages (pg, minimal deps)
- **Strategy**: Bundle most dependencies, install only database driver

## Troubleshooting

### Common Issues and Solutions

#### 1. Authentication Failures
```bash
# Issue: "Authentication failed for GitHub"
# Solution: Update GitHub token
export GITHUB_PERSONAL_ACCESS_TOKEN="new_token_here"
```

#### 2. Build Failures
```bash
# Check build logs during deployment
journalctl -u addypin -n 50

# Manual build testing
cd /opt/addypin/addypin-repo
npm install
npm run build
```

#### 3. Service Won't Start
```bash
# Check service status
systemctl status addypin

# Check application logs
journalctl -u addypin -n 20

# Test manual startup
cd /opt/addypin/app
node index.js
```

#### 4. 502 Bad Gateway
```bash
# Check if service is listening on port 3000
netstat -tlnp | grep 3000

# Test direct connection
curl http://localhost:3000/api/health

# Restart nginx if needed
systemctl restart nginx
```

### Log Locations
- **Application logs**: `journalctl -u addypin -f`
- **Nginx logs**: `/var/log/nginx/error.log`
- **Build logs**: During deployment execution

## Monitoring and Maintenance

### Health Checks
```bash
# Service status
systemctl status addypin

# Website availability
curl -I https://addypin.com

# API health
curl https://addypin.com/api/health

# Database connectivity
sudo -u postgres psql -d addypin -c "SELECT 1;"
```

### Backup Strategy
- **Automatic**: Timestamped backups created before each deployment
- **Location**: `/opt/addypin/app-backup-YYYYMMDD-HHMMSS/`
- **Retention**: Manual cleanup recommended

### SSL Certificate Maintenance
```bash
# Check certificate status
certbot certificates

# Renew certificates (automatic via cron)
certbot renew --dry-run
```

## Performance Considerations

### Build Optimization
- **Client bundle**: ~623KB (compressed)
- **Server bundle**: ~73KB (minified)
- **Build time**: ~15-20 seconds
- **Deployment time**: ~30-45 seconds total

### Resource Usage
- **Memory**: ~1MB Node.js process
- **CPU**: Minimal (event-driven architecture)
- **Storage**: ~50MB total deployment size

## Security Best Practices

### Token Management
- Store GitHub token securely in environment variables
- Rotate tokens periodically
- Use minimal required permissions ("repo" scope only)

### VPS Security
- SSH key authentication only
- Firewall configured (ports 80, 443, 22)
- Regular system updates
- Non-root service user (`addypin`)

## Cost Analysis

### Infrastructure Costs
- **VPS**: $2/month RackNerd
- **Domain**: ~$10/year
- **SSL**: Free (Let's Encrypt)
- **Total**: ~$34/year (92.75% savings vs cloud hosting)

## Future Enhancements

### Automation Opportunities
- GitHub Actions for automated deployment on push
- Slack/Discord notifications for deployment status
- Health check monitoring with alerts
- Database backup automation
- **Health check timeout optimization**: Improve CI/CD health verification timing and retry logic for more reliable deployment validation

### Scaling Considerations
- Load balancer for multiple VPS instances
- CDN for static asset delivery
- Database replication for high availability
- Container deployment (Docker) option