#!/bin/bash

# AddyPin Foundation Backup Script
# Creates comprehensive backups of critical infrastructure files
# Usage: ./backup-foundation.sh [--dry-run] [--golden] [--force] [--auto]

set -e

# SECURITY: Enforce secure permissions for all created files and directories
# umask 077 ensures: directories = 700 (rwx------), files = 600 (rw-------)
umask 077

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
DRY_RUN=false
GOLDEN_MODE=false
FORCE_MODE=false
AUTO_MODE=false
BIWEEKLY_MODE=false

# Centralized logging setup
LOGS_DIR="$BACKUP_ROOT/logs"
LOG_FILE="$LOGS_DIR/backup_${TIMESTAMP}.log"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --golden)
            GOLDEN_MODE=true
            shift
            ;;
        --force)
            FORCE_MODE=true
            shift
            ;;
        --auto)
            AUTO_MODE=true
            FORCE_MODE=true  # Auto mode always forces to avoid prompts
            shift
            ;;
        --biweekly)
            BIWEEKLY_MODE=true
            shift
            ;;
        -h|--help)
            echo "AddyPin Foundation Backup Script"
            echo "Usage: $0 [--dry-run] [--golden] [--force] [--auto]"
            echo ""
            echo "Options:"
            echo "  --dry-run    Show what would be backed up without actually copying files"
            echo "  --golden     Create golden backup (immutable reference)"
            echo "  --force      Overwrite existing backups without confirmation"
            echo "  --auto       Automated mode with email notifications (implies --force)"
            echo "  --biweekly   Only run if current week is even (for bi-weekly automation)"
            echo "  --help       Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Banner (suppress in auto mode for cleaner logs)
if [ "$AUTO_MODE" = false ]; then
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════╗"
    echo "║           🏗️  AddyPin Foundation Backup      ║"
    echo "║              Infrastructure Preservation     ║"
    echo "║                                              ║"
    echo "║ 🔒 SECURITY: Protected with 700/600 perms   ║"
    echo "╚══════════════════════════════════════════════╝"
    echo -e "${NC}"
else
    echo "[$(date)] Starting automated AddyPin Foundation Backup..."
fi

# Check bi-weekly scheduling if enabled
if [ "$BIWEEKLY_MODE" = true ]; then
    current_week=$(date +%W)
    is_even_week=$((current_week % 2))
    
    if [ $is_even_week -ne 0 ]; then
        echo "[$(date)] Skipping backup - Week $current_week is odd (bi-weekly mode)"
        if [ "$AUTO_MODE" = true ]; then
            # Log the skip reason but don't send email notification
            echo "[$(date)] Backup skipped due to bi-weekly scheduling"
        fi
        exit 0
    else
        echo "[$(date)] Running backup - Week $current_week is even (bi-weekly mode)"
    fi
fi

# Show configuration
if [ "$AUTO_MODE" = false ]; then
    echo -e "${CYAN}📋 Backup Configuration:${NC}"
    echo "   Mode: $([ "$GOLDEN_MODE" = true ] && echo "Golden (Immutable)" || echo "Versioned ($TIMESTAMP)")"
    echo "   Dry Run: $([ "$DRY_RUN" = true ] && echo "YES" || echo "NO")"
    echo "   Force: $([ "$FORCE_MODE" = true ] && echo "YES" || echo "NO")"
    echo "   Auto: $([ "$AUTO_MODE" = true ] && echo "YES" || echo "NO")"
    echo "   Bi-weekly: $([ "$BIWEEKLY_MODE" = true ] && echo "YES" || echo "NO")"
    echo "   Root: $BACKUP_ROOT"
    echo ""
fi

# Set backup destination
if [ "$GOLDEN_MODE" = true ]; then
    BACKUP_DIR="$BACKUP_ROOT/golden"
    BACKUP_NAME="Golden Backup"
else
    BACKUP_DIR="$BACKUP_ROOT/versioned/$TIMESTAMP"
    BACKUP_NAME="Versioned Backup $TIMESTAMP"
fi

