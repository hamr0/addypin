#!/bin/bash

# AddyPin VPS Complete Backup Script
# Creates comprehensive backup with immutable protection
# Author: Replit Agent
# Date: $(date '+%Y-%m-%d')

set -euo pipefail

# Configuration
BACKUP_ROOT="/opt/addypin/backups"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_DIR="${BACKUP_ROOT}/${TIMESTAMP}"
IMMUTABLE_BACKUP_DIR="/opt/addypin/config-backup-immutable"
LOG_FILE="${BACKUP_ROOT}/backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR $(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARN $(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO $(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Create backup directories
create_directories() {
    log "Creating backup directories..."
    
    # Create main backup directory
    mkdir -p "$BACKUP_DIR"
    mkdir -p "${BACKUP_DIR}/configs"
    mkdir -p "${BACKUP_DIR}/database"
    mkdir -p "${BACKUP_DIR}/nginx"
    mkdir -p "${BACKUP_DIR}/docker"
    mkdir -p "${BACKUP_DIR}/app-files"
    mkdir -p "${BACKUP_DIR}/firewall"
    mkdir -p "${BACKUP_DIR}/systemd"
    mkdir -p "${BACKUP_DIR}/logs"
    
    # Create immutable backup directory if it doesn't exist
    if [[ ! -d "$IMMUTABLE_BACKUP_DIR" ]]; then
        mkdir -p "$IMMUTABLE_BACKUP_DIR"
        log "Created immutable backup directory: $IMMUTABLE_BACKUP_DIR"
    fi
    
    # Ensure backup root exists
    mkdir -p "$BACKUP_ROOT"
}

# Backup environment files and configurations
backup_configs() {
    log "Backing up configuration files..."
    
    # AddyPin configuration files
    if [[ -f "/opt/addypin/.env.staging" ]]; then
        cp "/opt/addypin/.env.staging" "${BACKUP_DIR}/configs/"
        log "✓ Backed up .env.staging"
    else
        warn "⚠ /opt/addypin/.env.staging not found"
    fi
    
    if [[ -f "/opt/addypin/.env.production" ]]; then
        cp "/opt/addypin/.env.production" "${BACKUP_DIR}/configs/"
        log "✓ Backed up .env.production"
    fi
    
    # Docker configurations
    if [[ -f "/opt/addypin/docker-compose.staging.yml" ]]; then
        cp "/opt/addypin/docker-compose.staging.yml" "${BACKUP_DIR}/docker/"
        log "✓ Backed up docker-compose.staging.yml"
    else
        warn "⚠ docker-compose.staging.yml not found"
    fi
    
    if [[ -f "/opt/addypin/docker-compose.yml" ]]; then
        cp "/opt/addypin/docker-compose.yml" "${BACKUP_DIR}/docker/"
        log "✓ Backed up docker-compose.yml"
    fi
    
    if [[ -f "/opt/addypin/docker-compose.production.yml" ]]; then
        cp "/opt/addypin/docker-compose.production.yml" "${BACKUP_DIR}/docker/"
        log "✓ Backed up docker-compose.production.yml"
    fi
    
    # Deployment scripts
    if [[ -f "/opt/addypin/deploy-staging.sh" ]]; then
        cp "/opt/addypin/deploy-staging.sh" "${BACKUP_DIR}/configs/"
        log "✓ Backed up deploy-staging.sh"
    else
        warn "⚠ deploy-staging.sh not found"
    fi
    
    if [[ -f "/opt/addypin/deploy.sh" ]]; then
        cp "/opt/addypin/deploy.sh" "${BACKUP_DIR}/configs/"
        log "✓ Backed up deploy.sh"
    fi
    
    # Backup entire /opt/addypin directory structure
    if [[ -d "/opt/addypin" ]]; then
        rsync -av --exclude='backups' /opt/addypin/ "${BACKUP_DIR}/app-files/opt-addypin/"
        log "✓ Backed up complete /opt/addypin directory"
    fi
}

# Backup nginx configurations
backup_nginx() {
    log "Backing up nginx configurations..."
    
    # Main nginx config
    if [[ -f "/etc/nginx/nginx.conf" ]]; then
        cp "/etc/nginx/nginx.conf" "${BACKUP_DIR}/nginx/"
        log "✓ Backed up nginx.conf"
    fi
    
    # Sites available and enabled
    if [[ -d "/etc/nginx/sites-available" ]]; then
        cp -r "/etc/nginx/sites-available" "${BACKUP_DIR}/nginx/"
        log "✓ Backed up sites-available"
    fi
    
    if [[ -d "/etc/nginx/sites-enabled" ]]; then
        cp -r "/etc/nginx/sites-enabled" "${BACKUP_DIR}/nginx/"
        log "✓ Backed up sites-enabled"
    fi
    
    # Conf.d directory
    if [[ -d "/etc/nginx/conf.d" ]]; then
        cp -r "/etc/nginx/conf.d" "${BACKUP_DIR}/nginx/"
        log "✓ Backed up conf.d"
    fi
    
    # AddyPin specific nginx configs
    if [[ -f "/etc/nginx/conf.d/addypin-staging.conf" ]]; then
        cp "/etc/nginx/conf.d/addypin-staging.conf" "${BACKUP_DIR}/nginx/addypin-staging.conf"
        log "✓ Backed up addypin-staging.conf"
    else
        warn "⚠ addypin-staging.conf not found"
    fi
    
    if [[ -f "/etc/nginx/conf.d/addypin.conf" ]]; then
        cp "/etc/nginx/conf.d/addypin.conf" "${BACKUP_DIR}/nginx/addypin.conf"
        log "✓ Backed up addypin.conf"
    fi
}

