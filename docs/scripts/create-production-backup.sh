#!/bin/bash
# Production Backup Script for AddyPin
# Creates timestamped backup of working production deployment

set -e

# Configuration
BACKUP_BASE_DIR="/opt/addypin/production-backups"
APP_DIR="/opt/addypin/app"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="prod_addypin_working_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_BASE_DIR}/${BACKUP_NAME}"

echo "🔧 Creating AddyPin production backup..."

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_BASE_DIR"

# Check if service is running (optional - can backup while running)
SERVICE_STATUS=$(systemctl is-active addypin || echo "inactive")
echo "📊 Service status: $SERVICE_STATUS"

# Create the backup
echo "📁 Creating backup: $BACKUP_NAME"
if [ -d "$APP_DIR" ]; then
    cp -r "$APP_DIR" "$BACKUP_PATH"
    
    # Create backup metadata
    cat > "$BACKUP_PATH/BACKUP_INFO.txt" << EOF
AddyPin Production Backup Information
=====================================
Backup Name: $BACKUP_NAME
Created: $(date)
Source Directory: $APP_DIR
Service Status: $SERVICE_STATUS
Node Process: $(ps aux | grep "node index.js" | grep -v grep || echo "Not running")

Environment Variables (from systemd service):
$(grep "Environment=" /etc/systemd/system/addypin.service || echo "Service file not found")

Files Backed Up:
$(find "$BACKUP_PATH" -maxdepth 2 -type f | head -20)

Backup Size: $(du -sh "$BACKUP_PATH" | cut -f1)
EOF

    # Set proper ownership
    chown -R root:root "$BACKUP_PATH"
    chmod -R 755 "$BACKUP_PATH"
    
    echo "✅ Backup created successfully!"
    echo "📍 Location: $BACKUP_PATH"
    echo "📊 Size: $(du -sh "$BACKUP_PATH" | cut -f1)"
    
    # List recent backups
    echo ""
    echo "📋 Recent production backups:"
    ls -lt "$BACKUP_BASE_DIR" | head -5
    
else
    echo "❌ Error: Application directory $APP_DIR does not exist"
    exit 1
fi

# Optional: Clean up old backups (keep last 10)
BACKUP_COUNT=$(ls -1 "$BACKUP_BASE_DIR" | wc -l)
if [ "$BACKUP_COUNT" -gt 10 ]; then
    echo "🧹 Cleaning up old backups (keeping last 10)..."
    cd "$BACKUP_BASE_DIR"
    ls -t | tail -n +11 | xargs rm -rf
    echo "✅ Cleanup completed"
fi

echo ""
echo "🎯 Backup Summary:"
echo "   Name: $BACKUP_NAME"
echo "   Path: $BACKUP_PATH"
echo "   Date: $(date)"
echo "   Status: Complete"