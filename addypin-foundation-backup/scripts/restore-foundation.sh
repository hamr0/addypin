#!/bin/bash

# AddyPin Foundation Restore Script
# Restores critical infrastructure files from comprehensive backups
# Usage: ./restore-foundation.sh [--dry-run] [--from-golden] [--timestamp=YYYYMMDD_HHMMSS] [--force] [--skip-services]

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
ORANGE='\033[0;33m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
DRY_RUN=false
FROM_GOLDEN=false
FROM_TIMESTAMP=""
FORCE_MODE=false
SKIP_SERVICES=false

# Centralized logging setup
LOGS_DIR="$BACKUP_ROOT/logs"
LOG_FILE="$LOGS_DIR/restore_${TIMESTAMP}.log"

# Safety backup directory
SAFETY_BACKUP_DIR="$BACKUP_ROOT/versioned/pre-restore-${TIMESTAMP}"

# Service management flags
RESTART_NGINX=false
RESTART_POSTGRES=false
RESTART_DOCKER=false

# Statistics counters
TOTAL_FILES=0
RESTORED_FILES=0
FAILED_FILES=0
SKIPPED_FILES=0

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --from-golden)
            FROM_GOLDEN=true
            shift
            ;;
        --timestamp=*)
            FROM_TIMESTAMP="${1#*=}"
            shift
            ;;
        --force)
            FORCE_MODE=true
            shift
            ;;
        --skip-services)
            SKIP_SERVICES=true
            shift
            ;;
        -h|--help)
            echo "AddyPin Foundation Restore Script"
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Restore Options:"
            echo "  --from-golden       Restore from golden backup (immutable reference)"
            echo "  --timestamp=X       Restore from specific timestamp (YYYYMMDD_HHMMSS)"
            echo ""
            echo "Control Options:"
            echo "  --dry-run          Show what would be restored without actually copying files"
            echo "  --force            Skip confirmation prompts and overwrite files"
            echo "  --skip-services    Skip service restart prompts"
            echo "  --help             Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 --from-golden                    # Restore from golden backup"
            echo "  $0 --timestamp=20250913_143022      # Restore from specific backup"
            echo "  $0 --dry-run --from-golden          # Preview golden restoration"
            echo "  $0 --force --skip-services          # Automated restoration"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Critical infrastructure files mapping (reverse of backup mapping)
declare -A INFRASTRUCTURE_FILES=(
    # PostgreSQL Configuration
    ["postgresql/postgresql.conf"]="/var/lib/pgsql/data/postgresql.conf"
    ["postgresql/pg_hba.conf"]="/var/lib/pgsql/data/pg_hba.conf"
    ["postgresql/ssl/server.crt"]="/var/lib/pgsql/data/ssl/server.crt"
    ["postgresql/ssl/server.key"]="/var/lib/pgsql/data/ssl/server.key"
    
    # Docker Configurations
    ["docker/production-docker-compose.yml"]="/opt/addypin/docker-compose.yml"
    ["docker/staging-docker-compose.yml"]="/opt/addypin-staging/docker-compose.yml"
    
    # Environment Files (Critical: Contains API keys)
    ["environment/production.env"]="/opt/addypin/.env"
    ["environment/staging.env"]="/opt/addypin-staging/.env"
    
    # Monitoring Scripts
    ["monitoring/enhanced-health-check.sh"]="/opt/addypin/scripts/enhanced-health-check.sh"
    ["monitoring/health-check-email.js"]="/opt/addypin/scripts/health-check-email.js"
    ["monitoring/infra-health-check.sh"]="/opt/infra/health-check.sh"
    
    # Nginx Configuration
    ["nginx/nginx.conf"]="/etc/nginx/nginx.conf"
    ["nginx/addypin.conf"]="/etc/nginx/conf.d/addypin.conf"
    
    # System Configuration
    ["system/root-crontab"]="/var/spool/cron/root"
    ["system/logrotate-infra-health-check"]="/etc/logrotate.d/infra-health-check"
)

# SSL Certificate paths (Let's Encrypt)
SSL_CERT_BACKUP_PATHS=(
    "ssl/addypin.com"
    "ssl/www.addypin.com"
    "ssl/staging.addypin.com"
)

