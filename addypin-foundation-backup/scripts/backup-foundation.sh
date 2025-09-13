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
        -h|--help)
            echo "AddyPin Foundation Backup Script"
            echo "Usage: $0 [--dry-run] [--golden] [--force] [--auto]"
            echo ""
            echo "Options:"
            echo "  --dry-run    Show what would be backed up without actually copying files"
            echo "  --golden     Create golden backup (immutable reference)"
            echo "  --force      Overwrite existing backups without confirmation"
            echo "  --auto       Automated mode with email notifications (implies --force)"
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

# Show configuration
if [ "$AUTO_MODE" = false ]; then
    echo -e "${CYAN}📋 Backup Configuration:${NC}"
    echo "   Mode: $([ "$GOLDEN_MODE" = true ] && echo "Golden (Immutable)" || echo "Versioned ($TIMESTAMP)")"
    echo "   Dry Run: $([ "$DRY_RUN" = true ] && echo "YES" || echo "NO")"
    echo "   Force: $([ "$FORCE_MODE" = true ] && echo "YES" || echo "NO")"
    echo "   Auto: $([ "$AUTO_MODE" = true ] && echo "YES" || echo "NO")"
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
    ["/opt/infra/health-check.sh"]="monitoring/infra-health-check.sh"
    
    # Nginx Configuration
    ["/etc/nginx/nginx.conf"]="nginx/nginx.conf"
    ["/etc/nginx/conf.d/addypin.conf"]="nginx/addypin.conf"
    
    # System Configuration
    ["/var/spool/cron/root"]="system/root-crontab"
    ["/etc/logrotate.d/infra-health-check"]="system/logrotate-infra-health-check"
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

# Email notification settings
NOTIFY_EMAIL="admin@addypin.com"
RESEND_API_KEY="${RESEND_API_KEY:-}"