# Critical infrastructure files mapping
declare -A INFRASTRUCTURE_FILES=(
    # Docker Configurations (Critical)
    ["/opt/addypin/docker-compose.yml"]="docker/production-docker-compose.yml"
    ["/opt/addypin-staging/docker-compose.yml"]="docker/staging-docker-compose.yml"
    
    # Environment Files (Critical: Contains API keys)
    ["/opt/addypin-staging/.env"]="environment/staging.env"
    
    # System Configuration (Critical)
    ["/var/spool/cron/root"]="system/root-crontab"
    
    # Monitoring Scripts (High Priority) - ENHANCED LIVE MONITORING
    ["/opt/addypin/scripts/health-check.sh"]="monitoring/health-check.sh"
    ["/opt/addypin/scripts/enhanced-health-check.sh"]="monitoring/enhanced-health-check.sh"
    ["/usr/local/bin/health"]="monitoring/health-command-symlink"
    ["/opt/addypin/universal-health.sh"]="monitoring/universal-health.sh"
    ["/opt/addypin/ssh-health.sh"]="monitoring/ssh-health.sh"
    ["/opt/addypin/enhanced-health-check-msmtp.sh"]="monitoring/enhanced-health-check-msmtp.sh"
    
    # Backup System Scripts (Critical: Backup the backup system itself)
    ["/opt/addypin-foundation-backup/scripts/backup-foundation.sh"]="backup-system/backup-foundation.sh"
    ["/opt/addypin-foundation-backup/scripts/setup-automated-backups.sh"]="backup-system/setup-automated-backups.sh"
    ["/opt/addypin-foundation-backup/scripts/backup-status-monitor.sh"]="backup-system/backup-status-monitor.sh"
    ["/opt/addypin-foundation-backup/scripts/restore-foundation.sh"]="backup-system/restore-foundation.sh"
    
    # Nginx Configuration (High Priority)
    ["/etc/nginx/nginx.conf"]="nginx/nginx.conf"
    ["/etc/nginx/conf.d/addypin.conf"]="nginx/addypin.conf"
    
    # PostgreSQL Configuration (Medium Priority - may not exist on all systems)
    ["/var/lib/pgsql/data/postgresql.conf"]="postgresql/postgresql.conf"
    ["/var/lib/pgsql/data/pg_hba.conf"]="postgresql/pg_hba.conf"
    ["/var/lib/pgsql/data/ssl/server.crt"]="postgresql/ssl/server.crt"
    ["/var/lib/pgsql/data/ssl/server.key"]="postgresql/ssl/server.key"
    
    # Logrotate Configuration (Low Priority)
    ["/etc/logrotate.d/addypin-health-check"]="system/logrotate-addypin-health-check"
)

# File priority classification for better reporting
declare -A FILE_PRIORITIES=(
    # Critical files (must exist in production)
    ["/opt/addypin/docker-compose.yml"]="CRITICAL"
    ["/opt/addypin-staging/docker-compose.yml"]="CRITICAL"
    ["/opt/addypin-staging/.env"]="CRITICAL"
    ["/var/spool/cron/root"]="CRITICAL"
    
    # High priority files (should exist) - ENHANCED LIVE MONITORING
    ["/opt/addypin/scripts/health-check.sh"]="HIGH"
    ["/opt/addypin/scripts/enhanced-health-check.sh"]="HIGH"
    ["/usr/local/bin/health"]="CRITICAL"
    ["/opt/addypin/universal-health.sh"]="CRITICAL"
    ["/opt/addypin/ssh-health.sh"]="HIGH"
    ["/opt/addypin/enhanced-health-check-msmtp.sh"]="CRITICAL"
    
    # Backup System Scripts (Critical: Must preserve backup capability)
    ["/opt/addypin-foundation-backup/scripts/backup-foundation.sh"]="CRITICAL"
    ["/opt/addypin-foundation-backup/scripts/setup-automated-backups.sh"]="CRITICAL"
    ["/opt/addypin-foundation-backup/scripts/backup-status-monitor.sh"]="HIGH"
    ["/opt/addypin-foundation-backup/scripts/restore-foundation.sh"]="CRITICAL"
    ["/etc/nginx/nginx.conf"]="HIGH"
    ["/etc/nginx/conf.d/addypin.conf"]="HIGH"
    
    # Medium priority files (may or may not exist)
    ["/var/lib/pgsql/data/postgresql.conf"]="MEDIUM"
    ["/var/lib/pgsql/data/pg_hba.conf"]="MEDIUM"
    ["/var/lib/pgsql/data/ssl/server.crt"]="MEDIUM"
    ["/var/lib/pgsql/data/ssl/server.key"]="MEDIUM"
    
    # Low priority files (optional)
    ["/etc/logrotate.d/addypin-health-check"]="LOW"
)

