#!/bin/bash
# Setup script for EXACT Phase 5 Part 3 monitoring as specified

echo "🎯 Setting up EXACT Phase 5 Part 3 monitoring as instructed..."

# 1. Create the health check script in exact location
sudo cp infra-health-check.sh /opt/infra-health-check.sh

# 2. Make the script executable
sudo chmod +x /opt/infra-health-check.sh

# 3. Test the script
echo "🧪 Testing the script..."
sudo /opt/infra-health-check.sh

# 4. Check the log output
echo "📄 Log output:"
sudo tail -20 /var/log/infra-health-check.log

# 5. Schedule the script with Cron (every 5 minutes as specified)
echo "⏰ Setting up cron job (every 5 minutes)..."
(sudo crontab -l 2>/dev/null || true; echo "# Run health check every 5 minutes") | sudo crontab -
(sudo crontab -l 2>/dev/null; echo "*/5 * * * * /opt/infra-health-check.sh") | sudo crontab -

# 6. Create logrotate configuration
echo "📋 Setting up log rotation..."
sudo tee /etc/logrotate.d/infra-health-check > /dev/null << 'EOF'
/var/log/infra-health-check.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
}
EOF

echo ""
echo "✅ Phase 5 Part 3 setup complete!"
echo ""
echo "📋 What's configured:"
echo "   ✅ Health check script: /opt/infra-health-check.sh"
echo "   ✅ Cron job: Every 5 minutes (*/5 * * * * /opt/infra-health-check.sh)"
echo "   ✅ Log file: /var/log/infra-health-check.log"
echo "   ✅ Log rotation: Daily, keep 7 days"
echo ""
echo "🔍 Verification commands:"
echo "   View cron jobs: sudo crontab -l"
echo "   View logs: sudo tail -f /var/log/infra-health-check.log"
echo "   Manual test: sudo /opt/infra-health-check.sh"
echo ""
echo "🎉 Phase 5 Part 3 monitoring is now active!"