SSL_CERT_RESTORE_PATHS=(
    "/etc/letsencrypt/live/addypin.com"
    "/etc/letsencrypt/live/www.addypin.com"
    "/etc/letsencrypt/live/staging.addypin.com"
)

# Services that may need restart after restoration
declare -A SERVICE_IMPACTS=(
    ["postgresql"]="postgresql/postgresql.conf postgresql/pg_hba.conf postgresql/ssl/"
    ["nginx"]="nginx/"
    ["docker"]="docker/ environment/"
)

# Banner
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════╗"
echo "║         🔄  AddyPin Foundation Restore        ║"
echo "║              Infrastructure Recovery         ║"
echo "║                                              ║"
echo "║ ⚠️  CRITICAL: Production system restoration  ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

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
            echo "AddyPin Foundation Restore Log"
            echo "Started: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
            echo "Mode: $([ "$FROM_GOLDEN" = true ] && echo "Golden" || echo "Timestamp: $FROM_TIMESTAMP")"
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
        "critical")
            echo -e "${ORANGE}🚨 $message${NC}"
            ;;
    esac
    
    # Also log to file
    log_message "[$status] $message"
}

# Function: Check if running as root or with proper permissions
check_permissions() {
    print_progress "Checking permissions..." "start"
    
    if [ "$EUID" -ne 0 ] && [ "$DRY_RUN" = false ]; then
        print_progress "This script requires root access to restore system files" "critical"
        print_progress "Run with: sudo $0 or use --dry-run to test" "info"
        exit 1
    fi
    
    print_progress "Permission check completed" "success"
}

# Function: Determine restore source
determine_restore_source() {
    print_progress "Determining restore source..." "start"
    
    if [ "$FROM_GOLDEN" = true ]; then
        RESTORE_DIR="$BACKUP_ROOT/golden"
        RESTORE_NAME="Golden Backup"
        
        if [ ! -d "$RESTORE_DIR" ]; then
            print_progress "Golden backup not found at: $RESTORE_DIR" "error"
            exit 1
        fi
    elif [ -n "$FROM_TIMESTAMP" ]; then
        RESTORE_DIR="$BACKUP_ROOT/versioned/$FROM_TIMESTAMP"
        RESTORE_NAME="Versioned Backup $FROM_TIMESTAMP"
        
        if [ ! -d "$RESTORE_DIR" ]; then
            print_progress "Timestamp backup not found at: $RESTORE_DIR" "error"
            print_progress "Available backups:" "info"
            if [ -d "$BACKUP_ROOT/versioned" ]; then
                ls -1 "$BACKUP_ROOT/versioned" | head -10
            fi
            exit 1
        fi
    else
        print_progress "No restore source specified. Use --from-golden or --timestamp=X" "error"
        print_progress "Available backups:" "info"
        
        if [ -d "$BACKUP_ROOT/golden" ]; then
            echo -e "${CYAN}   Golden: $BACKUP_ROOT/golden${NC}"
        fi
        
        if [ -d "$BACKUP_ROOT/versioned" ]; then
            echo -e "${CYAN}   Recent Versions:${NC}"
            ls -1t "$BACKUP_ROOT/versioned" | head -5 | while read backup; do
                echo "     --timestamp=$backup"
            done
        fi
        exit 1
    fi
    
    print_progress "Restore source: $RESTORE_NAME" "success"
    print_progress "Location: $RESTORE_DIR" "info"
}

# Function: List available backups
list_available_backups() {
    echo -e "\n${CYAN}📂 Available Backups:${NC}"
    
    if [ -d "$BACKUP_ROOT/golden" ]; then
        local golden_date=$(stat -c %y "$BACKUP_ROOT/golden" 2>/dev/null | cut -d' ' -f1 || echo "Unknown")
        echo -e "   ${GREEN}Golden Backup${NC} (Created: $golden_date)"
        echo "     Use: --from-golden"
    fi
    
    if [ -d "$BACKUP_ROOT/versioned" ]; then
        echo -e "\n   ${PURPLE}Recent Versioned Backups:${NC}"
        local count=0
        for backup in $(ls -1t "$BACKUP_ROOT/versioned" 2>/dev/null || true); do
            [ $count -ge 10 ] && break
            echo "     $backup"
            echo "       Use: --timestamp=$backup"
            count=$((count + 1))
        done
    fi
    echo ""
}

