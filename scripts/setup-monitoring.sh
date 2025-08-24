#!/bin/bash

# 📊 AddyPin Monitoring Setup Script
# Sets up comprehensive monitoring with cron jobs and alerting
# Usage: sudo ./scripts/setup-monitoring.sh

set -e

echo "📊 Setting up AddyPin Monitoring System"
echo "========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run this script with sudo privileges"
    exit 1
fi

# Configuration
SCRIPT_DIR="/opt/addypin/monitoring"
LOG_DIR="/var/log/addypin"
CRON_USER="root"

# Create monitoring directories
echo "📁 Creating monitoring directories..."
mkdir -p $SCRIPT_DIR
mkdir -p $LOG_DIR

# Copy monitoring scripts
echo "📋 Installing monitoring scripts..."
cp scripts/system-monitor.sh $SCRIPT_DIR/
cp scripts/auto-recovery.sh $SCRIPT_DIR/
chmod +x $SCRIPT_DIR/*.sh

# Create monitoring configuration
cat > $SCRIPT_DIR/monitor.conf << EOF
# AddyPin Monitoring Configuration
HEALTH_URL="https://addypin.com/api/health"
SYSTEM_URL="https://addypin.com/api/health/system"
LOCAL_HEALTH_URL="http://localhost:3000/api/health"
ALERT_EMAIL="avoidaccess@msn.com"
LOG_FILE="$LOG_DIR/monitor.log"
RECOVERY_LOG="$LOG_DIR/recovery.log"

# Thresholds
DISK_THRESHOLD=90
MEMORY_THRESHOLD=10
RESPONSE_TIMEOUT=10

# Retry settings
MAX_RETRIES=3
RETRY_DELAY=30
EOF

# Create enhanced monitoring script with alerting
cat > $SCRIPT_DIR/monitor-with-recovery.sh << 'EOF'
#!/bin/bash

# Enhanced monitoring with automatic recovery
source /opt/addypin/monitoring/monitor.conf

# Run monitoring
if ! /opt/addypin/monitoring/system-monitor.sh; then
    echo "❌ Health checks failed. Attempting auto-recovery..."
    
    # Run auto-recovery
    if /opt/addypin/monitoring/auto-recovery.sh; then
        echo "✅ Auto-recovery successful"
        # Verify recovery worked
        sleep 30
        if /opt/addypin/monitoring/system-monitor.sh; then
            echo "✅ System verified healthy after recovery"
        else
            echo "❌ System still unhealthy after recovery - manual intervention required"
        fi
    else
        echo "❌ Auto-recovery failed - manual intervention required"
    fi
fi
EOF

chmod +x $SCRIPT_DIR/monitor-with-recovery.sh

# Create systemd service for monitoring
cat > /etc/systemd/system/addypin-monitor.service << EOF
[Unit]
Description=AddyPin Health Monitor
After=network.target

[Service]
Type=oneshot
ExecStart=$SCRIPT_DIR/monitor-with-recovery.sh
User=root
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Create systemd timer for regular monitoring
cat > /etc/systemd/system/addypin-monitor.timer << EOF
[Unit]
Description=Run AddyPin Health Monitor every 5 minutes
Requires=addypin-monitor.service

[Timer]
OnCalendar=*:0/5
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Set up cron jobs for monitoring
echo "⏰ Setting up monitoring cron jobs..."

# Add monitoring cron jobs
crontab -l 2>/dev/null | grep -v "addypin-monitor" > /tmp/crontab.tmp || true

# Health check every 2 minutes
echo "*/2 * * * * $SCRIPT_DIR/system-monitor.sh >> $LOG_DIR/monitor.log 2>&1" >> /tmp/crontab.tmp

# Auto-recovery on failures (every 5 minutes, only if health check fails)
echo "*/5 * * * * if ! curl -f -s --max-time 5 http://localhost:3000/api/health >/dev/null; then $SCRIPT_DIR/auto-recovery.sh >> $LOG_DIR/recovery.log 2>&1; fi" >> /tmp/crontab.tmp

# Daily system report (at 6 AM)
echo "0 6 * * * $SCRIPT_DIR/system-monitor.sh > $LOG_DIR/daily-report.log 2>&1" >> /tmp/crontab.tmp

# Weekly log rotation (Sundays at 3 AM)
echo "0 3 * * 0 find $LOG_DIR -name '*.log' -mtime +7 -delete" >> /tmp/crontab.tmp

crontab /tmp/crontab.tmp
rm /tmp/crontab.tmp

# Enable and start systemd timer
echo "🔄 Enabling systemd monitoring timer..."
systemctl daemon-reload
systemctl enable addypin-monitor.timer
systemctl start addypin-monitor.timer

# Create logrotate configuration
cat > /etc/logrotate.d/addypin << EOF
$LOG_DIR/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
}
EOF

# Create monitoring dashboard script
cat > $SCRIPT_DIR/dashboard.sh << 'EOF'
#!/bin/bash

# AddyPin Monitoring Dashboard
echo "🖥️  AddyPin Monitoring Dashboard - $(date)"
echo "============================================="

# System status
echo "📊 System Status:"
curl -s http://localhost:3000/api/health | jq '.' 2>/dev/null || echo "API not responding"
echo ""

# Service status
echo "🔧 Service Status:"
echo "- Docker: $(docker ps --filter name=addypin --format '{{.Status}}' 2>/dev/null || echo 'Not running')"
echo "- PostgreSQL: $(systemctl is-active postgresql)"
echo "- Nginx: $(systemctl is-active nginx)"
echo ""

# Resource usage
echo "💾 Resource Usage:"
echo "- Disk: $(df / | tail -1 | awk '{print $5}') used"
echo "- Memory: $(free -h | grep '^Mem:' | awk '{print $3 "/" $2}')"
echo "- Load: $(uptime | awk -F'load average:' '{print $2}')"
echo ""

# Recent logs
echo "📝 Recent Monitor Logs (last 10 lines):"
tail -10 /var/log/addypin/monitor.log 2>/dev/null || echo "No monitor logs found"
echo ""

echo "🔄 Monitoring timer status:"
systemctl status addypin-monitor.timer --no-pager -l
EOF

chmod +x $SCRIPT_DIR/dashboard.sh

# Test the monitoring setup
echo "🧪 Testing monitoring setup..."
$SCRIPT_DIR/system-monitor.sh

echo ""
echo "========================================="
echo "✅ AddyPin Monitoring Setup Complete!"
echo ""
echo "📋 Monitoring Features Installed:"
echo "  • Health checks every 2 minutes"
echo "  • Auto-recovery on failures"
echo "  • Daily system reports"
echo "  • Log rotation and cleanup"
echo "  • Systemd timer integration"
echo ""
echo "🛠️  Management Commands:"
echo "  • View dashboard: $SCRIPT_DIR/dashboard.sh"
echo "  • Manual health check: $SCRIPT_DIR/system-monitor.sh"
echo "  • Manual recovery: $SCRIPT_DIR/auto-recovery.sh"
echo "  • Check timer: systemctl status addypin-monitor.timer"
echo "  • View logs: tail -f $LOG_DIR/monitor.log"
echo ""
echo "📧 Alerts will be logged to: $LOG_DIR/"
echo "⏰ Next scheduled check: $(systemctl list-timers addypin-monitor.timer --no-pager | grep addypin-monitor | awk '{print $1, $2}')"
EOF

chmod +x scripts/setup-monitoring.sh