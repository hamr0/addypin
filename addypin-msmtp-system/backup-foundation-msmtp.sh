#!/bin/bash

# AddyPin Foundation Backup Script with MSMTP Email Integration
# Modified version to use MSMTP instead of Resend API

# Usage: ./backup-foundation-msmtp.sh [--dry-run] [--golden] [--force] [--auto] [--biweekly]

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

# Email notification settings - MSMTP Integration
NOTIFY_EMAIL="avoidaccess@gmail.com"
ALERT_SCRIPT="/opt/addypin/scripts/send-health-alert.sh"

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
            echo "AddyPin Foundation Backup Script with MSMTP"
            echo "Usage: $0 [--dry-run] [--golden] [--force] [--auto] [--biweekly]"
            echo ""
            echo "Options:"
            echo "  --dry-run    Show what would be backed up without actually copying files"
            echo "  --golden     Create golden backup (immutable reference)"
            echo "  --force      Overwrite existing backups without confirmation"
            echo "  --auto       Automated mode with MSMTP email notifications (implies --force)"
            echo "  --biweekly   Bi-weekly automation mode (checks week number)"
            echo "  --help       Show this help message"
            echo ""
            echo "Email notifications sent to: $NOTIFY_EMAIL"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Biweekly automation check
if [[ "$BIWEEKLY_MODE" = true ]]; then
    CURRENT_WEEK=$(date +%W)
    if [[ $((CURRENT_WEEK % 2)) -ne 0 ]]; then
        echo "[$(date)] Skipping backup - Week $CURRENT_WEEK is odd (bi-weekly schedule)"
        exit 0
    else
        echo "[$(date)] Running backup - Week $CURRENT_WEEK is even (bi-weekly mode)"
    fi
fi

# Function to send email notifications via MSMTP
send_email_notification() {
    local status="$1"
    local summary="$2"
    local details="$3"
    
    # Only send emails in auto mode and if MSMTP alert script exists
    if [[ "$AUTO_MODE" = true ]] && [[ -f "$ALERT_SCRIPT" ]] && command -v msmtp >/dev/null 2>&1; then
        case "$status" in
            "success")
                "$ALERT_SCRIPT" backup "✅ Backup completed successfully: $summary"
                ;;
            "warning")
                "$ALERT_SCRIPT" backup "⚠️ Backup completed with warnings: $summary"
                ;;
            "error")
                "$ALERT_SCRIPT" backup "❌ Backup failed: $summary"
                ;;
        esac
    fi
}

# Centralized logging setup
LOGS_DIR="$BACKUP_ROOT/logs"
LOG_FILE="$LOGS_DIR/backup_${TIMESTAMP}.log"

# Create logs directory if it doesn't exist
if [[ ! -d "$LOGS_DIR" ]]; then
    mkdir -p "$LOGS_DIR"
    chmod 700 "$LOGS_DIR"
fi

# Create log file
touch "$LOG_FILE"
chmod 600 "$LOG_FILE"

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" >> "$LOG_FILE"
    if [[ "$AUTO_MODE" = false ]]; then
        echo -e "$1"
    fi
}

# Banner (suppress in auto mode for cleaner logs)
if [ "$AUTO_MODE" = false ]; then
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════╗"
    echo "║           🏗️  AddyPin Foundation Backup      ║"
    echo "║              Infrastructure Preservation     ║"
    echo "║                                              ║"
    echo "║ 🔒 SECURITY: Protected with 700/600 perms   ║"
    echo "║ 📧 MSMTP: Email alerts to $NOTIFY_EMAIL"
    echo "╚══════════════════════════════════════════════╝"
    echo -e "${NC}"
else
    echo "[$(date)] Starting automated AddyPin Foundation Backup..."
    log_message "Starting automated AddyPin Foundation Backup with MSMTP notifications"
fi

