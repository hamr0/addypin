#!/bin/bash

# AddyPin Health Alert Email System via MSMTP
# Professional HTML-formatted email alerts

ALERT_TYPE="${1:-manual}"
CUSTOM_MESSAGE="$2"
TO_EMAIL="${EMAIL_RECIPIENT:-avoidaccess@gmail.com}"
LOG_FILE="/var/log/addypin-health.log"

# Get recent error logs from existing AddyPin monitoring
ERROR_LOGS=$(tail -20 "$LOG_FILE" 2>/dev/null | grep -E "❌|ERROR.*FAILED" | tail -10)
if [[ -z "$ERROR_LOGS" ]]; then
    ERROR_LOGS="No recent errors found in logs"
fi

# Alert type configuration
case $ALERT_TYPE in
    "critical")
        SUBJECT="🔴 CRITICAL: AddyPin Infrastructure Alert"
        PRIORITY="Critical"
        COLOR="#dc3545"
        ;;
    "warning")
        SUBJECT="🟡 WARNING: AddyPin Resource Alert"
        PRIORITY="Warning"
        COLOR="#ffc107"
        ;;
    "backup")
        SUBJECT="💾 BACKUP: AddyPin Foundation Backup Alert"
        PRIORITY="Backup"
        COLOR="#6f42c1"
        ;;
    "test")
        SUBJECT="✅ TEST: AddyPin Monitoring System"
        PRIORITY="Test"
        COLOR="#28a745"
        ;;
    *)
        SUBJECT="📢 MANUAL: AddyPin System Notification"
        PRIORITY="Manual"
        COLOR="#007bff"
        ;;
esac

# Generate AddyPin-branded HTML email
cat << EMAIL_EOF | mail -a "Content-Type: text/html" -s "$SUBJECT" "$TO_EMAIL"
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: $COLOR; color: white; padding: 20px; text-align: center; }
        .header h2 { margin: 0; font-size: 24px; }
        .content { padding: 20px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0; }
        .info-item { padding: 10px; background: #f8f9fa; border-radius: 4px; }
        .info-label { font-weight: bold; color: #495057; }
        .logs { background: #f8f9fa; padding: 15px; border-left: 4px solid $COLOR; margin: 20px 0; border-radius: 4px; }
        .footer { background: #e9ecef; padding: 15px; color: #6c757d; }
        .footer strong { color: #495057; }
        pre { background: #ffffff; padding: 10px; border: 1px solid #dee2e6; border-radius: 4px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>🏗️ AddyPin Infrastructure Alert</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">$PRIORITY Level Alert</p>
        </div>
        <div class="content">
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Alert Type:</div>
                    <div>$PRIORITY</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Server:</div>
                    <div>155.94.144.191</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Platform:</div>
                    <div>AddyPin VPS (AlmaLinux)</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Timestamp:</div>
                    <div>$(date)</div>
                </div>
            </div>
            ${CUSTOM_MESSAGE:+<div style="background: #e3f2fd; padding: 15px; border-radius: 4px; margin: 15px 0;"><strong>Alert Message:</strong><br>$CUSTOM_MESSAGE</div>}
        </div>
        <div class="logs">
            <h3 style="margin-top: 0; color: #495057;">📋 Recent System Logs:</h3>
            <pre>$ERROR_LOGS</pre>
        </div>
        <div class="footer">
            <div style="margin-bottom: 10px;"><strong>🔧 Quick Actions:</strong></div>
            <div><strong>SSH Access:</strong> ssh root@155.94.144.191</div>
            <div><strong>Health Check:</strong> /opt/addypin/scripts/enhanced-health-check.sh</div>
            <div><strong>Backup Status:</strong> /opt/addypin-foundation-backup/scripts/setup-automated-backups.sh --status</div>
            <div><strong>Live Monitoring:</strong> /opt/addypin/health-manager.sh enhanced</div>
        </div>
    </div>
</body>
</html>
EMAIL_EOF

# Log the alert
echo "$(date): $PRIORITY alert sent to $TO_EMAIL - $CUSTOM_MESSAGE" >> "$LOG_FILE"

# Exit code for automation
if [[ "$ALERT_TYPE" == "critical" ]]; then
    exit 1
elif [[ "$ALERT_TYPE" == "warning" ]]; then
    exit 2
else
    exit 0
fi