#!/bin/bash

# Enhanced VPS Deployment Script with Docker Cleanup
# Based on proven working deployment process from documentation
# Incorporates learnings from REPLIT_AGENT_LEARNING.md

set -e

echo "🎯 AddyPin VPS Deployment - Enhanced with Docker Cleanup"
echo "📚 Based on proven working process from deployment documentation"

# Configuration
DEPLOY_TIME=$(date '+%Y%m%d_%H%M%S')
LOG_FILE="/var/log/addypin/deploy-$DEPLOY_TIME.log"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Create log directory
mkdir -p /var/log/addypin

log "🚀 Starting enhanced VPS deployment process..."

# PHASE 1: Pre-deployment Docker cleanup (if Docker is available)
log "🧹 Phase 1: Docker cleanup (if applicable)..."
if command -v docker &> /dev/null; then
    log "📦 Docker detected - running cleanup..."
    
    # Stop any Docker containers
    docker-compose down 2>/dev/null || true
    
    # Clean up old images (keep last 7 days)
    log "🗑️ Removing Docker images older than 7 days..."
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}\t{{.ID}}" | \
    awk 'NR>1' | \
    while read repo tag created id; do
        if [[ $(date -d "$created" +%s) -lt $(date -d "7 days ago" +%s) ]] 2>/dev/null; then
            log "🗑️ Removing old image: $repo:$tag ($created)"
            docker rmi -f "$id" 2>/dev/null || true
        fi
    done
    
    # Clean up dangling images and build cache
    docker image prune -f 2>/dev/null || true
    docker builder prune -f 2>/dev/null || true
    
    log "✅ Docker cleanup completed"
else
    log "ℹ️ Docker not detected - skipping Docker cleanup"
fi

# PHASE 2: Standard proven deployment process
log "🎯 Phase 2: Running proven deployment process..."

cd /opt/addypin

log "🛑 Stopping AddyPin service..."
systemctl stop addypin

log "💾 Creating backup..."
if [ -d "app" ]; then
    cp -r app app-backup-$DEPLOY_TIME
    log "✅ Backup created: app-backup-$DEPLOY_TIME"
fi

log "📡 Updating repository..."
if [ ! -d "addypin-repo" ]; then
    log "📥 Cloning repository..."
    git clone https://${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/hamr0/addypin.git addypin-repo
else
    log "🔄 Pulling latest changes..."
    cd addypin-repo && git pull origin main && cd ..
fi

log "🔨 Building application..."
cd addypin-repo

# Install dependencies
log "📦 Installing dependencies..."
npm install

# Build React client (proven working)
log "⚛️ Building React client with Vite..."
npx vite build

# Build Node.js server (proven working)
log "🖥️ Building Node.js server with esbuild..."
npx esbuild server/index.ts --platform=node --bundle --format=esm --outdir=dist --external:pg-native --minify

log "🚀 Deploying files..."
mkdir -p ../app
rm -rf ../app/*
cp -r dist/* ../app/
cp package.json ../app/

log "📦 Installing production dependencies..."
cd ../app
npm install --only=production pg

log "🔐 Setting permissions..."
chown -R addypin:addypin /opt/addypin/app

log "🚀 Starting AddyPin service..."
systemctl start addypin

log "⏳ Waiting for service to start..."
sleep 3

# PHASE 3: Health check and verification
log "🏥 Phase 3: Health check and verification..."

if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    log "✅ Health check passed!"
    
    # Additional verification
    if curl -f https://addypin.com > /dev/null 2>&1; then
        log "✅ External HTTPS access confirmed"
    else
        log "⚠️ External HTTPS check failed (might be normal during propagation)"
    fi
    
    log "🎯 DEPLOYMENT SUCCESSFUL!"
    log "📊 Deployment method: Simple VPS build (proven working)"
    log "🌐 Website: https://addypin.com"
    log "📝 Logs: $LOG_FILE"
    
else
    log "❌ Health check failed!"
    log "🔄 Check logs: journalctl -u addypin -n 20"
    log "💾 Backup available: app-backup-$DEPLOY_TIME"
    exit 1
fi

# PHASE 4: Setup automated Docker cleanup (if Docker exists)
if command -v docker &> /dev/null; then
    log "⏰ Phase 4: Setting up automated cleanup schedule..."
    
    # Setup weekly Docker cleanup cron job
    CLEANUP_CRON="0 2 * * 0 cd /opt/addypin && /opt/addypin/scripts/docker-cleanup.sh >> /var/log/docker-cleanup.log 2>&1"
    
    if ! crontab -l 2>/dev/null | grep -q "docker-cleanup.sh"; then
        log "📅 Adding weekly Docker cleanup cron job..."
        (crontab -l 2>/dev/null; echo "$CLEANUP_CRON") | crontab -
        log "✅ Weekly cleanup scheduled for Sundays at 2 AM"
    else
        log "✅ Docker cleanup cron job already exists"
    fi
fi

log "🎯 Enhanced VPS deployment completed successfully!"
log "📚 Used proven methods from deployment documentation"
log "🧹 Docker cleanup system active (if applicable)"
log "📊 Total deployment time: $((SECONDS / 60)) minutes"