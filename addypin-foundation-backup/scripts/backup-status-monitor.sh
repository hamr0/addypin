#!/bin/bash

# AddyPin Foundation Backup Status Monitor
# Checks the status of the most recent backup and reports to monitoring system
# Usage: ./backup-status-monitor.sh [--json] [--alert-if-stale]

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="$(dirname "$SCRIPT_DIR")"
VERSIONED_DIR="$BACKUP_ROOT/versioned"
LOGS_DIR="$BACKUP_ROOT/logs"

# Options
JSON_OUTPUT=false
ALERT_IF_STALE=false
STALE_THRESHOLD_HOURS=336  # 14 days (bi-weekly + 2 day buffer)

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        --alert-if-stale)
            ALERT_IF_STALE=true
            shift
            ;;
        -h|--help)
            echo "AddyPin Foundation Backup Status Monitor"
            echo "Usage: $0 [--json] [--alert-if-stale]"
            echo ""
            echo "Options:"
            echo "  --json           Output status in JSON format"
            echo "  --alert-if-stale Exit with error code if backup is stale"
            echo "  --help          Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Function: Get most recent backup info
get_recent_backup_info() {
    if [ ! -d "$VERSIONED_DIR" ]; then
        echo ""
        return 1
    fi
    
    # Find the most recent backup directory
    local recent_backup=$(find "$VERSIONED_DIR" -maxdepth 1 -type d -name "2*" | sort | tail -n 1)
    
    if [ -z "$recent_backup" ]; then
        echo ""
        return 1
    fi
    
    echo "$recent_backup"
    return 0
}

# Function: Get backup status from manifest
get_backup_status() {
    local backup_dir="$1"
    local manifest_file="$backup_dir/BACKUP_MANIFEST.txt"
    
    if [ ! -f "$manifest_file" ]; then
        echo "UNKNOWN"
        return 1
    fi
    
    # Parse manifest for statistics
    local total_files=$(grep "Total Files:" "$manifest_file" | awk '{print $3}' || echo "0")
    local copied_files=$(grep "Copied Successfully:" "$manifest_file" | awk '{print $3}' || echo "0")
    local missing_files=$(grep "Missing Files:" "$manifest_file" | awk '{print $3}' || echo "0")
    local error_files=$(grep "Error Files:" "$manifest_file" | awk '{print $3}' || echo "0")
    
    # Determine overall status
    if [ "$error_files" -gt 0 ]; then
        echo "ERROR"
    elif [ "$missing_files" -gt 0 ]; then
        echo "WARNING"
    elif [ "$copied_files" -gt 0 ]; then
        echo "SUCCESS"
    else
        echo "UNKNOWN"
    fi
    
    return 0
}

# Function: Calculate backup age in hours
get_backup_age_hours() {
    local backup_dir="$1"
    local backup_name=$(basename "$backup_dir")
    
    # Extract timestamp from backup directory name (format: YYYYMMDD_HHMMSS)
    if [[ $backup_name =~ ^([0-9]{8})_([0-9]{6})$ ]]; then
        local date_part="${BASH_REMATCH[1]}"
        local time_part="${BASH_REMATCH[2]}"
        
        # Convert to format suitable for date command
        local backup_datetime="${date_part:0:4}-${date_part:4:2}-${date_part:6:2} ${time_part:0:2}:${time_part:2:2}:${time_part:4:2}"
        
        # Get backup timestamp and current timestamp
        local backup_epoch=$(date -d "$backup_datetime" +%s 2>/dev/null || echo "0")
        local current_epoch=$(date +%s)
        
        if [ "$backup_epoch" -gt 0 ]; then
            local age_seconds=$((current_epoch - backup_epoch))
            local age_hours=$((age_seconds / 3600))
            echo "$age_hours"
        else
            echo "-1"  # Invalid timestamp
        fi
    else
        echo "-1"  # Invalid format
    fi
}