# SSL Certificate paths (Let's Encrypt)
SSL_CERT_PATHS=(
    "/etc/letsencrypt/live/addypin.com"
    "/etc/letsencrypt/live/www.addypin.com"
    "/etc/letsencrypt/live/staging.addypin.com"
)

# Statistics counters
TOTAL_FILES=0
COPIED_FILES=0
MISSING_FILES=0
ERROR_FILES=0
MISSING_CRITICAL=0
MISSING_HIGH=0
MISSING_MEDIUM=0
MISSING_LOW=0

# Email notification settings
NOTIFY_EMAIL="avoidaccess@gmail.com"
MSMTP_ALERT_SCRIPT="/opt/addypin/scripts/send-health-alert.sh"

# Function: Send email notification via MSMTP
send_backup_notification() {
    local status="$1"  # success, error, warning
    local summary="$2"
    local details="$3"
    
    # Only send emails in auto mode
    if [ "$AUTO_MODE" = false ]; then
        return 0
    fi
    
    log_message "Sending email notification via MSMTP: $status - $summary"
    
    local subject=""
    local alert_type=""
    
    case "$status" in
        "success")
            subject="✅ AddyPin Backup Successful"
            alert_type="backup"
            ;;
        "warning")
            subject="⚠️ AddyPin Backup Warning"
            alert_type="warning"
            ;;
        "error")
            subject="❌ AddyPin Backup Failed"
            alert_type="critical"
            ;;
    esac
    
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local backup_size=$(calculate_backup_size)
    
    # Create backup message
    local backup_message="$subject

Backup Details:
- Status: $summary
- Completed: $timestamp
- Backup Size: $backup_size
- Mode: $([ "$GOLDEN_MODE" = true ] && echo "Golden" || echo "Versioned")

File Statistics:
- Total Files: $TOTAL_FILES
- Copied Successfully: $COPIED_FILES  
- Missing Files: $MISSING_FILES
- Error Files: $ERROR_FILES

Details:
$details

AddyPin Foundation Backup System
Generated automatically every other Sunday at 2:00 AM"
    
    # Send email using existing MSMTP alert system
    if [ -f "$MSMTP_ALERT_SCRIPT" ]; then
        "$MSMTP_ALERT_SCRIPT" "$alert_type" "$backup_message"
        log_message "Email notification sent successfully via MSMTP to $NOTIFY_EMAIL"
    else
        # Fallback: use msmtp directly
        if command -v msmtp >/dev/null 2>&1; then
            echo -e "Subject: $subject\nTo: $NOTIFY_EMAIL\n\n$backup_message" | msmtp "$NOTIFY_EMAIL"
            log_message "Email notification sent via direct MSMTP to $NOTIFY_EMAIL"
        else
            log_message "WARNING: Email notification skipped - MSMTP not available"
        fi
    fi
}

# Function: Initialize logging system
init_logging() {
    # Create logs directory with secure permissions
    if [ "$DRY_RUN" = false ]; then
        mkdir -m 700 -p "$LOGS_DIR"
        # Create log file with secure permissions
        touch "$LOG_FILE"
        chmod 600 "$LOG_FILE"
        
        # Write log header
        {
            echo "==============================================="
            echo "AddyPin Foundation Backup Log"
            echo "Started: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
            echo "Mode: $([ "$GOLDEN_MODE" = true ] && echo "Golden" || echo "Versioned")"
            echo "Dry Run: $([ "$DRY_RUN" = true ] && echo "YES" || echo "NO")"
            echo "==============================================="
        } > "$LOG_FILE"
    fi
}

