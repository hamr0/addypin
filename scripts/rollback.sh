#!/bin/bash

# AddyPin Rollback Script
# Quick rollback to previous working version

set -e

# Configuration
LOG_FILE="/var/log/addypin/rollback-$(date '+%Y%m%d_%H%M%S').log"
BACKUP_DIR="/opt/addypin"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# List available backups
list_backups() {
    echo "📋 Available backups:"
    echo "Application backups:"
    ls -la "$BACKUP_DIR"/app-backup-* 2>/dev/null | awk '{print "  " $9 " (" $6 " " $7 " " $8 ")"}' || echo "  No application backups found"
    
    echo
    echo "Database backups:"
    ls -la "$BACKUP_DIR"/production-backups/db_backup_*.sql 2>/dev/null | awk '{print "  " $9 " (" $6 " " $7 " " $8 ")"}' || echo "  No database backups found"
}

# Rollback application
rollback_application() {
    local backup_name=$1
    
    if [ -z "$backup_name" ]; then
        # Find the most recent backup
        backup_name=$(ls -t "$BACKUP_DIR"/app-backup-* 2>/dev/null | head -1)
        if [ -z "$backup_name" ]; then
            log "❌ No application backups found"
            return 1
        fi
        backup_name=$(basename "$backup_name")
    fi
    
    local full_backup_path="$BACKUP_DIR/$backup_name"
    
    if [ ! -d "$full_backup_path" ]; then
        log "❌ Backup not found: $full_backup_path"
        return 1
    fi
    
    log "🔄 Rolling back application to: $backup_name"
    
    # Stop service
    log "⏹️ Stopping AddyPin service..."
    systemctl stop addypin || {
        log "⚠️ Warning: Could not stop service gracefully"
    }
    
    # Create backup of current version (in case rollback fails)
    if [ -d "$BACKUP_DIR/app" ]; then
        log "📦 Backing up current version..."
        mv "$BACKUP_DIR/app" "$BACKUP_DIR/app-before-rollback-$(date '+%Y%m%d_%H%M%S')"
    fi
    
    # Restore backup
    log "📁 Restoring backup..."
    cp -r "$full_backup_path" "$BACKUP_DIR/app"
    
    # Set proper permissions
    log "🔧 Setting permissions..."
    chown -R addypin:addypin "$BACKUP_DIR/app"
    
    # Start service
    log "▶️ Starting AddyPin service..."
    systemctl start addypin || {
        log "❌ Failed to start service after rollback"
        return 1
    }
    
    # Wait for service to start
    sleep 10
    
    # Verify service is running
    if systemctl is-active --quiet addypin; then
        log "✅ Service started successfully"
    else
        log "❌ Service is not running after rollback"
        return 1
    fi
    
    return 0
}

# Rollback database
rollback_database() {
    local backup_name=$1
    
    if [ -z "$backup_name" ]; then
        # Find the most recent database backup
        backup_name=$(ls -t "$BACKUP_DIR"/production-backups/db_backup_*.sql 2>/dev/null | head -1)
        if [ -z "$backup_name" ]; then
            log "❌ No database backups found"
            return 1
        fi
    else
        backup_name="$BACKUP_DIR/production-backups/$backup_name"
    fi
    
    if [ ! -f "$backup_name" ]; then
        log "❌ Database backup not found: $backup_name"
        return 1
    fi
    
    log "💾 Rolling back database to: $(basename $backup_name)"
    
    # Create current database backup before rollback
    local emergency_backup="$BACKUP_DIR/production-backups/db_emergency_backup_$(date '+%Y%m%d_%H%M%S').sql"
    log "📦 Creating emergency backup of current database..."
    sudo -u postgres pg_dump addypin > "$emergency_backup" || {
        log "⚠️ Warning: Could not create emergency backup"
    }
    
    # Stop application to prevent database connections
    log "⏹️ Stopping application for database rollback..."
    systemctl stop addypin
    
    # Terminate existing connections
    log "🔌 Terminating existing database connections..."
    sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='addypin' AND pid <> pg_backend_pid();" 2>/dev/null || true
    
    # Drop and recreate database
    log "🗑️ Dropping current database..."
    sudo -u postgres dropdb addypin || {
        log "❌ Failed to drop database"
        systemctl start addypin
        return 1
    }
    
    log "🆕 Creating new database..."
    sudo -u postgres createdb addypin -O addypin || {
        log "❌ Failed to create database"
        return 1
    }
    
    # Restore from backup
    log "📥 Restoring database from backup..."
    sudo -u postgres psql addypin < "$backup_name" || {
        log "❌ Failed to restore database"
        return 1
    }
    
    # Start application
    log "▶️ Starting application after database rollback..."
    systemctl start addypin || {
        log "❌ Failed to start application after database rollback"
        return 1
    }
    
    log "✅ Database rollback completed successfully"
    return 0
}

