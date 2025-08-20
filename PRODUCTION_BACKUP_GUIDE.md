# Production Backup Guide - AddyPin VPS

## Overview
This guide covers creating, storing, and restoring production backups for AddyPin running on the VPS.

## Backup Script Usage

### Actions for YOU on your VPS:

#### 1. Install the backup script
```bash
# SSH to VPS
ssh root@155.94.144.191

# Copy the backup script to VPS
cat > /opt/addypin/create-production-backup.sh << 'EOF'
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
    cat > "$BACKUP_PATH/BACKUP_INFO.txt" << BACKUP_EOF
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
BACKUP_EOF

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
EOF

# Make script executable
chmod +x /opt/addypin/create-production-backup.sh
```

#### 2. Create a backup of the current working system
```bash
# Run the backup script
/opt/addypin/create-production-backup.sh
```

**Expected output:**
```
🔧 Creating AddyPin production backup...
📊 Service status: active
📁 Creating backup: prod_addypin_working_20250820_143000
✅ Backup created successfully!
📍 Location: /opt/addypin/production-backups/prod_addypin_working_20250820_143000
📊 Size: 95M
```

## Backup Naming Convention

**Format**: `prod_addypin_working_YYYYMMDD_HHMMSS`

**Examples**:
- `prod_addypin_working_20250820_143000` - Aug 20, 2025 at 2:30 PM
- `prod_addypin_working_20250821_090000` - Aug 21, 2025 at 9:00 AM
- `prod_addypin_working_20250825_154500` - Aug 25, 2025 at 3:45 PM

## When to Create Backups

### Before Major Changes
```bash
# Before updating code or dependencies
/opt/addypin/create-production-backup.sh
```

### Regular Maintenance Backups
```bash
# Weekly backups (recommended)
# Add to crontab for automation:
# 0 2 * * 0 /opt/addypin/create-production-backup.sh >/dev/null 2>&1
```

### Before System Updates
```bash
# Before OS updates or server maintenance
/opt/addypin/create-production-backup.sh
```

## Backup Contents

Each backup includes:
- **Complete application files**: `index.js`, `package.json`, `public/` directory
- **All node_modules**: Full dependency tree
- **Backup metadata**: `BACKUP_INFO.txt` with system state
- **Timestamp information**: Creation date and service status

## Restoring from Backup

### Actions for YOU on your VPS:

#### 1. List available backups
```bash
ls -la /opt/addypin/production-backups/
```

#### 2. Restore a specific backup
```bash
# Stop service
systemctl stop addypin

# Backup current state (optional)
mv /opt/addypin/app /opt/addypin/app-pre-restore-$(date +%Y%m%d_%H%M%S)

# Restore from backup (REPLACE with actual backup name)
cp -r /opt/addypin/production-backups/prod_addypin_working_20250820_143000 /opt/addypin/app

# Set permissions
chown -R addypin:addypin /opt/addypin/app

# Start service
systemctl start addypin

# Verify restoration
curl -I https://addypin.com
systemctl status addypin
```

## Backup Management

### View backup information
```bash
# Check backup metadata
cat /opt/addypin/production-backups/prod_addypin_working_20250820_143000/BACKUP_INFO.txt

# Check backup size
du -sh /opt/addypin/production-backups/*
```

### Manual cleanup (if needed)
```bash
# Remove backups older than 30 days
find /opt/addypin/production-backups -name "prod_addypin_working_*" -mtime +30 -exec rm -rf {} \;

# Keep only last 5 backups
cd /opt/addypin/production-backups
ls -t | tail -n +6 | xargs rm -rf
```

## Automation Options

### Add to crontab for weekly backups
```bash
# Edit crontab
crontab -e

# Add this line for weekly Sunday 2 AM backups
0 2 * * 0 /opt/addypin/create-production-backup.sh >/dev/null 2>&1
```

### Pre-deployment backup
```bash
# Always backup before deploying changes
/opt/addypin/create-production-backup.sh
# Then proceed with deployment
```

## Best Practices

1. **Always backup before changes**: Never modify production without a backup
2. **Test restoration process**: Periodically verify backups can be restored
3. **Monitor disk space**: Backups consume storage, clean up old ones
4. **Document changes**: Keep notes about what changed between backups
5. **Verify service after restore**: Always test functionality after restoration

## Storage Locations

- **Backup directory**: `/opt/addypin/production-backups/`
- **Script location**: `/opt/addypin/create-production-backup.sh`
- **Current app**: `/opt/addypin/app/`

## Troubleshooting

### If backup fails
```bash
# Check permissions
ls -la /opt/addypin/
# Fix if needed
chown -R root:root /opt/addypin/create-production-backup.sh

# Check disk space
df -h
```

### If restoration fails
```bash
# Check service logs
journalctl -u addypin -n 20

# Verify file permissions
chown -R addypin:addypin /opt/addypin/app
chmod +x /opt/addypin/app/index.js
```