# Function: Send email notification
send_backup_notification() {
    local status="$1"  # success, error, warning
    local summary="$2"
    local details="$3"
    
    # Only send emails in auto mode and if API key is available
    if [ "$AUTO_MODE" = false ] || [ -z "$RESEND_API_KEY" ]; then
        return 0
    fi
    
    local subject=""
    local emoji=""
    local color="#28a745"  # green
    
    case "$status" in
        "success")
            subject="[SUCCESS] AddyPin Foundation Backup Completed"
            emoji="✅"
            color="#28a745"
            ;;
        "error")
            subject="[ERROR] AddyPin Foundation Backup Failed"
            emoji="❌"
            color="#dc3545"
            ;;
        "warning")
            subject="[WARNING] AddyPin Foundation Backup Completed with Issues"
            emoji="⚠️"
            color="#ffc107"
            ;;
    esac
    
    local backup_size=$(calculate_backup_size)
    local timestamp=$(date -u '+%Y-%m-%d %H:%M:%S UTC')
    
    # Create email payload
    local email_payload=$(cat << EOF
{
  "from": "AddyPin Backup System <backup@addypin.com>",
  "to": ["$NOTIFY_EMAIL"],
  "subject": "$subject",
  "html": "<!DOCTYPE html><html><head><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;margin:0;padding:20px;background:#f8f9fa}.container{max-width:600px;margin:0 auto;background:white;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);overflow:hidden}.header{background:linear-gradient(135deg,$color 0%,#0056b3 100%);color:white;padding:30px 20px;text-align:center}.content{padding:30px 20px}.stats-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:15px;margin:20px 0}.stat-item{background:#f8f9fa;padding:15px;border-radius:8px;text-align:center}.stat-number{font-size:24px;font-weight:bold;color:#1f2937}.stat-label{font-size:12px;color:#6b7280;text-transform:uppercase}.footer{background:#f8f9fa;padding:20px;text-align:center;color:#6b7280;font-size:14px}</style></head><body><div class='container'><div class='header'><h1 style='margin:0;font-size:28px'>$emoji AddyPin Foundation Backup</h1><p style='margin:10px 0 0 0;opacity:0.9'>Automated Infrastructure Backup Report</p></div><div class='content'><h2 style='color:#1f2937;margin-top:0'>Backup Summary</h2><p><strong>Status:</strong> $summary</p><p><strong>Completed:</strong> $timestamp</p><p><strong>Backup Size:</strong> $backup_size</p><p><strong>Mode:</strong> $([ \"$GOLDEN_MODE\" = true ] && echo \"Golden\" || echo \"Versioned\")</p><div class='stats-grid'><div class='stat-item'><div class='stat-number'>$TOTAL_FILES</div><div class='stat-label'>Total Files</div></div><div class='stat-item'><div class='stat-number'>$COPIED_FILES</div><div class='stat-label'>Copied Successfully</div></div><div class='stat-item'><div class='stat-number'>$MISSING_FILES</div><div class='stat-label'>Missing Files</div></div><div class='stat-item'><div class='stat-number'>$ERROR_FILES</div><div class='stat-label'>Error Files</div></div></div><div style='background:#f1f3f4;padding:15px;border-radius:8px;margin:20px 0'><h3 style='margin-top:0;color:#1f2937'>Details</h3><pre style='white-space:pre-wrap;color:#4b5563;margin:0'>$details</pre></div></div><div class='footer'><p>AddyPin Foundation Backup System</p><p>Generated automatically every other Sunday at 2:00 AM</p></div></div></body></html>",
  "text": "AddyPin Foundation Backup Report\n\nStatus: $summary\nCompleted: $timestamp\nBackup Size: $backup_size\nMode: $([ \"$GOLDEN_MODE\" = true ] && echo \"Golden\" || echo \"Versioned\")\n\nStatistics:\n- Total Files: $TOTAL_FILES\n- Copied Successfully: $COPIED_FILES\n- Missing Files: $MISSING_FILES\n- Error Files: $ERROR_FILES\n\nDetails:\n$details\n\n--\nAddyPin Foundation Backup System\nGenerated automatically every other Sunday at 2:00 AM"
}
EOF
    )
    
    # Send email using curl
    local response=$(curl -s -X POST https://api.resend.com/emails \
        -H "Authorization: Bearer $RESEND_API_KEY" \
        -H "Content-Type: application/json" \
        -d "$email_payload" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        log_message "Email notification sent successfully"
    else
        log_message "Failed to send email notification"
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
    
    case "$status" in
        "start")
            echo -e "${BLUE}🔄 $message${NC}"
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

# Function: Check if backup already exists
check_existing_backup() {
    if [ "$GOLDEN_MODE" = true ] && [ -d "$BACKUP_DIR" ] && [ "$FORCE_MODE" = false ]; then
        print_progress "Golden backup already exists" "warning"
        print_progress "Use --force to overwrite or choose versioned backup" "info"
        
        if [ "$DRY_RUN" = false ] && [ "$AUTO_MODE" = false ]; then
            read -p "Overwrite existing golden backup? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        elif [ "$AUTO_MODE" = true ]; then
            print_progress "Auto mode: Overwriting existing golden backup" "info"
        fi
    fi
}

