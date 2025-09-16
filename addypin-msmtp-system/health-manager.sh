#!/bin/bash

# AddyPin Health Management System
# Unified monitoring with MSMTP email integration

SCRIPT_DIR="/opt/addypin/scripts"
BACKUP_SCRIPT_DIR="/opt/addypin-foundation-backup/scripts"
LOG_FILE="/var/log/addypin-health.log"
MSMTP_ALERT_SCRIPT="$SCRIPT_DIR/send-health-alert.sh"

# Ensure log file exists
touch "$LOG_FILE"

case "$1" in
    "test-email")
        echo "🧪 Testing AddyPin email notification system..."
        if [[ -f "$MSMTP_ALERT_SCRIPT" ]]; then
            "$MSMTP_ALERT_SCRIPT" test "AddyPin MSMTP email system test - $(date)"
            echo "✅ Test email sent to avoidaccess@gmail.com"
            echo "📧 Check your Gmail inbox in 30-60 seconds"
        else
            echo "❌ Email alert script not found: $MSMTP_ALERT_SCRIPT"
            echo "💡 Run setup commands to install MSMTP system"
        fi
        ;;
    
    "enhanced")
        echo "🔍 Running enhanced AddyPin health check with email alerts..."
        if [[ -f "$SCRIPT_DIR/enhanced-health-check.sh" ]]; then
            "$SCRIPT_DIR/enhanced-health-check.sh"
        else
            echo "❌ Enhanced health check not found"
            echo "📍 Expected location: $SCRIPT_DIR/enhanced-health-check.sh"
        fi
        ;;
    
    "backup-status")
        echo "💾 Checking AddyPin Foundation Backup system status..."
        if [[ -f "$BACKUP_SCRIPT_DIR/setup-automated-backups.sh" ]]; then
            "$BACKUP_SCRIPT_DIR/setup-automated-backups.sh" --status
        else
            echo "❌ Backup automation script not found"
            echo "📍 Expected location: $BACKUP_SCRIPT_DIR/setup-automated-backups.sh"
        fi
        ;;
    
    "backup-test")
        echo "🧪 Testing AddyPin Foundation Backup system (dry-run)..."
        if [[ -f "$BACKUP_SCRIPT_DIR/backup-foundation.sh" ]]; then
            "$BACKUP_SCRIPT_DIR/backup-foundation.sh" --dry-run
        else
            echo "❌ Backup script not found"
            echo "📍 Expected location: $BACKUP_SCRIPT_DIR/backup-foundation.sh"
        fi
        ;;
    
    "backup-alert")
        echo "💾 Sending backup status alert..."
        BACKUP_STATUS=$("$BACKUP_SCRIPT_DIR/setup-automated-backups.sh" --status 2>/dev/null | grep -E "(INSTALLED|NOT FOUND)" | head -1)
        "$MSMTP_ALERT_SCRIPT" backup "Backup system status check requested: $BACKUP_STATUS"
        echo "✅ Backup alert sent"
        ;;
    
    "alert")
        if [[ -n "$2" ]]; then
            echo "📢 Sending manual AddyPin alert..."
            "$MSMTP_ALERT_SCRIPT" manual "$2"
            echo "✅ Manual alert sent: $2"
        else
            echo "❌ Usage: $0 alert 'Your message'"
            echo "💡 Example: $0 alert 'Testing manual notification system'"
        fi
        ;;
    
    "setup-cron")
        echo "⏰ Setting up automated AddyPin monitoring cron job..."
        # Add enhanced health check to cron (every 10 minutes)
        (crontab -l 2>/dev/null; echo "*/10 * * * * /opt/addypin/scripts/enhanced-health-check.sh >/dev/null 2>&1") | crontab -
        echo "✅ Automated monitoring enabled (every 10 minutes)"
        echo "📋 Current cron jobs:"
        crontab -l | grep -E "(health|backup)" || echo "No monitoring cron jobs found"
        ;;
    
    "logs")
        echo "📋 Recent AddyPin health logs:"
        if [[ -f "$LOG_FILE" ]]; then
            tail -20 "$LOG_FILE"
        else
            echo "❌ Log file not found: $LOG_FILE"
        fi
        ;;
    
    "status")
        echo "📊 AddyPin System Status Overview:"
        echo "=================================="
        
        # MSMTP Status
        if command -v msmtp >/dev/null 2>&1; then
            echo "✅ MSMTP: Installed"
        else
            echo "❌ MSMTP: Not installed"
        fi
        
        # Health Scripts Status
        if [[ -f "$MSMTP_ALERT_SCRIPT" ]]; then
            echo "✅ Email Alerts: Ready"
        else
            echo "❌ Email Alerts: Not configured"
        fi
        
        # Backup System Status
        if [[ -f "$BACKUP_SCRIPT_DIR/setup-automated-backups.sh" ]]; then
            echo "✅ Backup System: Available"
        else
            echo "❌ Backup System: Not found"
        fi
        
        # Docker Status
        if systemctl is-active --quiet docker; then
            echo "✅ Docker: Running"
        else
            echo "❌ Docker: Not running"
        fi
        
        # Nginx Status
        if systemctl is-active --quiet nginx; then
            echo "✅ Nginx: Running"
        else
            echo "❌ Nginx: Not running"
        fi
        ;;
    
    *)
        echo "🏗️ AddyPin Health Manager Commands:"
        echo "===================================="
        echo ""
        echo "📧 Email & Monitoring:"
        echo "  test-email      - Test MSMTP email notification system"
        echo "  enhanced        - Run enhanced health check with email alerts"
        echo "  alert 'msg'     - Send manual alert email"
        echo ""
        echo "💾 Backup System:"
        echo "  backup-status   - Check foundation backup system status"
        echo "  backup-test     - Test backup system (dry-run)"
        echo "  backup-alert    - Send backup status email"
        echo ""
        echo "⚙️ System Management:"
        echo "  setup-cron      - Enable automated monitoring cron jobs"
        echo "  status          - Show overall system status"
        echo "  logs            - View recent health logs"
        echo ""
        echo "🎯 Quick Start:"
        echo "  1. Install MSMTP: dnf install -y msmtp mailx libgsasl"
        echo "  2. Configure Gmail: Setup /root/.msmtprc with app password"
        echo "  3. Test emails: ./health-manager.sh test-email"
        ;;
esac