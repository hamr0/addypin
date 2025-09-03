#!/bin/bash

# AddyPin Production Deployment Script
# This script handles safe deployment with automatic rollback on failure

set -e  # Exit on any error

# Configuration
DEPLOY_TIME=$(date '+%Y%m%d_%H%M%S')
LOG_FILE="/var/log/addypin/deploy-$DEPLOY_TIME.log"
HEALTH_CHECK_URL="https://addypin.com"
API_CHECK_URL="https://addypin.com/api/stats"
MAX_ROLLBACK_ATTEMPTS=3

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Error handling function
handle_error() {
    log "❌ ERROR: $1"
    log "🔄 Initiating rollback procedure..."
    rollback_deployment
    exit 1
}

# Rollback function
rollback_deployment() {
    log "🔄 Rolling back to previous version..."
    
    systemctl stop addypin || log "⚠️ Warning: Could not stop service"
    
    if [ -d "/opt/addypin/app-backup-$DEPLOY_TIME" ]; then
        rm -rf /opt/addypin/app
        mv "/opt/addypin/app-backup-$DEPLOY_TIME" /opt/addypin/app
        log "📦 Restored previous version"
    else
        log "❌ No backup found for rollback"
        return 1
    fi
    
    systemctl start addypin || handle_error "Failed to start service during rollback"
    
    # Verify rollback
    sleep 10
    if curl -f "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
        log "✅ Rollback successful - service is healthy"
        return 0
    else
        log "❌ Rollback failed - manual intervention required"
        return 1
    fi
}

# Docker cleanup before deployment
docker_cleanup() {
    log "🧹 Cleaning Docker artifacts to prevent disk space issues..."
    
    if command -v docker &> /dev/null; then
        log "📦 Running Docker cleanup..."
        docker system prune -af 2>/dev/null || true
        log "✅ Docker cleanup completed"
    else
        log "ℹ️ Docker not detected - skipping cleanup"
    fi
}

# Pre-flight checks
pre_flight_checks() {
    log "🔍 Running pre-flight checks..."
    
    # Check disk space (minimum 2GB free)
    AVAILABLE_SPACE=$(df /opt | tail -1 | awk '{print $4}')
    if [ "$AVAILABLE_SPACE" -lt 2097152 ]; then
        handle_error "Insufficient disk space (less than 2GB available)"
    fi
    
    # Check service status
    if ! systemctl is-active --quiet addypin; then
        handle_error "AddyPin service is not currently running"
    fi
    
    # Check database connectivity
    if ! systemctl is-active --quiet postgresql; then
        handle_error "PostgreSQL is not running"
    fi
    
    # Test current health
    if ! curl -f "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
        handle_error "Current deployment is not healthy"
    fi
    
    log "✅ Pre-flight checks passed"
}

# Database backup
backup_database() {
    log "💾 Creating database backup..."
    
    BACKUP_DIR="/opt/addypin/production-backups"
    DB_BACKUP_FILE="$BACKUP_DIR/db_backup_$DEPLOY_TIME.sql"
    
    mkdir -p "$BACKUP_DIR"
    
    # Create PostgreSQL dump
    sudo -u postgres pg_dump addypin > "$DB_BACKUP_FILE" || handle_error "Database backup failed"
    
    # Verify backup
    if [ -s "$DB_BACKUP_FILE" ]; then
        log "✅ Database backup created: $DB_BACKUP_FILE"
    else
        handle_error "Database backup file is empty"
    fi
    
    # Keep only last 5 database backups
    cd "$BACKUP_DIR"
    ls -t db_backup_*.sql | tail -n +6 | xargs rm -f 2>/dev/null || true
}

# Application backup
backup_application() {
    log "📦 Creating application backup..."
    
    if [ -d "/opt/addypin/app" ]; then
        # Remove any existing backup with same timestamp
        rm -rf "/opt/addypin/app-backup-$DEPLOY_TIME"
        cp -r /opt/addypin/app "/opt/addypin/app-backup-$DEPLOY_TIME"
        log "✅ Application backup created"
    else
        handle_error "Current application directory not found"
    fi
}