# Show configuration
if [ "$AUTO_MODE" = false ]; then
    echo -e "${CYAN}📋 Backup Configuration:${NC}"
    echo "   Mode: $([ "$GOLDEN_MODE" = true ] && echo "Golden (Immutable)" || echo "Versioned ($TIMESTAMP)")"
    echo "   Dry Run: $([ "$DRY_RUN" = true ] && echo "YES" || echo "NO")"
    echo "   Force: $([ "$FORCE_MODE" = true ] && echo "YES" || echo "NO")"
    echo "   Auto: $([ "$AUTO_MODE" = true ] && echo "YES" || echo "NO")"
    echo "   Bi-weekly: $([ "$BIWEEKLY_MODE" = true ] && echo "YES" || echo "NO")"
    echo "   Email: $(command -v msmtp >/dev/null 2>&1 && echo "MSMTP Ready" || echo "MSMTP Not Available")"
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

# Critical infrastructure files mapping (same as original)
declare -A INFRASTRUCTURE_FILES=(
    # PostgreSQL Configuration
    ["/var/lib/pgsql/data/postgresql.conf"]="postgresql/postgresql.conf"
    ["/var/lib/pgsql/data/pg_hba.conf"]="postgresql/pg_hba.conf"
    ["/var/lib/pgsql/data/ssl/server.crt"]="postgresql/ssl/server.crt"
    ["/var/lib/pgsql/data/ssl/server.key"]="postgresql/ssl/server.key"
    
    # Docker Configurations
    ["/opt/addypin/docker-compose.yml"]="docker/production-docker-compose.yml"
    ["/opt/addypin-staging/docker-compose.yml"]="docker/staging-docker-compose.yml"
    
    # Environment Files (Critical: Contains API keys)
    ["/opt/addypin/.env"]="environment/production.env"
    ["/opt/addypin-staging/.env"]="environment/staging.env"
    
    # Monitoring Scripts
    ["/opt/addypin/scripts/enhanced-health-check.sh"]="monitoring/enhanced-health-check.sh"
    ["/opt/addypin/scripts/health-check-email.js"]="monitoring/health-check-email.js"
    ["/opt/addypin/scripts/health-check.sh"]="monitoring/health-check.sh"
    
    # Nginx Configuration
    ["/etc/nginx/nginx.conf"]="nginx/nginx.conf"
    ["/etc/nginx/conf.d/addypin.conf"]="nginx/addypin.conf"
    
    # System Configuration
    ["/var/spool/cron/root"]="system/root-crontab"
    ["/etc/logrotate.d/addypin-health-check"]="system/logrotate-addypin-health-check"
)

# File priorities (same as original)
declare -A FILE_PRIORITIES=(
    # CRITICAL: Production environment and core infrastructure
    ["/opt/addypin/docker-compose.yml"]="CRITICAL"
    ["/opt/addypin-staging/docker-compose.yml"]="CRITICAL"
    ["/opt/addypin/.env"]="CRITICAL"
    ["/opt/addypin-staging/.env"]="CRITICAL"
    ["/var/spool/cron/root"]="CRITICAL"
    
    # HIGH: Monitoring and web server configuration
    ["/opt/addypin/scripts/enhanced-health-check.sh"]="HIGH"
    ["/opt/addypin/scripts/health-check-email.js"]="HIGH"
    ["/opt/addypin/scripts/health-check.sh"]="HIGH"
    ["/etc/nginx/nginx.conf"]="HIGH"
    ["/etc/nginx/conf.d/addypin.conf"]="HIGH"
    
    # MEDIUM: Database configuration (may not exist on all systems)
    ["/var/lib/pgsql/data/postgresql.conf"]="MEDIUM"
    ["/var/lib/pgsql/data/pg_hba.conf"]="MEDIUM"
    ["/var/lib/pgsql/data/ssl/server.crt"]="MEDIUM"
    ["/var/lib/pgsql/data/ssl/server.key"]="MEDIUM"
    
    # LOW: Optional configurations
    ["/etc/logrotate.d/addypin-health-check"]="LOW"
)

# SSL Certificate paths (Let's Encrypt)
SSL_CERT_PATHS=(
    "/etc/letsencrypt/live/addypin.com"
)

