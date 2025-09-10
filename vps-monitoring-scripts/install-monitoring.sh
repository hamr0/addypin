#!/bin/bash
# AddyPin Monitoring Installation Script
# Run this once to set up all monitoring scripts and cron jobs

set -e

echo "🚀 Installing AddyPin VPS Monitoring Suite..."

# Create necessary directories
sudo mkdir -p /opt/addypin-monitoring
sudo mkdir -p /opt/backups
sudo mkdir -p /var/log

# Copy monitoring scripts
echo "📋 Installing monitoring scripts..."
sudo cp daily-health-check.sh /opt/addypin-monitoring/
sudo cp security-audit.sh /opt/addypin-monitoring/
sudo cp backup-script.sh /opt/addypin-monitoring/
sudo cp performance-monitor.sh /opt/addypin-monitoring/

# Make scripts executable
sudo chmod +x /opt/addypin-monitoring/*.sh

# Install required packages
echo "📦 Installing required packages..."
if command -v yum >/dev/null 2>&1; then
    # CentOS/RHEL
    sudo yum install -y bc mailx curl wget
elif command -v apt >/dev/null 2>&1; then
    # Ubuntu/Debian
    sudo apt update
    sudo apt install -y bc mailutils curl wget
fi

# Create log files with proper permissions
sudo touch /var/log/addypin-health.log
sudo touch /var/log/addypin-security.log
sudo touch /var/log/addypin-backup.log
sudo touch /var/log/addypin-performance.log
sudo chmod 644 /var/log/addypin-*.log

# Set up cron jobs
echo "⏰ Setting up cron jobs..."
(crontab -l 2>/dev/null || true; cat << EOF

# AddyPin Monitoring Cron Jobs
# Daily health check at 6:00 AM
0 6 * * * /opt/addypin-monitoring/daily-health-check.sh

# Performance monitoring every 15 minutes
*/15 * * * * /opt/addypin-monitoring/performance-monitor.sh

# Daily backup at 2:00 AM
0 2 * * * /opt/addypin-monitoring/backup-script.sh

# Weekly security audit on Sundays at 3:00 AM
0 3 * * 0 /opt/addypin-monitoring/security-audit.sh

# Log rotation for monitoring logs (monthly)
0 0 1 * * find /var/log -name "addypin-*.log" -size +10M -exec gzip {} \;

EOF
) | crontab -

echo "✅ Cron jobs installed successfully!"

# Create monitoring dashboard script
cat > /opt/addypin-monitoring/dashboard.sh << 'EOF'
#!/bin/bash
# AddyPin Monitoring Dashboard
# Quick overview of system status

echo "============================================"
echo "         AddyPin Infrastructure Status"
echo "============================================"
echo "Generated: $(date)"
echo ""

echo "📊 SYSTEM OVERVIEW"
echo "-------------------"
echo "Uptime: $(uptime -p)"
echo "Load: $(uptime | awk -F'load average:' '{ print $2 }')"
echo "Memory: $(free -h | awk 'NR==2{printf "Used: %s/%s (%.1f%%)", $3,$2,$3*100/$2}')"
echo "Disk: $(df -h / | awk 'NR==2{printf "Used: %s/%s (%s)", $3,$2,$5}')"
echo ""

echo "🐳 CONTAINER STATUS"
echo "-------------------"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(addypin|postgres)"
echo ""

echo "🌐 SERVICE HEALTH"
echo "-------------------"
echo -n "Production API: "
if curl -f -s -m 5 http://localhost:3000/api/health > /dev/null; then
    echo "✅ Healthy"
else
    echo "❌ Failed"
fi

echo -n "Staging API: "
if curl -f -s -m 5 http://localhost:8080/api/health > /dev/null; then
    echo "✅ Healthy"
else
    echo "❌ Failed"
fi

echo -n "Production Domain: "
if curl -f -s -m 10 https://addypin.com/api/health > /dev/null; then
    echo "✅ Healthy"
else
    echo "❌ Failed"