# Function: Verify backup integrity
verify_backup_integrity() {
    print_progress "Verifying backup integrity..." "start"
    
    local manifest_file="$RESTORE_DIR/BACKUP_MANIFEST.txt"
    
    if [ ! -f "$manifest_file" ]; then
        print_progress "Backup manifest not found - proceeding with caution" "warning"
        return 0
    fi
    
    # Check manifest for errors
    if grep -q "ERROR" "$manifest_file"; then
        print_progress "Backup manifest contains errors - review before proceeding" "warning"
        if [ "$FORCE_MODE" = false ] && [ "$DRY_RUN" = false ]; then
            read -p "Continue with potentially incomplete backup? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi
    
    print_progress "Backup integrity verified" "success"
}

# Function: Create pre-restoration safety backup
create_safety_backup() {
    if [ "$DRY_RUN" = true ]; then
        print_progress "Would create safety backup at: $SAFETY_BACKUP_DIR" "info"
        return 0
    fi
    
    print_progress "Creating pre-restoration safety backup..." "start"
    
    mkdir -m 700 -p "$SAFETY_BACKUP_DIR"
    
    # Backup current files that will be replaced
    local backed_up=0
    for backup_rel in "${!INFRASTRUCTURE_FILES[@]}"; do
        local system_path="${INFRASTRUCTURE_FILES[$backup_rel]}"
        
        if [ -f "$system_path" ] || [ -d "$system_path" ]; then
            local safety_path="$SAFETY_BACKUP_DIR/$backup_rel"
            local safety_dir="$(dirname "$safety_path")"
            
            mkdir -m 700 -p "$safety_dir"
            
            if cp -a "$system_path" "$safety_path" 2>/dev/null; then
                backed_up=$((backed_up + 1))
            fi
        fi
    done
    
    print_progress "Safety backup created ($backed_up files)" "success"
    print_progress "Location: $SAFETY_BACKUP_DIR" "info"
}

# Function: Restore individual file with verification
restore_file_secure() {
    local backup_rel="$1"
    local system_path="$2"
    local description="$(basename "$system_path")"
    
    TOTAL_FILES=$((TOTAL_FILES + 1))
    
    local backup_path="$RESTORE_DIR/$backup_rel"
    
    # Check if backup file exists
    if [ ! -f "$backup_path" ] && [ ! -d "$backup_path" ]; then
        print_progress "Backup file missing: $description" "warning"
        SKIPPED_FILES=$((SKIPPED_FILES + 1))
        return 0
    fi
    
    # Create destination directory
    local dest_dir="$(dirname "$system_path")"
    if [ "$DRY_RUN" = false ]; then
        mkdir -m 755 -p "$dest_dir" 2>/dev/null || true
    fi
    
    # Restore file
    if [ "$DRY_RUN" = true ]; then
        print_progress "Would restore: $description" "info"
        return 0
    fi
    
    # Preserve original permissions if file exists
    local orig_perms=""
    if [ -f "$system_path" ]; then
        orig_perms=$(stat -c %a "$system_path" 2>/dev/null || echo "")
    fi
    
    if cp -a "$backup_path" "$system_path" 2>/dev/null; then
        # Restore original permissions if we had them
        if [ -n "$orig_perms" ]; then
            chmod "$orig_perms" "$system_path" 2>/dev/null || true
        fi
        
        # Verify restoration with checksum
        if command -v sha256sum >/dev/null 2>&1; then
            local backup_hash=$(sha256sum "$backup_path" 2>/dev/null | cut -d' ' -f1)
            local system_hash=$(sha256sum "$system_path" 2>/dev/null | cut -d' ' -f1)
            
            if [ "$backup_hash" = "$system_hash" ]; then
                print_progress "Restored: $description ✓" "success"
                RESTORED_FILES=$((RESTORED_FILES + 1))
            else
                print_progress "Checksum mismatch: $description" "error"
                FAILED_FILES=$((FAILED_FILES + 1))
            fi
        else
            print_progress "Restored: $description (no verification)" "success"
            RESTORED_FILES=$((RESTORED_FILES + 1))
        fi
    else
        print_progress "Failed to restore: $description" "error"
        FAILED_FILES=$((FAILED_FILES + 1))
    fi
}