# Statistics counters
TOTAL_FILES=0
COPIED_FILES=0
MISSING_FILES=0
ERROR_FILES=0

# Main backup execution function
main() {
    print_banner
    check_permissions
    init_logging
    
    # Backup infrastructure files
    print_progress "Starting infrastructure file backup..." "start"
    for source_path in "${!INFRASTRUCTURE_FILES[@]}"; do
        relative_path="${INFRASTRUCTURE_FILES[$source_path]}"
        backup_file "$source_path" "$relative_path"
    done
    
    # Backup SSL certificates if they exist
    print_progress "Checking SSL certificates..." "start"
    for ssl_path in "${SSL_CERT_PATHS[@]}"; do
        if [ -d "$ssl_path" ]; then
            CERT_NAME=$(basename "$ssl_path")
            backup_directory "$ssl_path" "ssl-certificates/$CERT_NAME"
        fi
    done
    
    # Generate backup manifest
    generate_manifest
    
    # Summary and email notification
    print_summary
    
    # Send email notification in auto mode
    if [[ "$AUTO_MODE" = true ]]; then
        if [[ $ERROR_FILES -gt 0 ]]; then
            send_email_notification "error" "$ERROR_FILES files failed to backup" "Check log: $LOG_FILE"
            exit 1
        elif [[ $MISSING_FILES -gt 0 ]]; then
            send_email_notification "warning" "$MISSING_FILES files missing, $COPIED_FILES backed up successfully" "Review manifest for details"
            exit 0
        else
            send_email_notification "success" "All $COPIED_FILES files backed up successfully" "Backup completed without issues"
            exit 0
        fi
    fi
}

# Helper functions
backup_file() {
    local source="$1"
    local relative_path="$2"
    local dest="$BACKUP_DIR/$relative_path"
    
    ((TOTAL_FILES++))
    
    if [[ ! -f "$source" ]]; then
        log_message "MISSING: $source (${FILE_PRIORITIES[$source]:-UNKNOWN} priority)"
        ((MISSING_FILES++))
        case "${FILE_PRIORITIES[$source]:-UNKNOWN}" in
            "CRITICAL") ((MISSING_CRITICAL++)) ;;
            "HIGH") ((MISSING_HIGH++)) ;;
            "MEDIUM") ((MISSING_MEDIUM++)) ;;
            "LOW") ((MISSING_LOW++)) ;;
        esac
        return 1
    fi
    
    if [[ "$DRY_RUN" = true ]]; then
        log_message "DRY-RUN: Would copy $source → $relative_path"
        return 0
    fi
    
    mkdir -p "$(dirname "$dest")"
    if cp "$source" "$dest" 2>/dev/null; then
        chmod 600 "$dest"
        log_message "COPIED: $source → $relative_path ($(stat -c%s "$source") bytes)"
        ((COPIED_FILES++))
        return 0
    else
        log_message "ERROR: Failed to copy $source"
        ((ERROR_FILES++))
        return 1
    fi
}

backup_directory() {
    local source="$1"
    local relative_path="$2"
    local dest="$BACKUP_DIR/$relative_path"
    
    if [[ "$DRY_RUN" = true ]]; then
        log_message "DRY-RUN: Would copy directory $source → $relative_path"
        return 0
    fi
    
    mkdir -p "$(dirname "$dest")"
    if cp -r "$source" "$dest" 2>/dev/null; then
        chmod -R 600 "$dest"
        log_message "COPIED: Directory $source → $relative_path"
        return 0
    else
        log_message "ERROR: Failed to copy directory $source"
        return 1
    fi
}