# Function: Get backup size
get_backup_size() {
    local backup_dir="$1"
    if [ -d "$backup_dir" ]; then
        du -sh "$backup_dir" 2>/dev/null | cut -f1 || echo "Unknown"
    else
        echo "Unknown"
    fi
}

# Main function
main() {
    local recent_backup_dir
    local backup_status="NO_BACKUP"
    local backup_age_hours="-1"
    local backup_size="0"
    local backup_timestamp="Never"
    local is_stale="false"
    local alert_status="OK"
    local backup_name=""
    
    # Get recent backup info
    recent_backup_dir=$(get_recent_backup_info)
    
    if [ -n "$recent_backup_dir" ] && [ -d "$recent_backup_dir" ]; then
        backup_name=$(basename "$recent_backup_dir")
        backup_status=$(get_backup_status "$recent_backup_dir")
        backup_age_hours=$(get_backup_age_hours "$recent_backup_dir")
        backup_size=$(get_backup_size "$recent_backup_dir")
        
        # Format timestamp for display
        if [[ $backup_name =~ ^([0-9]{8})_([0-9]{6})$ ]]; then
            local date_part="${BASH_REMATCH[1]}"
            local time_part="${BASH_REMATCH[2]}"
            backup_timestamp="${date_part:0:4}-${date_part:4:2}-${date_part:6:2} ${time_part:0:2}:${time_part:2:2}:${time_part:4:2}"
        fi
        
        # Check if backup is stale
        if [ "$backup_age_hours" -ge "$STALE_THRESHOLD_HOURS" ]; then
            is_stale="true"
            alert_status="STALE"
        elif [ "$backup_status" = "ERROR" ]; then
            alert_status="ERROR"
        elif [ "$backup_status" = "WARNING" ]; then
            alert_status="WARNING"
        fi
    else
        alert_status="NO_BACKUP"
    fi
    
    # Output results
    if [ "$JSON_OUTPUT" = true ]; then
        # JSON output for monitoring systems
        cat << EOF
{
  "service": "addypin-foundation-backup",
  "status": "$backup_status",
  "alert_status": "$alert_status",
  "last_backup": {
    "name": "$backup_name",
    "timestamp": "$backup_timestamp",
    "age_hours": $backup_age_hours,
    "size": "$backup_size",
    "is_stale": $is_stale
  },
  "thresholds": {
    "stale_hours": $STALE_THRESHOLD_HOURS
  },
  "check_time": "$(date -u '+%Y-%m-%d %H:%M:%S UTC')"
}
EOF
    else
        # Human readable output
        echo -e "${BLUE}AddyPin Foundation Backup Status${NC}"
        echo "========================================"
        echo -e "Overall Status: $(case $alert_status in
            "OK") echo -e "${GREEN}✅ OK${NC}" ;;
            "WARNING") echo -e "${YELLOW}⚠️  WARNING${NC}" ;;
            "ERROR") echo -e "${RED}❌ ERROR${NC}" ;;
            "STALE") echo -e "${RED}🕐 STALE${NC}" ;;
            "NO_BACKUP") echo -e "${RED}❌ NO BACKUP FOUND${NC}" ;;
        esac)"
        
        if [ -n "$backup_name" ]; then
            echo "Last Backup: $backup_timestamp"
            echo "Backup Name: $backup_name"
            echo "Age: ${backup_age_hours} hours"
            echo "Size: $backup_size"
            echo "Status: $backup_status"
            
            if [ "$is_stale" = "true" ]; then
                echo -e "${RED}⚠️  Backup is older than $STALE_THRESHOLD_HOURS hours ($(($STALE_THRESHOLD_HOURS / 24)) days)${NC}"
            fi
        else
            echo "No backups found in: $VERSIONED_DIR"
        fi
        
        echo ""
        echo "Checked: $(date)"
    fi
    
    # Exit with error code if alerting is enabled and there's an issue
    if [ "$ALERT_IF_STALE" = true ]; then
        case $alert_status in
            "OK"|"WARNING")
                exit 0
                ;;
            *)
                exit 1
                ;;
        esac
    fi
}

# Run main function
main "$@"