# Function: Restore SSL certificates
restore_ssl_certificates() {
    print_progress "Restoring SSL certificates..." "start"
    
    local i=0
    for cert_backup_path in "${SSL_CERT_BACKUP_PATHS[@]}"; do
        local cert_restore_path="${SSL_CERT_RESTORE_PATHS[$i]}"
        local cert_name=$(basename "$cert_backup_path")
        
        if [ -d "$RESTORE_DIR/$cert_backup_path" ]; then
            if [ "$DRY_RUN" = false ]; then
                mkdir -m 700 -p "$cert_restore_path"
                if cp -a "$RESTORE_DIR/$cert_backup_path"/* "$cert_restore_path/" 2>/dev/null; then
                    print_progress "SSL certs restored: $cert_name" "success"
                    RESTORED_FILES=$((RESTORED_FILES + 1))
                else
                    print_progress "Failed to restore SSL certs: $cert_name" "error"
                    FAILED_FILES=$((FAILED_FILES + 1))
                fi
            else
                print_progress "Would restore SSL certs: $cert_name" "info"
            fi
        else
            print_progress "SSL certs backup not found: $cert_name" "warning"
            SKIPPED_FILES=$((SKIPPED_FILES + 1))
        fi
        
        TOTAL_FILES=$((TOTAL_FILES + 1))
        i=$((i + 1))
    done
}

# Function: Analyze service restart needs
analyze_service_impacts() {
    if [ "$SKIP_SERVICES" = true ] || [ "$DRY_RUN" = true ]; then
        return 0
    fi
    
    print_progress "Analyzing service restart requirements..." "start"
    
    # Check which services are affected by restored files
    for service in "${!SERVICE_IMPACTS[@]}"; do
        local patterns="${SERVICE_IMPACTS[$service]}"
        local affected=false
        
        for backup_rel in "${!INFRASTRUCTURE_FILES[@]}"; do
            for pattern in $patterns; do
                if [[ "$backup_rel" == *"$pattern"* ]]; then
                    affected=true
                    break 2
                fi
            done
        done
        
        if [ "$affected" = true ]; then
            case "$service" in
                "nginx")
                    RESTART_NGINX=true
                    ;;
                "postgresql")
                    RESTART_POSTGRES=true
                    ;;
                "docker")
                    RESTART_DOCKER=true
                    ;;
            esac
        fi
    done
    
    print_progress "Service impact analysis completed" "success"
}

# Function: Prompt for service restarts
prompt_service_restarts() {
    if [ "$SKIP_SERVICES" = true ] || [ "$DRY_RUN" = true ]; then
        return 0
    fi
    
    echo -e "\n${CYAN}🔄 Service Restart Requirements:${NC}"
    
    if [ "$RESTART_NGINX" = true ]; then
        if [ "$FORCE_MODE" = false ]; then
            read -p "Restart nginx? [y/N]: " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                restart_service "nginx"
            fi
        else
            restart_service "nginx"
        fi
    fi
    
    if [ "$RESTART_POSTGRES" = true ]; then
        if [ "$FORCE_MODE" = false ]; then
            read -p "Restart postgresql? [y/N]: " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                restart_service "postgresql"
            fi
        else
            restart_service "postgresql"
        fi
    fi
    
    if [ "$RESTART_DOCKER" = true ]; then
        if [ "$FORCE_MODE" = false ]; then
            read -p "Restart docker containers? [y/N]: " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                restart_docker_containers
            fi
        else
            restart_docker_containers
        fi
    fi
}

# Function: Restart service with error handling
restart_service() {
    local service="$1"
    
    print_progress "Restarting $service..." "start"
    
    if systemctl restart "$service" 2>/dev/null; then
        print_progress "$service restarted successfully" "success"
        
        # Verify service is running
        if systemctl is-active "$service" >/dev/null 2>&1; then
            print_progress "$service is active and running" "success"
        else
            print_progress "$service failed to start properly" "error"
        fi
    else
        print_progress "Failed to restart $service" "error"
    fi
}

# Function: Restart Docker containers
restart_docker_containers() {
    print_progress "Restarting Docker containers..." "start"
    
    # Production containers
    if [ -f "/opt/addypin/docker-compose.yml" ]; then
        cd /opt/addypin
        if docker compose restart 2>/dev/null; then
            print_progress "Production containers restarted" "success"
        else
            print_progress "Failed to restart production containers" "error"
        fi
    fi
    
    # Staging containers
    if [ -f "/opt/addypin-staging/docker-compose.yml" ]; then
        cd /opt/addypin-staging
        if docker compose restart 2>/dev/null; then
            print_progress "Staging containers restarted" "success"
        else
            print_progress "Failed to restart staging containers" "error"
        fi
    fi
}

# Function: Verify restoration
verify_restoration() {
    print_progress "Verifying restoration..." "start"
    
    local verified=0
    local failed_verifications=0
    
    # Verify key files exist and are readable
    for backup_rel in "${!INFRASTRUCTURE_FILES[@]}"; do
        local system_path="${INFRASTRUCTURE_FILES[$backup_rel]}"
        
        if [ -f "$system_path" ] || [ -d "$system_path" ]; then
            verified=$((verified + 1))
        else
            print_progress "Verification failed: $(basename "$system_path")" "warning"
            failed_verifications=$((failed_verifications + 1))
        fi
    done
    
    if [ $failed_verifications -eq 0 ]; then
        print_progress "All files verified successfully ($verified files)" "success"
    else
        print_progress "Verification completed with $failed_verifications missing files" "warning"
    fi
}

# Function: Create restoration manifest
create_restoration_manifest() {
    print_progress "Creating restoration manifest..." "start"
    
    local manifest_file="$LOGS_DIR/restoration_${TIMESTAMP}_manifest.txt"
    
    if [ "$DRY_RUN" = false ]; then
        cat > "$manifest_file" << EOF
AddyPin Foundation Restoration Manifest
======================================

Restoration Details:
   Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')
   Source: $RESTORE_NAME
   Source Path: $RESTORE_DIR
   Hostname: $(hostname)
   User: $(whoami)
   
Safety Backup:
   Location: $SAFETY_BACKUP_DIR
   Created: Yes

Statistics:
   Total Files: $TOTAL_FILES
   Restored Successfully: $RESTORED_FILES
   Failed Restorations: $FAILED_FILES
   Skipped Files: $SKIPPED_FILES

Service Restarts:
   Nginx: $([ "$RESTART_NGINX" = true ] && echo "Required" || echo "Not Required")
   PostgreSQL: $([ "$RESTART_POSTGRES" = true ] && echo "Required" || echo "Not Required")
   Docker: $([ "$RESTART_DOCKER" = true ] && echo "Required" || echo "Not Required")

Files Restored:
--------------
EOF

        # Add restoration details
        for backup_rel in "${!INFRASTRUCTURE_FILES[@]}"; do
            local system_path="${INFRASTRUCTURE_FILES[$backup_rel]}"
            local status="NOT_RESTORED"
            
            if [ -f "$system_path" ] || [ -d "$system_path" ]; then
                status="RESTORED"
            fi
            
            echo "[$status] $backup_rel -> $system_path" >> "$manifest_file"
        done
        
        chmod 600 "$manifest_file"
    fi
    
    print_progress "Restoration manifest created: $manifest_file" "success"
}

# Function: Rollback on failure
rollback_restoration() {
    if [ "$DRY_RUN" = true ]; then
        return 0
    fi
    
    print_progress "CRITICAL: Attempting rollback from safety backup..." "critical"
    
    if [ ! -d "$SAFETY_BACKUP_DIR" ]; then
        print_progress "Safety backup not found - cannot rollback" "error"
        return 1
    fi
    
    local rolled_back=0
    
    # Rollback from safety backup
    for backup_rel in "${!INFRASTRUCTURE_FILES[@]}"; do
        local system_path="${INFRASTRUCTURE_FILES[$backup_rel]}"
        local safety_path="$SAFETY_BACKUP_DIR/$backup_rel"
        
        if [ -f "$safety_path" ] || [ -d "$safety_path" ]; then
            if cp -a "$safety_path" "$system_path" 2>/dev/null; then
                rolled_back=$((rolled_back + 1))
            fi
        fi
    done
    
    print_progress "Rollback completed ($rolled_back files restored)" "success"
}

# Function: Show configuration
show_configuration() {
    echo -e "${CYAN}📋 Restoration Configuration:${NC}"
    echo "   Source: $RESTORE_NAME"
    echo "   Dry Run: $([ "$DRY_RUN" = true ] && echo "YES" || echo "NO")"
    echo "   Force Mode: $([ "$FORCE_MODE" = true ] && echo "YES" || echo "NO")"
    echo "   Skip Services: $([ "$SKIP_SERVICES" = true ] && echo "YES" || echo "NO")"
    echo "   Safety Backup: $([ "$DRY_RUN" = true ] && echo "Would Create" || echo "Will Create")"
    echo ""
}

# Function: Main restoration execution
execute_restoration() {
    print_progress "Starting infrastructure restoration..." "start"
    
    # Restore infrastructure files
    echo -e "\n${CYAN}📂 Restoring infrastructure files:${NC}"
    for backup_rel in "${!INFRASTRUCTURE_FILES[@]}"; do
        local system_path="${INFRASTRUCTURE_FILES[$backup_rel]}"
        restore_file_secure "$backup_rel" "$system_path"
    done
    
    # Restore SSL certificates
    echo -e "\n${CYAN}🔒 Restoring SSL certificates:${NC}"
    restore_ssl_certificates
    
    # Analyze service impacts
    analyze_service_impacts
    
    # Verify restoration
    echo -e "\n${CYAN}✅ Verifying restoration:${NC}"
    verify_restoration
    
    # Create restoration manifest
    create_restoration_manifest
}

# Function: Print final summary
print_summary() {
    echo -e "\n${BLUE}"
    echo "╔══════════════════════════════════════════════╗"
    echo "║            📊 Restoration Summary            ║"
    echo "╚══════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${CYAN}Restoration Details:${NC}"
    echo "   Source: $RESTORE_NAME"
    echo "   Mode: $([ "$DRY_RUN" = true ] && echo "DRY RUN" || echo "LIVE RESTORATION")"
    if [ "$DRY_RUN" = false ]; then
        echo "   Safety Backup: $SAFETY_BACKUP_DIR"
    fi
    echo ""
    
    echo -e "${CYAN}File Statistics:${NC}"
    echo "   📊 Total Files: $TOTAL_FILES"
    echo "   ✅ Restored Successfully: $RESTORED_FILES"
    echo "   ❌ Failed Restorations: $FAILED_FILES"
    echo "   ⏭️  Skipped Files: $SKIPPED_FILES"
    echo ""
    
    # Status indicator
    if [ $FAILED_FILES -eq 0 ]; then
        print_progress "Restoration completed successfully! 🎉" "success"
    else
        print_progress "Restoration completed with $FAILED_FILES failures" "warning"
        print_progress "Check logs and consider rollback if needed" "warning"
    fi
    
    echo ""
    echo -e "${PURPLE}💡 Next Steps:${NC}"
    if [ "$DRY_RUN" = false ]; then
        echo "   1. Review restoration log: $LOG_FILE"
        echo "   2. Test system functionality"
        echo "   3. Monitor service status"
        if [ $FAILED_FILES -gt 0 ]; then
            echo "   4. Consider rollback if issues persist"
        fi
    else
        echo "   1. Review what would be restored above"
        echo "   2. Run without --dry-run to perform actual restoration"
        echo "   3. Ensure you have proper backups before proceeding"
    fi
}

# Main execution function
main() {
    # Initialize logging
    init_logging
    
    # Pre-flight checks
    check_permissions
    
    # Determine what to restore
    determine_restore_source
    list_available_backups
    show_configuration
    
    # Safety confirmation
    if [ "$DRY_RUN" = false ] && [ "$FORCE_MODE" = false ]; then
        echo -e "${YELLOW}⚠️  WARNING: This will overwrite current system files!${NC}"
        read -p "Continue with restoration? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_progress "Restoration cancelled by user" "info"
            exit 0
        fi
    fi
    
    # Verify backup integrity
    verify_backup_integrity
    
    # Create safety backup
    create_safety_backup
    
    # Execute restoration with error handling
    if ! execute_restoration; then
        print_progress "Restoration failed - initiating rollback" "error"
        rollback_restoration
        exit 1
    fi
    
    # Service restart prompts
    prompt_service_restarts
    
    # Final summary
    print_summary
    
    # Exit with appropriate code
    if [ $FAILED_FILES -gt 0 ]; then
        exit 1
    fi
}

# Trap to handle errors and attempt rollback
trap 'if [ $? -ne 0 ] && [ "$DRY_RUN" = false ]; then rollback_restoration; fi' EXIT

# Run main function
main "$@"