# Function: Log message to both console and file
log_message() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Write to log file if not dry-run
    if [ "$DRY_RUN" = false ] && [ -f "$LOG_FILE" ]; then
        echo "[$timestamp] $message" >> "$LOG_FILE"
    fi
}

# Function: Print progress with indicators
print_progress() {
    local message="$1"
    local status="$2"
    local custom_color="$3"
    
    # Use custom color if provided
    local color=""
    case "$status" in
        "start")
            echo -e "${CYAN}🔄 $message${NC}"
            ;;
        "success")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "warning")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "error")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "info")
            echo -e "${PURPLE}ℹ️  $message${NC}"
            ;;
    esac
    
    # Also log to file
    log_message "[$status] $message"
}

# Function: Check if running as root or with proper permissions
check_permissions() {
    print_progress "Checking permissions..." "start"
    
    if [ "$EUID" -ne 0 ] && [ "$DRY_RUN" = false ]; then
        print_progress "This script requires root access to read system files" "warning"
        if [ "$AUTO_MODE" = false ]; then
            print_progress "Run with: sudo $0 or use --dry-run to test" "info"
            read -p "Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        else
            print_progress "Auto mode: Continuing without root (some files may be inaccessible)" "warning"
        fi
    fi
    
    print_progress "Permission check completed" "success"
}

# Function: Create backup directory structure
create_backup_structure() {
    print_progress "Creating backup directory structure..." "start"
    
    local dirs=(
        "$BACKUP_DIR"
        "$BACKUP_DIR/postgresql"
        "$BACKUP_DIR/postgresql/ssl"
        "$BACKUP_DIR/docker"
        "$BACKUP_DIR/environment"
        "$BACKUP_DIR/monitoring"
        "$BACKUP_DIR/backup-system"
        "$BACKUP_DIR/nginx"
        "$BACKUP_DIR/ssl"
        "$BACKUP_DIR/system"
    )
    
    for dir in "${dirs[@]}"; do
        if [ "$DRY_RUN" = false ]; then
            mkdir -m 700 -p "$dir"
        fi
        print_progress "Created: $dir" "info"
    done
    
    print_progress "Directory structure created" "success"
}

# Function: Calculate backup size
calculate_backup_size() {
    if [ "$DRY_RUN" = true ]; then
        echo "N/A (dry run)"
    elif [ -d "$BACKUP_DIR" ]; then
        du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "Unknown"
    else
        echo "0B"
    fi
}

# Function: Copy file with error handling
copy_file() {
    local source="$1"
    local dest="$2"
    local priority="$3"
    
    # Check if source file exists
    if [ ! -f "$source" ]; then
        print_progress "Missing [$priority]: $(basename "$source") ($source)" "warning"
        ((MISSING_FILES++))
        
        # Count missing files by priority
        case "$priority" in
            "CRITICAL") ((MISSING_CRITICAL++)) ;;
            "HIGH") ((MISSING_HIGH++)) ;;
            "MEDIUM") ((MISSING_MEDIUM++)) ;;
            "LOW") ((MISSING_LOW++)) ;;
        esac
        
        log_message "MISSING [$priority]: $source"
        return 1
    fi
    
    # Create destination directory with secure permissions
    local dest_dir=$(dirname "$dest")
    if [ "$DRY_RUN" = false ]; then
        mkdir -m 700 -p "$dest_dir"
    fi
    
    if [ "$DRY_RUN" = true ]; then
        print_progress "Would copy [$priority]: $(basename "$source")" "info"
    else
        # Copy file
        if cp "$source" "$dest" 2>/dev/null; then
            # Set secure permissions
            chmod 600 "$dest"
            print_progress "Copied [$priority]: $(basename "$source")" "success"
            ((COPIED_FILES++))
            log_message "COPIED [$priority]: $source -> $dest"
        else
            print_progress "Failed to copy [$priority]: $(basename "$source")" "error"
            ((ERROR_FILES++))
            log_message "ERROR [$priority]: Failed to copy $source -> $dest"
            return 1
        fi
    fi
    
    ((TOTAL_FILES++))
    return 0
}