# Backup database
backup_database() {
    log "Backing up PostgreSQL database..."
    
    # Check if PostgreSQL is running
    if systemctl is-active --quiet postgresql; then
        log "PostgreSQL is running, creating database backup..."
        
        # Create database backup
        sudo -u postgres pg_dumpall > "${BACKUP_DIR}/database/postgres_full_backup_${TIMESTAMP}.sql"
        log "✓ Created full PostgreSQL backup"
        
        # Individual database backups if addypin databases exist
        for db in addypin addypin_staging; do
            if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$db"; then
                sudo -u postgres pg_dump "$db" > "${BACKUP_DIR}/database/${db}_backup_${TIMESTAMP}.sql"
                log "✓ Created backup for database: $db"
            fi
        done
    else
        warn "⚠ PostgreSQL is not running, skipping database backup"
    fi
}

# Backup firewall configuration
backup_firewall() {
    log "Backing up firewall configuration..."
    
    # UFW rules
    if command -v ufw >/dev/null 2>&1; then
        ufw status verbose > "${BACKUP_DIR}/firewall/ufw_status.txt"
        cp /etc/ufw/user.rules "${BACKUP_DIR}/firewall/" 2>/dev/null || true
        cp /etc/ufw/user6.rules "${BACKUP_DIR}/firewall/" 2>/dev/null || true
        log "✓ Backed up UFW configuration"
    fi
    
    # iptables rules
    iptables-save > "${BACKUP_DIR}/firewall/iptables_rules.txt"
    ip6tables-save > "${BACKUP_DIR}/firewall/ip6tables_rules.txt"
    log "✓ Backed up iptables rules"
}

# Backup systemd services
backup_systemd() {
    log "Backing up systemd services..."
    
    # Look for AddyPin related services
    for service in addypin addypin-staging docker nginx postgresql; do
        if systemctl list-unit-files | grep -q "^${service}"; then
            systemctl show "$service" > "${BACKUP_DIR}/systemd/${service}_service.txt"
            log "✓ Backed up systemd service: $service"
        fi
    done
    
    # Custom service files
    find /etc/systemd/system -name "*addypin*" -type f -exec cp {} "${BACKUP_DIR}/systemd/" \; 2>/dev/null || true
}

# Backup application files
backup_app_files() {
    log "Backing up application files..."
    
    # Web root files
    if [[ -d "/var/www/addypin-staging" ]]; then
        rsync -av "/var/www/addypin-staging/" "${BACKUP_DIR}/app-files/www-staging/"
        log "✓ Backed up /var/www/addypin-staging"
    fi
    
    if [[ -d "/var/www/addypin" ]]; then
        rsync -av "/var/www/addypin/" "${BACKUP_DIR}/app-files/www-production/"
        log "✓ Backed up /var/www/addypin"
    fi
    
    if [[ -d "/var/www/html" ]]; then
        rsync -av "/var/www/html/" "${BACKUP_DIR}/app-files/www-html/"
        log "✓ Backed up /var/www/html"
    fi
}