# Function: Copy file with error handling and verification
copy_file_secure() {
    local source="$1"
    local dest="$2"
    local description="$3"
    
    TOTAL_FILES=$((TOTAL_FILES + 1))
    
    # Check if source file exists
    if [ ! -f "$source" ] && [ ! -d "$source" ]; then
        print_progress "Missing: $description ($source)" "warning"
        MISSING_FILES=$((MISSING_FILES + 1))
        return 0  # Don't exit on missing files
    fi
    
    # Create destination directory with secure permissions
    local dest_dir="$(dirname "$dest")"
    if [ "$DRY_RUN" = false ]; then
        mkdir -m 700 -p "$dest_dir"
    fi
    
    # Copy file
    if [ "$DRY_RUN" = true ]; then
        print_progress "Would copy: $description" "info"
        # Note: Don't increment COPIED_FILES during dry-run
        return 0
    fi
    
    if cp -p "$source" "$dest" 2>/dev/null; then
        # Verify copy with checksum
        if command -v sha256sum >/dev/null 2>&1; then
            local source_hash=$(sha256sum "$source" 2>/dev/null | cut -d' ' -f1)
            local dest_hash=$(sha256sum "$dest" 2>/dev/null | cut -d' ' -f1)
            
            if [ "$source_hash" = "$dest_hash" ]; then
                print_progress "Copied: $description ✓" "success"
                COPIED_FILES=$((COPIED_FILES + 1))
            else
                print_progress "Checksum mismatch: $description" "error"
                ERROR_FILES=$((ERROR_FILES + 1))
                return 0  # Continue despite checksum errors
            fi
        else
            print_progress "Copied: $description (no checksum verification)" "success"
            COPIED_FILES=$((COPIED_FILES + 1))
        fi
    else
        print_progress "Failed to copy: $description" "error"
        ERROR_FILES=$((ERROR_FILES + 1))
        return 0  # Continue despite copy errors
    fi
}