# Quick health check after rollback
quick_health_check() {
    log "🏥 Running quick health check..."
    
    # Wait for service to fully start
    sleep 15
    
    # Check service status
    if ! systemctl is-active --quiet addypin; then
        log "❌ Service is not running"
        return 1
    fi
    
    # Check main endpoint
    if curl -f -s --max-time 10 https://addypin.com > /dev/null; then
        log "✅ Main endpoint is accessible"
    else
        log "❌ Main endpoint is not accessible"
        return 1
    fi
    
    # Check API endpoint
    if curl -f -s --max-time 10 https://addypin.com/api/stats > /dev/null; then
        log "✅ API endpoint is accessible"
    else
        log "⚠️ API endpoint is not accessible"
    fi
    
    log "✅ Basic health check passed"
    return 0
}

# Emergency rollback (both app and database)
emergency_rollback() {
    log "🚨 EMERGENCY ROLLBACK INITIATED"
    
    # Rollback application
    if rollback_application; then
        log "✅ Application rollback successful"
    else
        log "❌ Application rollback failed"
        return 1
    fi
    
    # Ask for database rollback confirmation
    echo
    echo "⚠️ Do you want to rollback the database as well? (y/N)"
    read -r response
    case $response in
        [yY][eE][sS]|[yY])
            if rollback_database; then
                log "✅ Database rollback successful"
            else
                log "❌ Database rollback failed"
                return 1
            fi
            ;;
        *)
            log "ℹ️ Database rollback skipped"
            ;;
    esac
    
    # Run health check
    if quick_health_check; then
        log "🎉 Emergency rollback completed successfully"
    else
        log "⚠️ Emergency rollback completed but health check failed"
        return 1
    fi
}

# Usage information
usage() {
    echo "AddyPin Rollback Script"
    echo "Usage: $0 [OPTION] [BACKUP_NAME]"
    echo
    echo "Options:"
    echo "  -l, --list              List available backups"
    echo "  -a, --app [BACKUP]      Rollback application only"
    echo "  -d, --database [BACKUP] Rollback database only"
    echo "  -e, --emergency         Emergency rollback (app + optional database)"
    echo "  -h, --help              Show this help"
    echo
    echo "Examples:"
    echo "  $0 -l                                    # List backups"
    echo "  $0 -a app-backup-20250820_143052        # Rollback to specific app backup"
    echo "  $0 -a                                    # Rollback to latest app backup"
    echo "  $0 -d db_backup_20250820_143052.sql     # Rollback to specific database backup"
    echo "  $0 -e                                    # Emergency rollback with prompts"
}

# Main function
main() {
    # Create log directory
    mkdir -p /var/log/addypin
    
    log "🔄 Rollback script started"
    
    case $1 in
        -l|--list)
            list_backups
            ;;
        -a|--app)
            if rollback_application "$2"; then
                quick_health_check
                log "🎉 Application rollback completed successfully"
            else
                log "❌ Application rollback failed"
                exit 1
            fi
            ;;
        -d|--database)
            if rollback_database "$2"; then
                quick_health_check
                log "🎉 Database rollback completed successfully"
            else
                log "❌ Database rollback failed"
                exit 1
            fi
            ;;
        -e|--emergency)
            emergency_rollback
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "❌ Invalid option. Use -h for help."
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"