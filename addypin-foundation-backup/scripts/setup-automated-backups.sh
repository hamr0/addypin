#!/bin/bash

# AddyPin Foundation Backup Automation Setup
# Sets up bi-weekly automated backups with monitoring integration
# Usage: ./setup-automated-backups.sh [--install] [--uninstall] [--status]

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_SCRIPT="$SCRIPT_DIR/backup-foundation.sh"
MONITOR_SCRIPT="$SCRIPT_DIR/backup-status-monitor.sh"

# Cron configuration - Every other Sunday at 2:00 AM
# The expression $(expr $(date +\%W) \% 2) calculates if the current week is even (0) or odd (1)
# We want to run on even weeks (every other week)
CRON_SCHEDULE='0 2 * * 0'
CRON_CONDITION='[ $(expr $(date +\%W) \% 2) -eq 0 ]'
CRON_COMMAND="$BACKUP_SCRIPT --auto"
CRON_ENTRY="$CRON_SCHEDULE $CRON_CONDITION && $CRON_COMMAND >> /var/log/addypin-backup-cron.log 2>&1"

# Parse arguments
ACTION=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --install)
            ACTION="install"
            shift
            ;;
        --uninstall)
            ACTION="uninstall"
            shift
            ;;
        --status)
            ACTION="status"
            shift
            ;;
        -h|--help)
            echo "AddyPin Foundation Backup Automation Setup"
            echo "Usage: $0 [--install] [--uninstall] [--status]"
            echo ""
            echo "Options:"
            echo "  --install    Install automated bi-weekly backup cron job"
            echo "  --uninstall  Remove automated backup cron job"
            echo "  --status     Show current automation status"
            echo "  --help       Show this help message"
            echo ""
            echo "Backup Schedule: Every other Sunday at 2:00 AM"
            echo "Log File: /var/log/addypin-backup-cron.log"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Default to status if no action specified
if [ -z "$ACTION" ]; then
    ACTION="status"
fi

# Banner
print_banner() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════╗"
    echo "║        🕐 AddyPin Backup Automation          ║"
    echo "║            Bi-weekly Scheduled Backups      ║"
    echo "╚══════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Function: Check prerequisites
check_prerequisites() {
    local errors=0
    
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Check if backup script exists and is executable
    if [ ! -f "$BACKUP_SCRIPT" ]; then
        echo -e "${RED}❌ Backup script not found: $BACKUP_SCRIPT${NC}"
        errors=$((errors + 1))
    elif [ ! -x "$BACKUP_SCRIPT" ]; then
        echo -e "${YELLOW}⚠️  Making backup script executable...${NC}"
        chmod +x "$BACKUP_SCRIPT"
    fi
    
    # Check if monitor script exists and is executable  
    if [ ! -f "$MONITOR_SCRIPT" ]; then
        echo -e "${RED}❌ Monitor script not found: $MONITOR_SCRIPT${NC}"
        errors=$((errors + 1))
    elif [ ! -x "$MONITOR_SCRIPT" ]; then
        echo -e "${YELLOW}⚠️  Making monitor script executable...${NC}"
        chmod +x "$MONITOR_SCRIPT"
    fi
    
    # Check if running as root (needed for cron installation)
    if [ "$EUID" -ne 0 ] && [ "$ACTION" = "install" ]; then
        echo -e "${YELLOW}⚠️  Root access recommended for cron installation${NC}"
        echo -e "${YELLOW}    Run: sudo $0 --install${NC}"
    fi
    
    # Test backup script with dry run
    if [ -x "$BACKUP_SCRIPT" ]; then
        echo -e "${BLUE}🧪 Testing backup script...${NC}"
        if "$BACKUP_SCRIPT" --dry-run --auto >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Backup script test successful${NC}"
        else
            echo -e "${RED}❌ Backup script test failed${NC}"
            errors=$((errors + 1))
        fi
    fi
    
    if [ $errors -gt 0 ]; then
        echo -e "${RED}❌ Prerequisites check failed ($errors errors)${NC}"
        return 1
    else
        echo -e "${GREEN}✅ All prerequisites met${NC}"
        return 0
    fi
}

# Function: Install automation
install_automation() {
    echo -e "${BLUE}📅 Installing bi-weekly backup automation...${NC}"
    
    # Create log directory
    sudo mkdir -p "$(dirname /var/log/addypin-backup-cron.log)"
    sudo touch /var/log/addypin-backup-cron.log
    sudo chmod 644 /var/log/addypin-backup-cron.log
    
    # Check if cron entry already exists
    if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT --auto"; then
        echo -e "${YELLOW}⚠️  Backup automation already installed${NC}"
        echo -e "${BLUE}ℹ️  Use --uninstall to remove existing automation${NC}"
        return 0
    fi
    
    # Create temporary cron file
    local temp_cron=$(mktemp)
    
    # Get existing crontab (if any)
    crontab -l 2>/dev/null > "$temp_cron" || true
    
    # Add backup cron entry with comment
    echo "# AddyPin Foundation Backup - Every other Sunday at 2:00 AM" >> "$temp_cron"
    echo "$CRON_ENTRY" >> "$temp_cron"
    echo "" >> "$temp_cron"
    
    # Install new crontab
    if crontab "$temp_cron"; then
        echo -e "${GREEN}✅ Backup automation installed successfully${NC}"
        echo -e "${BLUE}📅 Schedule: Every other Sunday at 2:00 AM${NC}"
        echo -e "${BLUE}📝 Log file: /var/log/addypin-backup-cron.log${NC}"
        
        # Set up log rotation for cron log
        create_logrotate_config
    else
        echo -e "${RED}❌ Failed to install cron job${NC}"
        rm -f "$temp_cron"
        return 1
    fi
    
    # Clean up
    rm -f "$temp_cron"
    
    # Show next run time
    show_next_run_time
}