# Deploy new version
deploy_new_version() {
    log "🚀 Deploying new version..."
    
    cd /opt/addypin/addypin-repo
    
    # Update repository
    git fetch origin || handle_error "Failed to fetch from repository"
    git reset --hard origin/main || handle_error "Failed to reset to main branch"
    
    # Install dependencies
    npm ci --omit=dev || handle_error "Failed to install dependencies"
    
    # Build application
    npm run build || handle_error "Failed to build application"
    log "✅ Application built successfully"
    
    # Copy built files to root for production
    if [ -f "dist/index.js" ]; then
        cp dist/index.js ./index.js
        log "✅ Production files prepared"
    else
        handle_error "Built index.js not found in dist/ directory"
    fi
    
    # Create new app directory
    cp -r /opt/addypin/addypin-repo "/opt/addypin/app-new-$DEPLOY_TIME"
    
    # Set proper permissions
    chown -R addypin:addypin "/opt/addypin/app-new-$DEPLOY_TIME"
    
    log "✅ New version prepared"
}

# Switch to new version
switch_version() {
    log "🔄 Switching to new version..."
    
    # Stop service
    systemctl stop addypin || handle_error "Failed to stop service"
    
    # Atomic switch
    mv /opt/addypin/app "/opt/addypin/app-old-$DEPLOY_TIME"
    mv "/opt/addypin/app-new-$DEPLOY_TIME" /opt/addypin/app
    
    # Start service
    systemctl start addypin || handle_error "Failed to start service with new version"
    
    log "✅ Version switched successfully"
}

# Health checks
run_health_checks() {
    log "🏥 Running health checks..."
    
    # Wait for service to start
    sleep 15
    
    # Check service status
    if ! systemctl is-active --quiet addypin; then
        handle_error "Service is not active after deployment"
    fi
    
    # Test main endpoint
    if ! curl -f "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
        handle_error "Main endpoint health check failed"
    fi
    
    # Test API endpoint
    if ! curl -f "$API_CHECK_URL" > /dev/null 2>&1; then
        handle_error "API endpoint health check failed"
    fi
    
    # Check response time
    RESPONSE_TIME=$(curl -w "%{time_total}" -s -o /dev/null "$HEALTH_CHECK_URL")
    if [ "$(echo "$RESPONSE_TIME > 5" | bc)" -eq 1 ]; then
        log "⚠️ Warning: Response time is slow ($RESPONSE_TIME seconds)"
    fi
    
    log "✅ All health checks passed"
}

# Performance verification
verify_performance() {
    log "📊 Verifying performance..."
    
    # Memory usage check
    MEMORY_USAGE=$(ps -o pid,ppid,cmd,%mem,%cpu --sort=-%mem -C node | head -2 | tail -1 | awk '{print $4}')
    log "📈 Memory usage: ${MEMORY_USAGE}%"
    
    # Check if memory usage is reasonable (less than 20%)
    if [ "$(echo "$MEMORY_USAGE > 20" | bc)" -eq 1 ]; then
        log "⚠️ Warning: High memory usage detected"
    fi
    
    log "✅ Performance verification completed"
}

# Cleanup old backups
cleanup_old_backups() {
    log "🧹 Cleaning up old backups..."
    
    cd /opt/addypin
    
    # Keep only last 3 application backups
    ls -t app-backup-* | tail -n +4 | xargs rm -rf 2>/dev/null || true
    
    # Keep only last 5 database backups
    cd production-backups
    ls -t db_backup_*.sql | tail -n +6 | xargs rm -f 2>/dev/null || true
    
    log "✅ Cleanup completed"
}

# Main deployment process
main() {
    log "🚀 Starting AddyPin deployment at $DEPLOY_TIME"
    
    # Create log directory if it doesn't exist
    mkdir -p /var/log/addypin
    
    # Run deployment steps
    docker_cleanup
    pre_flight_checks
    backup_database
    backup_application
    deploy_new_version
    switch_version
    run_health_checks
    verify_performance
    cleanup_old_backups
    
    log "🎉 Deployment completed successfully!"
    log "📊 Final service status:"
    systemctl status addypin --no-pager -l >> "$LOG_FILE"
    
    echo "✅ Deployment log saved to: $LOG_FILE"
}

# Run main function
main "$@"