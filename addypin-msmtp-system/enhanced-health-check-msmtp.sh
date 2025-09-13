#!/bin/bash

# Enhanced AddyPin Health Check with MSMTP Email Alerts
# Integrates with existing monitoring and sends email alerts

LOG_FILE="/var/log/addypin-health.log"
ALERT_SCRIPT="/opt/addypin/scripts/send-health-alert.sh"
ISSUES=0
WARNINGS=0

# Ensure log file exists
touch "$LOG_FILE"

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

check_service() {
    local service="$1"
    local description="$2"
    
    if systemctl is-active --quiet "$service"; then
        log_message "INFO: ✅ $service healthy - $description"
        echo "✅ $service: Running ($description)"
        return 0
    else
        log_message "ERROR: ❌ $service FAILED - $description"
        echo "❌ $service: FAILED ($description)"
        ((ISSUES++))
        return 1
    fi
}

check_container() {
    local container="$1"
    
    if docker ps --format "{{.Names}}" | grep -q "^${container}$"; then
        log_message "INFO: ✅ Container $container healthy"
        echo "✅ Container $container: Running"
        return 0
    else
        log_message "ERROR: ❌ Container $container FAILED or not running"
        echo "❌ Container $container: FAILED"
        ((ISSUES++))
        return 1
    fi
}

check_resource() {
    local resource="$1"
    local threshold="$2"
    local value="$3"
    local unit="$4"
    
    if [[ $value -gt $threshold ]]; then
        log_message "WARNING: ⚠️ $resource usage high - ${value}${unit} (threshold: ${threshold}${unit})"
        echo "⚠️ $resource: ${value}${unit} (Warning: >${threshold}${unit})"
        ((WARNINGS++))
        return 1
    else
        log_message "INFO: ✅ $resource usage normal - ${value}${unit}"
        echo "✅ $resource: ${value}${unit} (Normal)"
        return 0
    fi
}

# Start enhanced health check
log_message "INFO: 🔍 Starting enhanced AddyPin health check with email alerts"
echo "🔍 Enhanced AddyPin Health Check Starting..."
echo "============================================="

# Check critical system services
echo ""
echo "🔧 System Services:"
check_service "nginx" "Web server and reverse proxy"
check_service "docker" "Container runtime platform"
check_service "postgresql" "Database service"

# Check Docker containers
echo ""
echo "🐳 Docker Containers:"
if systemctl is-active --quiet docker; then
    # Get all running AddyPin containers
    CONTAINERS=$(docker ps --format "{{.Names}}" | grep -E "(addypin|staging)" || echo "")
    
    if [[ -n "$CONTAINERS" ]]; then
        while IFS= read -r container; do
            [[ -n "$container" ]] && check_container "$container"
        done <<< "$CONTAINERS"
    else
        log_message "INFO: ℹ️ No AddyPin containers found running"
        echo "ℹ️ No AddyPin containers currently running"
    fi
else
    log_message "ERROR: ❌ Docker service not running - cannot check containers"
    echo "❌ Docker service not running - cannot check containers"
fi

# Resource usage checks
echo ""
echo "📊 Resource Usage:"

# Disk usage check
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
check_resource "Disk" 80 "$DISK_USAGE" "%"

# Memory usage check
MEMORY_USAGE=$(free | grep '^Mem:' | awk '{printf "%.0f", ($3/$2)*100}')
check_resource "Memory" 85 "$MEMORY_USAGE" "%"

# Load average check
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
LOAD_THRESHOLD=4
if (( $(echo "$LOAD_AVG > $LOAD_THRESHOLD" | bc -l) )); then
    log_message "WARNING: ⚠️ Load average high - $LOAD_AVG (threshold: $LOAD_THRESHOLD)"
    echo "⚠️ Load Average: $LOAD_AVG (Warning: >$LOAD_THRESHOLD)"
    ((WARNINGS++))
else
    log_message "INFO: ✅ Load average normal - $LOAD_AVG"
    echo "✅ Load Average: $LOAD_AVG (Normal)"
fi

# Check AddyPin-specific services
echo ""
echo "🏗️ AddyPin Infrastructure:"

# Check backup system
if [[ -f "/opt/addypin-foundation-backup/scripts/setup-automated-backups.sh" ]]; then
    BACKUP_STATUS=$(crontab -l 2>/dev/null | grep -q "backup-foundation.sh" && echo "Active" || echo "Not scheduled")
    if [[ "$BACKUP_STATUS" == "Active" ]]; then
        log_message "INFO: ✅ Backup automation active"
        echo "✅ Backup System: Automated ($BACKUP_STATUS)"
    else
        log_message "WARNING: ⚠️ Backup automation not scheduled"
        echo "⚠️ Backup System: Manual only ($BACKUP_STATUS)"
        ((WARNINGS++))
    fi
else
    log_message "ERROR: ❌ Backup system not found"
    echo "❌ Backup System: Not installed"
    ((ISSUES++))
fi

# Check MSMTP email system
if command -v msmtp >/dev/null 2>&1; then
    if [[ -f "/root/.msmtprc" ]]; then
        log_message "INFO: ✅ MSMTP email system configured"
        echo "✅ Email Alerts: MSMTP configured"
    else
        log_message "WARNING: ⚠️ MSMTP installed but not configured"
        echo "⚠️ Email Alerts: MSMTP not configured"
        ((WARNINGS++))
    fi
else
    log_message "WARNING: ⚠️ MSMTP not installed"
    echo "⚠️ Email Alerts: MSMTP not installed"
    ((WARNINGS++))
fi

# Summary and alerting
echo ""
echo "📋 Health Check Summary:"
echo "======================="
log_message "INFO: 📊 Health check completed - Issues: $ISSUES, Warnings: $WARNINGS"

if [[ $ISSUES -gt 0 ]]; then
    echo "🔴 Status: CRITICAL ($ISSUES critical issues found)"
    
    # Send critical alert if email system is available
    if [[ -f "$ALERT_SCRIPT" ]] && command -v msmtp >/dev/null 2>&1; then
        log_message "INFO: 📧 Sending critical alert email"
        "$ALERT_SCRIPT" critical "Health check found $ISSUES critical infrastructure issues and $WARNINGS warnings"
    fi
    
elif [[ $WARNINGS -gt 0 ]]; then
    echo "🟡 Status: WARNING ($WARNINGS warnings found)"
    
    # Send warning alert if email system is available
    if [[ -f "$ALERT_SCRIPT" ]] && command -v msmtp >/dev/null 2>&1; then
        log_message "INFO: 📧 Sending warning alert email"
        "$ALERT_SCRIPT" warning "Health check found $WARNINGS warnings requiring attention"
    fi
    
else
    echo "✅ Status: HEALTHY (All systems operational)"
    log_message "INFO: ✅ All AddyPin systems healthy"
fi

echo ""
echo "🔧 Quick Actions:"
echo "  View logs: tail -f $LOG_FILE"
echo "  Manual alert: /opt/addypin/health-manager.sh alert 'your message'"
echo "  Backup status: /opt/addypin-foundation-backup/scripts/setup-automated-backups.sh --status"

# Set appropriate exit codes for automation
if [[ $ISSUES -gt 0 ]]; then
    exit 1
elif [[ $WARNINGS -gt 0 ]]; then
    exit 2
else
    exit 0
fi