fi

echo -n "Staging Domain: "
if curl -f -s -m 10 https://staging.addypin.com/api/health > /dev/null; then
    echo "✅ Healthy"
else
    echo "❌ Failed"
fi
echo ""

echo "🔒 SECURITY STATUS"
echo "------------------"
EXPOSED_PORTS=$(netstat -tlnp | grep -E ":3000|:8080|:5432" | grep -v "127.0.0.1" | wc -l)
if [ $EXPOSED_PORTS -eq 0 ]; then
    echo "Port Security: ✅ All ports localhost-only"
else
    echo "Port Security: ⚠️ $EXPOSED_PORTS exposed ports detected"
fi

echo -n "SSL Certificate: "
CERT_DAYS=$(echo | openssl s_client -servername addypin.com -connect addypin.com:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
CERT_EPOCH=$(date -d "$CERT_DAYS" +%s 2>/dev/null || echo 0)
NOW_EPOCH=$(date +%s)
DAYS_LEFT=$(( ($CERT_EPOCH - $NOW_EPOCH) / 86400 ))
if [ $DAYS_LEFT -gt 30 ]; then
    echo "✅ Valid ($DAYS_LEFT days remaining)"
else
    echo "⚠️ Expires in $DAYS_LEFT days"
fi
echo ""

echo "📈 RECENT PERFORMANCE"
echo "--------------------"
if [ -f /var/log/addypin-performance.log ]; then
    echo "Latest performance metrics:"
    tail -10 /var/log/addypin-performance.log | grep -E "(CPU Usage|Memory:|response time)" | tail -5
else
    echo "No performance data available"
fi
echo ""

echo "📋 RECENT LOGS"
echo "--------------"
if [ -f /var/log/addypin-health.log ]; then
    echo "Last health check:"
    tail -5 /var/log/addypin-health.log | tail -1
else
    echo "No health check data available"
fi

echo ""
echo "============================================"
echo "💡 Quick Commands:"
echo "   View full dashboard: /opt/addypin-monitoring/dashboard.sh"
echo "   Health check logs: tail -f /var/log/addypin-health.log"
echo "   Performance logs: tail -f /var/log/addypin-performance.log"
echo "   Manual health check: /opt/addypin-monitoring/daily-health-check.sh"
echo "   Manual backup: /opt/addypin-monitoring/backup-script.sh"
echo "============================================"
EOF

sudo chmod +x /opt/addypin-monitoring/dashboard.sh

# Test run
echo "🧪 Running initial tests..."
echo "Testing dashboard..."
/opt/addypin-monitoring/dashboard.sh

echo ""
echo "🎉 AddyPin Monitoring Suite Installation Complete!"
echo ""
echo "📋 What's Installed:"
echo "   ✅ Daily health checks (6:00 AM)"
echo "   ✅ Performance monitoring (every 15 minutes)"
echo "   ✅ Daily backups (2:00 AM)"
echo "   ✅ Weekly security audits (Sundays 3:00 AM)"
echo "   ✅ Log rotation (monthly)"
echo ""
echo "📊 Commands Available:"
echo "   Dashboard: /opt/addypin-monitoring/dashboard.sh"
echo "   Manual health check: /opt/addypin-monitoring/daily-health-check.sh"
echo "   Manual backup: /opt/addypin-monitoring/backup-script.sh"
echo "   Security audit: /opt/addypin-monitoring/security-audit.sh"
echo ""
echo "📄 Log Files:"
echo "   Health: /var/log/addypin-health.log"
echo "   Performance: /var/log/addypin-performance.log"
echo "   Backup: /var/log/addypin-backup.log"
echo "   Security: /var/log/addypin-security.log"
echo ""
echo "⚡ Next Steps:"
echo "1. Review and customize alert email in daily-health-check.sh"
echo "2. Configure remote backup storage in backup-script.sh"
echo "3. Set up log monitoring/alerting as needed"
echo "4. Run: crontab -l to verify cron jobs"