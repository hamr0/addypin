#!/bin/bash
# Simple Production Backup Script for AddyPin
# Creates timestamped backup: prod_addypin_working_YYYYMMDD_HHMMSS

set -e

# Get current timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🔧 Creating AddyPin production backup..."
echo "📅 Timestamp: $TIMESTAMP"

# Create backup directory
mkdir -p /opt/addypin/production-backups

# Copy current working app to timestamped backup
echo "📁 Creating backup: prod_addypin_working_${TIMESTAMP}"
cp -r /opt/addypin/app /opt/addypin/production-backups/prod_addypin_working_${TIMESTAMP}

# Create simple info file
cat > /opt/addypin/production-backups/prod_addypin_working_${TIMESTAMP}/BACKUP_INFO.txt << EOF
AddyPin Production Backup
========================
Created: $(date)
Backup Name: prod_addypin_working_${TIMESTAMP}
Service Status: $(systemctl is-active addypin)
Files: $(find /opt/addypin/production-backups/prod_addypin_working_${TIMESTAMP} -type f | wc -l) files backed up
Size: $(du -sh /opt/addypin/production-backups/prod_addypin_working_${TIMESTAMP} | cut -f1)
EOF

echo "✅ Backup created successfully!"
echo "📍 Location: /opt/addypin/production-backups/prod_addypin_working_${TIMESTAMP}"
echo "📊 Size: $(du -sh /opt/addypin/production-backups/prod_addypin_working_${TIMESTAMP} | cut -f1)"

# Show recent backups
echo ""
echo "📋 Available backups:"
ls -lt /opt/addypin/production-backups/ | head -5

echo ""
echo "🎯 Backup prod_addypin_working_${TIMESTAMP} completed!"