# Function: Backup SSL certificates
backup_ssl_certificates() {
    print_progress "Backing up SSL certificates..." "start"
    
    for cert_path in "${SSL_CERT_PATHS[@]}"; do
        if [ -d "$cert_path" ]; then
            local domain=$(basename "$cert_path")
            local dest_path="$BACKUP_DIR/ssl/$domain"
            
            if [ "$DRY_RUN" = false ]; then
                mkdir -m 700 -p "$dest_path"
                if cp -r "$cert_path"/* "$dest_path/" 2>/dev/null; then
                    chmod -R 600 "$dest_path"/*
                    print_progress "SSL certs for $domain" "success"
                    log_message "COPIED SSL: $cert_path -> $dest_path"
                else
                    print_progress "Failed to copy SSL certs for $domain" "error"
                    log_message "ERROR SSL: Failed to copy $cert_path"
                fi
            else
                print_progress "Would backup SSL certs for $domain" "info"
            fi
        else
            print_progress "SSL cert path not found (optional): $cert_path" "info"
        fi
    done
}

# Function: Create backup manifest
create_backup_manifest() {
    print_progress "Creating backup manifest..." "start"
    
    local manifest_file="$BACKUP_DIR/BACKUP_MANIFEST.txt"
    
    if [ "$DRY_RUN" = false ]; then
        cat > "$manifest_file" << EOF
AddyPin Foundation Backup Manifest
======================================
Backup ID: $TIMESTAMP
Date: $(date -u '+%Y-%m-%d %H:%M:%S UTC')
Mode: $([ "$GOLDEN_MODE" = true ] && echo "Golden" || echo "Versioned")
Host: $(hostname)

File Statistics:
Total Files: $TOTAL_FILES
Copied Successfully: $COPIED_FILES
Missing Files: $MISSING_FILES
Error Files: $ERROR_FILES

Missing Files Breakdown:
CRITICAL: $MISSING_CRITICAL files
HIGH: $MISSING_HIGH files
MEDIUM: $MISSING_MEDIUM files
LOW: $MISSING_LOW files

Backup Size: $(calculate_backup_size)
Location: $BACKUP_DIR

Files Included:
EOF
        
        # Add file list to manifest
        for file_path in "${!INFRASTRUCTURE_FILES[@]}"; do
            local dest_file="${INFRASTRUCTURE_FILES[$file_path]}"
            local priority="${FILE_PRIORITIES[$file_path]}"
            if [ -f "$file_path" ]; then
                echo "✅ [$priority] $file_path -> $dest_file" >> "$manifest_file"
            else
                echo "❌ [$priority] MISSING: $file_path" >> "$manifest_file"
            fi
        done
        
        echo "" >> "$manifest_file"
        echo "All files and directories are protected with 700/600 permissions." >> "$manifest_file"
        echo "Only root user can access backup contents." >> "$manifest_file"
        
        chmod 600 "$manifest_file"
    fi
    
    print_progress "Backup manifest created" "success"
}

# Function: Main backup execution
main() {
    # Initialize logging
    init_logging
    
    # Check permissions
    check_permissions
    
    # Create backup structure
    create_backup_structure
    
    # Start backup process
    print_progress "Starting infrastructure backup..." "start"
    
    echo ""
    echo -e "${BLUE}📂 Backing up infrastructure files:${NC}"
    
    # Backup all infrastructure files
    for source_path in "${!INFRASTRUCTURE_FILES[@]}"; do
        local dest_file="${INFRASTRUCTURE_FILES[$source_path]}"
        local dest_path="$BACKUP_DIR/$dest_file"
        local priority="${FILE_PRIORITIES[$source_path]}"
        
        copy_file "$source_path" "$dest_path" "$priority"
    done
    
    echo ""
    echo -e "${BLUE}🔒 Backing up SSL certificates:${NC}"
    backup_ssl_certificates
    
    echo ""
    echo -e "${BLUE}📋 Creating backup manifest:${NC}"
    create_backup_manifest
    
    # SECURITY: Lock down backup directory permissions
    if [ "$DRY_RUN" = false ]; then
        print_progress "Securing backup directory permissions..." "start"
        chmod -R go-rwx "$BACKUP_DIR"
        print_progress "Backup directory secured (root access only)" "success"
    fi
    
    # Display summary
    echo ""
    echo ""
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════╗"
    echo "║              📊 Backup Summary               ║"
    echo "╚══════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo "Backup Details:"
    echo "   Name: $BACKUP_NAME"
    echo "   Location: $BACKUP_DIR"
    echo "   Size: $(calculate_backup_size)"
    echo "   Mode: $([ "$DRY_RUN" = true ] && echo "DRY RUN" || echo "LIVE BACKUP")"
    echo ""
    echo "File Statistics:"
    echo "   ✅ Total Files: $TOTAL_FILES"
    echo "   📁 Copied Successfully: $COPIED_FILES"
    echo "   ⚠️  Missing Files: $MISSING_FILES"
    echo "   ❌ Error Files: $ERROR_FILES"
    
    if [ $MISSING_FILES -gt 0 ]; then
        echo ""
        echo "Missing Files by Priority:"
        if [ $MISSING_CRITICAL -gt 0 ]; then
            echo "   🚨 CRITICAL: $MISSING_CRITICAL files"
        fi
        if [ $MISSING_HIGH -gt 0 ]; then
            echo "   ⚠️  HIGH: $MISSING_HIGH files"
        fi
        if [ $MISSING_MEDIUM -gt 0 ]; then
            echo "   📝 MEDIUM: $MISSING_MEDIUM files"
        fi
        if [ $MISSING_LOW -gt 0 ]; then
            echo "   📄 LOW: $MISSING_LOW files"
        fi
    fi
    
    echo ""
    if [ $ERROR_FILES -gt 0 ]; then
        echo -e "${RED}❌ Backup completed with errors${NC}"
    elif [ $MISSING_CRITICAL -gt 0 ]; then
        echo -e "${RED}⚠️  ⚠️  CRITICAL FILES MISSING - Production may be affected!${NC}"
    elif [ $MISSING_FILES -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Backup completed with missing files${NC}"
    else
        echo -e "${GREEN}✅ Backup completed successfully! 🎉${NC}"
    fi
    
    echo ""
    echo -e "${PURPLE}💡 Next Steps:${NC}"
    echo "   1. Review backup manifest: $BACKUP_DIR/BACKUP_MANIFEST.txt"
    if [ "$DRY_RUN" = false ]; then
        echo "   2. Review detailed log: $LOG_FILE"
    fi
    echo "   3. Test restore procedure if needed"
    echo "   4. Verify critical files are present"
    if [ "$GOLDEN_MODE" = false ]; then
        echo "   4. Consider creating golden backup: ./scripts/backup-foundation.sh --golden"
    fi
    
    # Send email notification in auto mode
    if [ "$AUTO_MODE" = true ]; then
        local notification_status="success"
        local notification_summary="Backup completed successfully"
        local notification_details="Backup completed at $(date)\nLocation: $BACKUP_DIR\nSize: $(calculate_backup_size)"
        
        if [ $ERROR_FILES -gt 0 ]; then
            notification_status="error"
            notification_summary="Backup completed with errors"
            notification_details="$notification_details\n\nErrors encountered during backup process.\nReview backup manifest: $BACKUP_DIR/BACKUP_MANIFEST.txt"
        elif [ $MISSING_FILES -gt 0 ]; then
            notification_status="warning"
            notification_summary="Backup completed with missing files"
            notification_details="$notification_details\n\nSome files were missing and could not be backed up.\nReview backup manifest: $BACKUP_DIR/BACKUP_MANIFEST.txt"
        fi
        
        send_backup_notification "$notification_status" "$notification_summary" "$notification_details"
    fi
}

# Run main function
main "$@"