generate_manifest() {
    local manifest="$BACKUP_DIR/BACKUP_MANIFEST.txt"
    
    if [[ "$DRY_RUN" = true ]]; then
        log_message "DRY-RUN: Would generate manifest at $manifest"
        return 0
    fi
    
    {
        echo "AddyPin Foundation Backup Manifest"
        echo "Generated: $(date)"
        echo "Mode: $([ "$GOLDEN_MODE" = true ] && echo "Golden" || echo "Versioned")"
        echo "Total Files: $TOTAL_FILES"
        echo "Copied Successfully: $COPIED_FILES"
        echo "Missing Files: $MISSING_FILES"
        echo "Error Files: $ERROR_FILES"
        echo ""
        echo "Missing Files by Priority:"
        echo "  Critical: $MISSING_CRITICAL"
        echo "  High: $MISSING_HIGH"  
        echo "  Medium: $MISSING_MEDIUM"
        echo "  Low: $MISSING_LOW"
    } > "$manifest"
    
    chmod 600 "$manifest"
    log_message "Generated backup manifest: $manifest"
}

print_banner() {
    if [[ "$AUTO_MODE" = false ]]; then
        echo -e "${BLUE}"
        echo "╔══════════════════════════════════════════════╗"
        echo "║           🏗️  AddyPin Foundation Backup      ║"
        echo "║              MSMTP Email Integration         ║"
        echo "║                                              ║"
        echo "║ 🔒 SECURITY: Protected with 700/600 perms   ║"
        echo "║ 📧 MSMTP: Email alerts to $NOTIFY_EMAIL"
        echo "╚══════════════════════════════════════════════╝"
        echo -e "${NC}"
    fi
}

print_progress() {
    local message="$1"
    local status="$2"
    
    if [[ "$AUTO_MODE" = false ]]; then
        case "$status" in
            "start") echo -e "${CYAN}🔄 $message${NC}" ;;
            "success") echo -e "${GREEN}✅ $message${NC}" ;;
            "error") echo -e "${RED}❌ $message${NC}" ;;
            "warning") echo -e "${YELLOW}⚠️ $message${NC}" ;;
        esac
    fi
    
    log_message "$message"
}

print_summary() {
    local status_color="$GREEN"
    local status_text="SUCCESS"
    
    if [[ $ERROR_FILES -gt 0 ]]; then
        status_color="$RED"
        status_text="ERROR"
    elif [[ $MISSING_FILES -gt 0 ]]; then
        status_color="$YELLOW"  
        status_text="WARNING"
    fi
    
    if [[ "$AUTO_MODE" = false ]]; then
        echo ""
        echo -e "${status_color}📊 BACKUP SUMMARY - $status_text${NC}"
        echo "════════════════════════════════════════"
        echo "📁 Total Files: $TOTAL_FILES"
        echo "✅ Copied Successfully: $COPIED_FILES"
        echo "❌ Missing Files: $MISSING_FILES"
        echo "🔴 Error Files: $ERROR_FILES"
        echo ""
        echo "📊 Missing Files by Priority:"
        echo "   🔴 Critical: $MISSING_CRITICAL"
        echo "   🟡 High: $MISSING_HIGH"
        echo "   🟠 Medium: $MISSING_MEDIUM"
        echo "   🟢 Low: $MISSING_LOW"
    fi
    
    log_message "SUMMARY: $status_text - Total: $TOTAL_FILES, Copied: $COPIED_FILES, Missing: $MISSING_FILES, Errors: $ERROR_FILES"
}

check_permissions() {
    if [[ $EUID -ne 0 ]]; then
        echo -e "${RED}❌ This script must be run as root${NC}"
        exit 1
    fi
}

init_logging() {
    # Create logs directory with secure permissions
    if [[ "$DRY_RUN" = false ]]; then
        mkdir -m 700 -p "$LOGS_DIR"
        # Create log file with secure permissions
        touch "$LOG_FILE"
        chmod 600 "$LOG_FILE"
    fi
    
    log_message "Starting AddyPin Foundation Backup (MSMTP)"
    log_message "Mode: $([ "$GOLDEN_MODE" = true ] && echo "Golden" || echo "Versioned")"
    log_message "Auto Mode: $AUTO_MODE"
    log_message "Dry Run: $DRY_RUN"
}

# Initialize missing counters
MISSING_CRITICAL=0
MISSING_HIGH=0
MISSING_MEDIUM=0
MISSING_LOW=0

# Run main function
main "$@"