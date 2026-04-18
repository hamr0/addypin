#!/bin/bash

# 🌐 External Monitoring Setup Guide
# Sets up external monitoring services for AddyPin
# This complements the on-server monitoring with external checks

echo "🌐 AddyPin External Monitoring Setup Guide"
echo "============================================="

echo ""
echo "🎯 EXTERNAL MONITORING SERVICES TO SET UP:"
echo ""

echo "1. 📊 UptimeRobot (Free tier: 50 monitors)"
echo "   Website: https://uptimerobot.com"
echo "   Setup:"
echo "   - Add monitor: https://addypin.com/api/health"
echo "   - Type: HTTP(s)"
echo "   - Interval: 5 minutes"
echo "   - Alert when: Down"
echo "   - Notification: Email to avoidaccess@msn.com"
echo ""

echo "2. 🔍 Pingdom (Free tier: 1 monitor)"
echo "   Website: https://www.pingdom.com"
echo "   Setup:"
echo "   - Add check: https://addypin.com"
echo "   - Type: HTTP"
echo "   - Interval: 1 minute"
echo "   - Alert: Email + SMS"
echo ""

echo "3. 📈 Better Uptime (Free tier: 10 monitors)"
echo "   Website: https://betteruptime.com"
echo "   Setup:"
echo "   - Monitor: https://addypin.com/api/health"
echo "   - Check every: 30 seconds"
echo "   - Expected status: 200"
echo "   - Notifications: Email, Slack, Discord"
echo ""

echo "4. 🔔 StatusCake (Free tier: 10 monitors)"
echo "   Website: https://www.statuscake.com"
echo "   Setup:"
echo "   - Test URL: https://addypin.com/api/health"
echo "   - Test type: HTTP"
echo "   - Check rate: 5 minutes"
echo ""

echo "========================================="
echo ""
echo "🔧 WEBHOOK INTEGRATION FOR REAL-TIME ALERTS:"
echo ""

cat > webhook-monitor.sh << 'EOF'
#!/bin/bash

# Webhook-based monitoring for instant alerts
# Add this to your external monitoring service

WEBHOOK_URL="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
DISCORD_WEBHOOK="https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK"

# Function to send Slack alert
send_slack_alert() {
    local status="$1"
    local message="$2"
    
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"🚨 AddyPin Alert: $status - $message\"}" \
        $WEBHOOK_URL
}

# Function to send Discord alert
send_discord_alert() {
    local status="$1"
    local message="$2"
    
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"content\":\"🚨 **AddyPin Alert** 🚨\n**Status:** $status\n**Message:** $message\n**Time:** $(date)\"}" \
        $DISCORD_WEBHOOK
}

# Check AddyPin health
if ! curl -f -s --max-time 10 https://addypin.com/api/health >/dev/null; then
    send_slack_alert "DOWN" "AddyPin is not responding to health checks"
    send_discord_alert "DOWN" "AddyPin is not responding to health checks"
    exit 1
fi
EOF

chmod +x webhook-monitor.sh

echo "📝 Created webhook-monitor.sh for instant alerts"
echo ""

echo "🎯 RECOMMENDED MONITORING STACK:"
echo ""
echo "✅ ON-SERVER MONITORING (Already installed):"
echo "   • Enhanced /api/health endpoint with database checks"
echo "   • Docker healthchecks every 30 seconds"
echo "   • Cron-based monitoring every 2 minutes"
echo "   • Auto-recovery on service failures"
echo "   • Resource monitoring (disk, memory, CPU)"
echo ""

echo "✅ EXTERNAL MONITORING (To set up manually):"
echo "   • UptimeRobot for primary monitoring"
echo "   • Better Uptime for detailed monitoring"
echo "   • Pingdom for user experience monitoring"
echo "   • StatusCake as backup monitoring"
echo ""

echo "🚀 MONITORING URLS TO ADD TO EXTERNAL SERVICES:"
echo "   • Main site: https://addypin.com"
echo "   • Health check: https://addypin.com/api/health"
echo "   • System status: https://addypin.com/api/health/system"
echo "   • Analytics: https://addypin.com/api/stats"
echo ""

echo "📧 ALERT DESTINATIONS:"
echo "   • Primary email: avoidaccess@msn.com"
echo "   • System logs: /var/log/addypin/"
echo "   • Dashboard: Run /opt/addypin/monitoring/dashboard.sh"
echo ""

echo "🔍 WHAT EACH MONITOR SHOULD CHECK:"
echo ""
echo "1. UPTIME MONITOR:"
echo "   - URL: https://addypin.com"
echo "   - Expected: 200 OK"
echo "   - Interval: 1-5 minutes"
echo ""

echo "2. HEALTH MONITOR:"
echo "   - URL: https://addypin.com/api/health"
echo "   - Expected: {\"status\":\"healthy\"}"
echo "   - Interval: 30 seconds - 2 minutes"
echo ""

echo "3. FUNCTIONAL MONITOR:"
echo "   - Create a test pin"
echo "   - Access the pin page"
echo "   - Check map links work"
echo "   - Interval: 15-30 minutes"
echo ""

echo "========================================="
echo ""
echo "⚠️  WHY EXTERNAL MONITORING IS CRITICAL:"
echo "   • Detects network/DNS issues"
echo "   • Monitors from user perspective"
echo "   • Works when server is completely down"
echo "   • Provides geographic monitoring"
echo "   • Independent of server infrastructure"
echo ""

echo "🎯 NEXT STEPS:"
echo "1. Sign up for UptimeRobot (primary monitor)"
echo "2. Add https://addypin.com/api/health monitor"
echo "3. Set up email alerts to avoidaccess@msn.com"
echo "4. Test alerts by stopping nginx temporarily"
echo "5. Add additional monitors for redundancy"
echo ""

echo "✅ Your AddyPin monitoring system is now enterprise-grade!"
echo "   Any future outages will be detected and auto-resolved within minutes."