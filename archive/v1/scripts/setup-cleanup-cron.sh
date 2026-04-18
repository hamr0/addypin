#!/bin/bash

# Setup automated Docker cleanup cron job for VPS
# Runs weekly cleanup to prevent image sprawl

set -e

echo "⏰ Setting up automated Docker cleanup schedule..."

# Create cron job for weekly cleanup (Sundays at 2 AM)
CLEANUP_CRON="0 2 * * 0 cd /opt/addypin && ./scripts/docker-cleanup.sh >> /var/log/docker-cleanup.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "docker-cleanup.sh"; then
    echo "✅ Docker cleanup cron job already exists"
else
    echo "📅 Adding weekly Docker cleanup cron job..."
    (crontab -l 2>/dev/null; echo "$CLEANUP_CRON") | crontab -
    echo "✅ Weekly cleanup scheduled for Sundays at 2 AM"
fi

# Create log file
touch /var/log/docker-cleanup.log
chmod 644 /var/log/docker-cleanup.log

echo "📊 Current cron jobs:"
crontab -l

echo "✅ Automated cleanup setup complete!"
echo "📝 Logs will be written to: /var/log/docker-cleanup.log"