# Function: Uninstall automation
uninstall_automation() {
    echo -e "${BLUE}🗑️  Removing backup automation...${NC}"
    
    # Check if cron entry exists
    if ! crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT --auto"; then
        echo -e "${YELLOW}⚠️  Backup automation not found${NC}"
        return 0
    fi
    
    # Create temporary cron file
    local temp_cron=$(mktemp)
    
    # Get existing crontab and remove backup entries
    crontab -l 2>/dev/null | grep -v "AddyPin Foundation Backup" | grep -v "$BACKUP_SCRIPT --auto" > "$temp_cron"
    
    # Install cleaned crontab
    if crontab "$temp_cron"; then
        echo -e "${GREEN}✅ Backup automation removed successfully${NC}"
    else
        echo -e "${RED}❌ Failed to remove cron job${NC}"
        rm -f "$temp_cron"
        return 1
    fi
    
    # Clean up
    rm -f "$temp_cron"
    
    # Remove logrotate config
    if [ -f "/etc/logrotate.d/addypin-backup-cron" ]; then
        sudo rm -f "/etc/logrotate.d/addypin-backup-cron"
        echo -e "${GREEN}✅ Logrotate configuration removed${NC}"
    fi
}

# Function: Show status
show_status() {
    echo -e "${BLUE}📊 Backup Automation Status${NC}"
    echo "==============================="
    
    # Check cron job status
    if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT --auto"; then
        echo -e "Automation: ${GREEN}✅ INSTALLED${NC}"
        echo -e "Schedule: Every other Sunday at 2:00 AM"
        
        # Show cron entry
        echo ""
        echo -e "${PURPLE}Current cron entry:${NC}"
        crontab -l 2>/dev/null | grep -A1 -B1 "$BACKUP_SCRIPT --auto"
        
        show_next_run_time
        
    else
        echo -e "Automation: ${RED}❌ NOT INSTALLED${NC}"
        echo -e "Run: ${YELLOW}$0 --install${NC} to set up automation"
    fi
    
    echo ""
    
    # Show recent backup status
    if [ -x "$MONITOR_SCRIPT" ]; then
        echo -e "${BLUE}📊 Recent Backup Status${NC}"
        echo "========================"
        "$MONITOR_SCRIPT"
    fi
    
    # Show log file info
    if [ -f "/var/log/addypin-backup-cron.log" ]; then
        echo ""
        echo -e "${BLUE}📝 Cron Log Status${NC}"
        echo "=================="
        local log_size=$(du -h /var/log/addypin-backup-cron.log | cut -f1)
        local log_lines=$(wc -l < /var/log/addypin-backup-cron.log)
        echo "Log file: /var/log/addypin-backup-cron.log"
        echo "Size: $log_size"
        echo "Lines: $log_lines"
        
        # Show last few lines if log exists and has content
        if [ "$log_lines" -gt 0 ]; then
            echo ""
            echo "Recent log entries:"
            tail -n 5 /var/log/addypin-backup-cron.log
        fi
    fi
}

# Function: Calculate and show next run time
show_next_run_time() {
    echo ""
    echo -e "${PURPLE}⏰ Next Backup Times${NC}"
    echo "===================="
    
    # Calculate next few Sundays and check which are on even weeks
    local current_date=$(date +%Y-%m-%d)
    local current_week=$(date +%W)
    
    echo "Current week number: $current_week"
    
    # Find next 4 Sundays and show which will trigger backups
    for i in {0..3}; do
        # Calculate next Sunday (0=Sunday)
        local days_until_sunday=$(( (7 - $(date +%w)) % 7 ))
        if [ $days_until_sunday -eq 0 ] && [ $i -eq 0 ]; then
            days_until_sunday=7  # If today is Sunday, get next Sunday
        fi
        
        local target_days=$((days_until_sunday + (i * 7)))
        local target_date=$(date -d "+${target_days} days" +%Y-%m-%d)
        local target_week=$(date -d "+${target_days} days" +%W)
        local is_even_week=$(( target_week % 2 ))
        
        if [ $is_even_week -eq 0 ]; then
            echo -e "${GREEN}✅ $target_date (Week $target_week) - BACKUP SCHEDULED${NC}"
        else
            echo -e "${YELLOW}⏸️  $target_date (Week $target_week) - Skipped (odd week)${NC}"
        fi
    done
}

# Function: Create logrotate configuration
create_logrotate_config() {
    echo -e "${BLUE}📝 Setting up log rotation...${NC}"
    
    local logrotate_config="/etc/logrotate.d/addypin-backup-cron"
    
    sudo tee "$logrotate_config" > /dev/null << EOF
/var/log/addypin-backup-cron.log {
    weekly
    rotate 8
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
EOF
    
    if [ -f "$logrotate_config" ]; then
        echo -e "${GREEN}✅ Log rotation configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Could not create log rotation config${NC}"
    fi
}

# Function: Test backup automation
test_automation() {
    echo -e "${BLUE}🧪 Testing backup automation...${NC}"
    
    # Run backup with dry-run and auto flags
    if "$BACKUP_SCRIPT" --dry-run --auto; then
        echo -e "${GREEN}✅ Backup automation test successful${NC}"
    else
        echo -e "${RED}❌ Backup automation test failed${NC}"
        return 1
    fi
}

# Main execution
main() {
    print_banner
    
    case "$ACTION" in
        "install")
            if check_prerequisites; then
                install_automation
                echo ""
                test_automation
            fi
            ;;
        "uninstall")
            uninstall_automation
            ;;
        "status")
            check_prerequisites
            echo ""
            show_status
            ;;
        *)
            echo -e "${RED}❌ Unknown action: $ACTION${NC}"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"