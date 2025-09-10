#!/bin/bash
# AddyPin Backup Script
# Daily backup of databases and configurations

set -e
BACKUP_DIR="/opt/backups"
DATE=$(date '+%Y%m%d_%H%M%S')
LOG_FILE="/var/log/addypin-backup.log"

# Create backup directory
mkdir -p "$BACKUP_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "=== Starting AddyPin Backup Process ==="

# 1. Database Backups
log "=== Database Backup ==="

# Production database backup
log "Backing up production database..."
docker exec addypin-postgres pg_dump -U postgres -d addypin > "$BACKUP_DIR/addypin_prod_${DATE}.sql"
if [ $? -eq 0 ]; then
    log "✅ Production database backed up successfully"
else
    log "❌ Production database backup failed"
    exit 1
fi

# Staging database backup
log "Backing up staging database..."
docker exec addypin-postgres pg_dump -U postgres -d addypin_staging > "$BACKUP_DIR/addypin_staging_${DATE}.sql"
if [ $? -eq 0 ]; then
    log "✅ Staging database backed up successfully"
else
    log "❌ Staging database backup failed"
    exit 1
fi

# 2. Configuration Backup
log "=== Configuration Backup ==="

# Create config backup directory for this date
CONFIG_BACKUP_DIR="$BACKUP_DIR/config_${DATE}"
mkdir -p "$CONFIG_BACKUP_DIR"

# Backup Docker Compose files
cp /opt/addypin/docker-compose.yml "$CONFIG_BACKUP_DIR/docker-compose-prod.yml"
cp /opt/addypin-staging/docker-compose.yml "$CONFIG_BACKUP_DIR/docker-compose-staging.yml"

# Backup Nginx configuration
cp -r /etc/nginx/conf.d "$CONFIG_BACKUP_DIR/nginx-conf.d"
cp /etc/nginx/nginx.conf "$CONFIG_BACKUP_DIR/nginx.conf"

# Backup SSL certificates (without private keys for security)
mkdir -p "$CONFIG_BACKUP_DIR/ssl"
cp /etc/letsencrypt/live/addypin.com-0001/fullchain.pem "$CONFIG_BACKUP_DIR/ssl/" 2>/dev/null || log "SSL cert backup skipped (not found)"

log "✅ Configuration files backed up"

# 3. Create compressed archive
log "=== Creating Compressed Archive ==="
cd "$BACKUP_DIR"
tar -czf "addypin_backup_${DATE}.tar.gz" addypin_prod_${DATE}.sql addypin_staging_${DATE}.sql config_${DATE}/
if [ $? -eq 0 ]; then
    log "✅ Compressed backup archive created: addypin_backup_${DATE}.tar.gz"
    
    # Remove individual files after successful compression
    rm -f addypin_prod_${DATE}.sql addypin_staging_${DATE}.sql
    rm -rf config_${DATE}/
else
    log "❌ Failed to create compressed archive"
    exit 1
fi

# 4. Cleanup old backups (keep last 7 days)
log "=== Cleanup Old Backups ==="
find "$BACKUP_DIR" -name "addypin_backup_*.tar.gz" -type f -mtime +7 -delete
REMAINING_BACKUPS=$(find "$BACKUP_DIR" -name "addypin_backup_*.tar.gz" -type f | wc -l)
log "✅ Cleanup completed. $REMAINING_BACKUPS backup files remaining"

# 5. Backup size and disk space check
log "=== Backup Statistics ==="
BACKUP_SIZE=$(du -sh "$BACKUP_DIR/addypin_backup_${DATE}.tar.gz" | cut -f1)
TOTAL_BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
DISK_FREE=$(df -h "$BACKUP_DIR" | awk 'NR==2 {print $4}')

log "Current backup size: $BACKUP_SIZE"
log "Total backup directory size: $TOTAL_BACKUP_SIZE" 
log "Disk space available: $DISK_FREE"

# 6. Optional: Upload to remote storage (uncomment and configure)
log "=== Remote Storage Upload ==="
# Uncomment and configure your preferred backup storage:
# 
# # AWS S3 Example:
# aws s3 cp "$BACKUP_DIR/addypin_backup_${DATE}.tar.gz" s3://your-backup-bucket/addypin/
#
# # SCP Example:
# scp "$BACKUP_DIR/addypin_backup_${DATE}.tar.gz" user@backup-server:/backups/addypin/
#
# # Rsync Example:
# rsync -av "$BACKUP_DIR/addypin_backup_${DATE}.tar.gz" user@backup-server:/backups/addypin/

log "Remote storage upload skipped (not configured)"

# 7. Verify backup integrity
log "=== Backup Verification ==="
if tar -tzf "$BACKUP_DIR/addypin_backup_${DATE}.tar.gz" > /dev/null; then
    log "✅ Backup archive integrity verified"
else
    log "❌ Backup archive integrity check failed"
    exit 1
fi

log "=== Backup Process Completed Successfully ==="
log "Backup location: $BACKUP_DIR/addypin_backup_${DATE}.tar.gz"
log "Backup size: $BACKUP_SIZE"