# Function: Backup SSL certificates
backup_ssl_certificates() {
    print_progress "Backing up SSL certificates..." "start"
    
    for cert_path in "${SSL_CERT_PATHS[@]}"; do
        if [ -d "$cert_path" ]; then
            local cert_name=$(basename "$cert_path")
            local dest_path="$BACKUP_DIR/ssl/$cert_name"
            
            if [ "$DRY_RUN" = false ]; then
                mkdir -m 700 -p "$dest_path"
                if ! cp -a "$cert_path"/* "$dest_path/" 2>/dev/null; then
                    print_progress "Warning: Some SSL files could not be copied for $cert_name" "warning"
                fi
            fi
            
            print_progress "SSL certs for $cert_name" "success"
            TOTAL_FILES=$((TOTAL_FILES + 1))
            if [ "$DRY_RUN" = false ]; then
                COPIED_FILES=$((COPIED_FILES + 1))
            fi
        else
            print_progress "SSL cert path not found: $cert_path" "warning"
            TOTAL_FILES=$((TOTAL_FILES + 1))
            MISSING_FILES=$((MISSING_FILES + 1))
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
=================================

Backup Type: $([ "$GOLDEN_MODE" = true ] && echo "Golden" || echo "Versioned")
Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')
Hostname: $(hostname)
Script Version: 1.0.0

SECURITY NOTICE:
===============
This backup contains sensitive data (API keys, certificates, passwords).
All files and directories are protected with 700/600 permissions.
Access restricted to root user only - no group/world access.
Handle with appropriate security controls.

Statistics:
-----------
Total Files: $TOTAL_FILES
Copied Successfully: $COPIED_FILES
Missing Files: $MISSING_FILES
Error Files: $ERROR_FILES

File Inventory:
--------------
EOF

        # Add file inventory
        for source in "${!INFRASTRUCTURE_FILES[@]}"; do
            local dest="${INFRASTRUCTURE_FILES[$source]}"
            local status="MISSING"
            
            if [ -f "$source" ] || [ -d "$source" ]; then
                if [ -f "$BACKUP_DIR/$dest" ]; then
                    status="BACKED_UP"
                else
                    status="ERROR"
                fi
            fi
            
            echo "[$status] $source -> $dest" >> "$manifest_file"
        done
        
        # Add SSL certificates to manifest
        for cert_path in "${SSL_CERT_PATHS[@]}"; do
            local cert_name=$(basename "$cert_path")
            local status="MISSING"
            
            if [ -d "$cert_path" ]; then
                if [ -d "$BACKUP_DIR/ssl/$cert_name" ]; then
                    status="BACKED_UP"
                else
                    status="ERROR"
                fi
            fi
            
            echo "[$status] $cert_path -> ssl/$cert_name/" >> "$manifest_file"
        done
    fi
    
    print_progress "Backup manifest created" "success"
}

# Function: Calculate backup size
calculate_backup_size() {
    if [ "$DRY_RUN" = false ] && [ -d "$BACKUP_DIR" ]; then
        local size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
        echo "$size"
    else
        echo "N/A (dry run)"
    fi
}

# Function: Main backup execution
execute_backup() {
    print_progress "Starting infrastructure backup..." "start"
    
    # Backup regular infrastructure files
    echo -e "\n${CYAN}📂 Backing up infrastructure files:${NC}"
    for source in "${!INFRASTRUCTURE_FILES[@]}"; do
        local dest="$BACKUP_DIR/${INFRASTRUCTURE_FILES[$source]}"
        local description=$(basename "$source")
        copy_file_secure "$source" "$dest" "$description"  # Errors are handled within function
    done
    
    # Backup SSL certificates
    echo -e "\n${CYAN}🔒 Backing up SSL certificates:${NC}"
    backup_ssl_certificates
    
    # Create manifest
    echo -e "\n${CYAN}📋 Creating backup manifest:${NC}"
    create_backup_manifest
}

# Function: Print final summary
print_summary() {
    local backup_size=$(calculate_backup_size)
    
    echo -e "\n${BLUE}"
    echo "╔══════════════════════════════════════════════╗"
    echo "║              📊 Backup Summary               ║"
    echo "╚══════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${CYAN}Backup Details:${NC}"
    echo "   Name: $BACKUP_NAME"
    echo "   Location: $BACKUP_DIR"
    echo "   Size: $backup_size"
    echo "   Mode: $([ "$DRY_RUN" = true ] && echo "DRY RUN" || echo "LIVE BACKUP")"
    echo ""
    
    echo -e "${CYAN}File Statistics:${NC}"
    echo "   ✅ Total Files: $TOTAL_FILES"
    echo "   📁 Copied Successfully: $COPIED_FILES"
    echo "   ⚠️  Missing Files: $MISSING_FILES"
    echo "   ❌ Error Files: $ERROR_FILES"
    echo ""
    
    # Status indicator
    if [ $ERROR_FILES -eq 0 ] && [ $MISSING_FILES -eq 0 ]; then
        print_progress "Backup completed successfully! 🎉" "success"
    elif [ $ERROR_FILES -eq 0 ]; then
        print_progress "Backup completed with missing files (review manifest)" "warning"
    else
        print_progress "Backup completed with errors (review manifest)" "error"
    fi
    
    echo ""
    echo -e "${PURPLE}💡 Next Steps:${NC}"
    echo "   1. Review backup manifest: $BACKUP_DIR/BACKUP_MANIFEST.txt"
    if [ "$DRY_RUN" = false ] && [ -f "$LOG_FILE" ]; then
        echo "   2. Review detailed log: $LOG_FILE"
        echo "   3. Test restore procedure if needed"
        echo "   4. Verify critical files are present"
    else
        echo "   2. Test restore procedure if needed"
        echo "   3. Verify critical files are present"
    fi
    
    if [ "$GOLDEN_MODE" = true ]; then
        echo "   4. Golden backup is now your reference point"
    else
        echo "   4. Consider creating golden backup: $0 --golden"
    fi
}

# Main execution
main() {
    # Initialize logging system
    init_logging
    
    # Pre-flight checks
    check_permissions
    check_existing_backup
    
    # Setup
    create_backup_structure
    
    # Execute backup
    execute_backup
    
    # SECURITY: Lock down backup directory permissions
    if [ "$DRY_RUN" = false ] && [ -d "$BACKUP_DIR" ]; then
        print_progress "Securing backup directory permissions..." "start"
        chmod -R go-rwx "$BACKUP_DIR"
        print_progress "Backup directory secured (root access only)" "success"
    fi
    
    # Summary
    print_summary
    
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