# Backup logs
backup_logs() {
    log "Backing up important logs..."
    
    # System logs
    journalctl --since="7 days ago" > "${BACKUP_DIR}/logs/journal_7days.log" 2>/dev/null || true
    
    # Nginx logs
    if [[ -d "/var/log/nginx" ]]; then
        cp /var/log/nginx/*.log "${BACKUP_DIR}/logs/" 2>/dev/null || true
        log "✓ Backed up nginx logs"
    fi
    
    # Docker logs if docker is installed
    if command -v docker >/dev/null 2>&1; then
        docker ps -a > "${BACKUP_DIR}/logs/docker_containers.txt" 2>/dev/null || true
        docker images > "${BACKUP_DIR}/logs/docker_images.txt" 2>/dev/null || true
        log "✓ Backed up docker information"
    fi
}

# Create environment variables backup with critical secrets
backup_environment_vars() {
    log "Creating environment variables backup..."
    
    cat > "${BACKUP_DIR}/configs/critical_env_vars.txt" << 'EOF'
# Critical Environment Variables for AddyPin
# RESTORE THESE IF LOST!

# Email Service
RESEND_API_KEY=re_YEEpxspy_2zkWUtuc3aVw4fcbYCFqD2mK

# Authentication
CLERK_SECRET_KEY=sk_test_0EIjIoMe694NJvxKoiMPwexmUsVlIo55ILP6bv5c8h

# Database (will need to be updated for production)
DATABASE_URL=postgresql://username:password@localhost:5432/addypin

# Application Settings
NODE_ENV=staging
PORT=3000
STAGING_PORT=8080

# Add other environment variables as needed
EOF
    
    log "✓ Created critical environment variables backup"
    warn "⚠ Remember to secure this file - it contains sensitive data!"
}

# Create summary file
create_summary() {
    log "Creating backup summary..."
    
    cat > "${BACKUP_DIR}/BACKUP_SUMMARY.txt" << EOF
AddyPin VPS Backup Summary
========================
Backup Date: $(date)
Backup Location: ${BACKUP_DIR}
Hostname: $(hostname)
OS: $(lsb_release -d 2>/dev/null | cut -f2 || echo "Unknown")

Backup Contents:
---------------
✓ Configuration files (/opt/addypin/*)
✓ Environment variables (.env.staging, .env.production)
✓ Docker configurations (docker-compose.*.yml)
✓ Nginx configurations (/etc/nginx/*)
✓ PostgreSQL database dump
✓ Firewall rules (UFW/iptables)
✓ Systemd services
✓ Web application files (/var/www/*)
✓ System logs (7 days)
✓ Critical environment variables

Restore Instructions:
-------------------
1. Copy environment files: sudo cp configs/.env.* /opt/addypin/
2. Restore nginx config: sudo cp nginx/* /etc/nginx/conf.d/
3. Restore database: sudo -u postgres psql < database/postgres_full_backup_*.sql
4. Copy app files: sudo cp -r app-files/www-*/ /var/www/
5. Restart services: sudo systemctl restart nginx postgresql docker

Security Notice:
---------------
This backup contains sensitive information including API keys and database passwords.
Store securely and restrict access appropriately.

EOF
    
    log "✓ Created backup summary"
}

# Set immutable protection
set_immutable_protection() {
    log "Setting up immutable protection..."
    
    # Copy critical files to immutable directory
    cp -r "${BACKUP_DIR}/configs" "$IMMUTABLE_BACKUP_DIR/"
    cp -r "${BACKUP_DIR}/nginx" "$IMMUTABLE_BACKUP_DIR/"
    cp -r "${BACKUP_DIR}/docker" "$IMMUTABLE_BACKUP_DIR/"
    
    # Set immutable attributes (requires ext2/3/4 filesystem)
    if command -v chattr >/dev/null 2>&1; then
        chattr +i "$IMMUTABLE_BACKUP_DIR" 2>/dev/null || warn "⚠ Could not set immutable flag on backup directory"
        find "$IMMUTABLE_BACKUP_DIR" -type f -exec chattr +i {} \; 2>/dev/null || warn "⚠ Could not set immutable flags on backup files"
        log "✓ Set immutable protection on backup files"
    else
        warn "⚠ chattr command not available, cannot set immutable protection"
    fi
    
    # Set restrictive permissions
    chmod 700 "$IMMUTABLE_BACKUP_DIR"
    find "$IMMUTABLE_BACKUP_DIR" -type f -exec chmod 600 {} \;
    find "$IMMUTABLE_BACKUP_DIR" -type d -exec chmod 700 {} \;
    log "✓ Set restrictive permissions on backup directory"
}

# Cleanup old backups (keep last 7)
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # Keep only the 7 most recent backups
    cd "$BACKUP_ROOT"
    ls -1t | tail -n +8 | xargs -r rm -rf
    log "✓ Cleaned up old backups (keeping 7 most recent)"
}

# Main execution
main() {
    log "Starting AddyPin VPS Complete Backup..."
    
    check_root
    create_directories
    backup_configs
    backup_nginx
    backup_database
    backup_firewall
    backup_systemd
    backup_app_files
    backup_logs
    backup_environment_vars
    create_summary
    set_immutable_protection
    cleanup_old_backups
    
    # Final summary
    log "✅ Backup completed successfully!"
    info "📁 Backup location: ${BACKUP_DIR}"
    info "🔒 Immutable backup: ${IMMUTABLE_BACKUP_DIR}"
    info "📋 Summary: ${BACKUP_DIR}/BACKUP_SUMMARY.txt"
    
    # Show disk usage
    echo ""
    info "Backup disk usage:"
    du -sh "$BACKUP_DIR"
    du -sh "$IMMUTABLE_BACKUP_DIR"
    
    echo ""
    log "🎉 All done! Your VPS configuration is safely backed up."
}

# Run main function
main "$@"