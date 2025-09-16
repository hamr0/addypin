# VPS Deployment Commands for AddyPin Foundation Backup Automation

This document contains the exact commands to deploy the automated backup system on your VPS.

## Prerequisites

Before running these commands, ensure:

1. You have root access to the VPS
2. The backup system files are already deployed to `/opt/addypin-foundation-backup/`
3. The `RESEND_API_KEY` environment variable is configured
4. Basic system requirements are met (PostgreSQL, Docker, Nginx are installed)

## Step 1: Deploy Backup System to VPS

If the backup system isn't already on the VPS, transfer it:

```bash
# From your local machine/replit, transfer the backup system
scp -r addypin-foundation-backup root@YOUR_VPS_IP:/opt/

# Or if already on VPS, ensure proper ownership
sudo chown -R root:root /opt/addypin-foundation-backup
sudo chmod -R 700 /opt/addypin-foundation-backup
sudo chmod +x /opt/addypin-foundation-backup/scripts/*.sh
```

## Step 2: Configure Environment

Set up the required environment variables:

```bash
# SSH into your VPS
ssh root@YOUR_VPS_IP

# Set the RESEND API key in your environment
# Option 1: Add to system environment
echo 'export RESEND_API_KEY="your-resend-api-key-here"' >> /etc/environment

# Option 2: Add to root's profile
echo 'export RESEND_API_KEY="your-resend-api-key-here"' >> /root/.bashrc

# Option 3: Set in cron environment (will be done during installation)
```

## Step 3: Test the Backup System

Verify everything works before automation:

```bash
# Navigate to backup directory
cd /opt/addypin-foundation-backup

# Test with dry run
./scripts/backup-foundation.sh --dry-run

# Test automated mode (dry run)
./scripts/backup-foundation.sh --dry-run --auto

# Run a real test backup
./scripts/backup-foundation.sh --auto

# Check the backup was created
ls -la versioned/
```

## Step 4: Install Automated Backups

Set up the bi-weekly automation:

```bash
# Install the automation
./scripts/setup-automated-backups.sh --install

# Verify installation
./scripts/setup-automated-backups.sh --status

# Check cron job was created
crontab -l | grep backup
```

## Step 5: Verify Email Notifications

Test the email notification system:

```bash
# Set the API key if not already done
export RESEND_API_KEY="your-resend-api-key-here"

# Run a test backup with notifications
./scripts/backup-foundation.sh --auto --force

# Check the cron log for email sending
tail /var/log/addypin-backup-cron.log
```

## Step 6: Integration with Health Monitoring

Add backup monitoring to your existing health check system:

```bash
# If you have an existing health monitoring script, add this check:

# Add to your health-check script (e.g., /opt/infra/health-check.sh)
cat >> /opt/infra/health-check.sh << 'EOF'

# AddyPin Foundation Backup Status Check
echo "=== Backup System Health ===" >> $LOG_FILE
if [ -x "/opt/addypin-foundation-backup/scripts/backup-status-monitor.sh" ]; then
    BACKUP_STATUS=$(/opt/addypin-foundation-backup/scripts/backup-status-monitor.sh --json --alert-if-stale 2>&1)
    BACKUP_EXIT_CODE=$?
    
    if [ $BACKUP_EXIT_CODE -eq 0 ]; then
        echo "✅ Backup system: OK" >> $LOG_FILE
    else
        echo "❌ Backup system: CRITICAL" >> $LOG_FILE
        echo "$BACKUP_STATUS" >> $LOG_FILE
        OVERALL_STATUS="unhealthy"
    fi
else
    echo "⚠️ Backup monitoring script not found" >> $LOG_FILE
fi
EOF
```

## Step 7: Set Up Log Monitoring

Configure log monitoring for backup operations:

```bash
# The setup script automatically creates logrotate config, but verify:
ls -la /etc/logrotate.d/addypin-backup-cron

# Test logrotate configuration
logrotate -d /etc/logrotate.d/addypin-backup-cron

# Ensure proper log file permissions
touch /var/log/addypin-backup-cron.log
chmod 644 /var/log/addypin-backup-cron.log
```

## Verification Commands

After deployment, run these commands to verify everything is working:

### Check Automation Status
```bash
cd /opt/addypin-foundation-backup
./scripts/setup-automated-backups.sh --status
```

### Check Backup Health
```bash
./scripts/backup-status-monitor.sh
```

### View Next Scheduled Backups
```bash
# This will show the next 4 Sundays and which ones will trigger backups
./scripts/setup-automated-backups.sh --status | grep -A 10 "Next Backup Times"
```

### Monitor Cron Logs
```bash
# Watch for cron execution
tail -f /var/log/addypin-backup-cron.log

# Check cron service status
systemctl status cron
```

### Test Email Notifications
```bash
# Force a backup with email notifications
export RESEND_API_KEY="your-key-here"
./scripts/backup-foundation.sh --auto --force
```

## Troubleshooting Commands

If issues arise, use these diagnostic commands:

### Check Cron Job
```bash
# List active cron jobs
crontab -l

# Check cron service
systemctl status cron
systemctl restart cron
```

### Check File Permissions
```bash
ls -la /opt/addypin-foundation-backup/scripts/
ls -la /opt/addypin-foundation-backup/versioned/
```

### Test Individual Components
```bash
# Test backup script
./scripts/backup-foundation.sh --dry-run --auto

# Test monitoring script  
./scripts/backup-status-monitor.sh --json

# Test setup script
./scripts/setup-automated-backups.sh --status
```

### Check Environment Variables
```bash
# Check if RESEND_API_KEY is set
echo $RESEND_API_KEY

# Check cron environment
sudo crontab -l
```

## Maintenance Commands

Regular maintenance commands:

### Monthly
```bash
# Check backup system status
./scripts/setup-automated-backups.sh --status

# Review disk usage
du -sh /opt/addypin-foundation-backup/versioned/

# Check recent backups
find versioned/ -type f -name "BACKUP_MANIFEST.txt" -mtime -30
```

### Quarterly  
```bash
# Create a golden backup
./scripts/backup-foundation.sh --golden --force

# Clean old backups (keep last 8 for bi-weekly schedule)
find versioned/ -maxdepth 1 -type d -name "2*" | sort | head -n -8 | xargs rm -rf
```

## Complete Installation Script

Here's a single script that runs all the deployment commands:

```bash
#!/bin/bash
# Complete AddyPin Foundation Backup Automation Deployment

set -e

echo "🚀 Deploying AddyPin Foundation Backup Automation..."

# 1. Set proper permissions
echo "📋 Setting permissions..."
chown -R root:root /opt/addypin-foundation-backup
chmod -R 700 /opt/addypin-foundation-backup
chmod +x /opt/addypin-foundation-backup/scripts/*.sh

# 2. Test the system
echo "🧪 Testing backup system..."
cd /opt/addypin-foundation-backup
./scripts/backup-foundation.sh --dry-run

# 3. Install automation
echo "⚙️ Installing automation..."
./scripts/setup-automated-backups.sh --install

# 4. Verify installation
echo "✅ Verifying installation..."
./scripts/setup-automated-backups.sh --status

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "Next steps:"
echo "1. Set RESEND_API_KEY environment variable"
echo "2. Test email notifications with: ./scripts/backup-foundation.sh --auto --force"
echo "3. Monitor /var/log/addypin-backup-cron.log for cron execution"
echo ""
echo "The system will automatically backup every other Sunday at 2:00 AM"
```

Save this as `/root/deploy-backup-automation.sh` and run:

```bash
chmod +x /root/deploy-backup-automation.sh
/root/deploy-backup-automation.sh
```

## Important Notes

1. **API Key Security**: Never commit the `RESEND_API_KEY` to version control
2. **Backup Permissions**: All backups are created with 700/600 permissions (root only)
3. **Schedule**: Backups run every other Sunday at 2:00 AM (even weeks only)
4. **Retention**: Manual cleanup required quarterly - automated retention coming in future version
5. **Monitoring**: Integration with existing health monitoring systems recommended

## Support

If you encounter issues:

1. Check `/var/log/addypin-backup-cron.log` for cron execution logs
2. Run `./scripts/setup-automated-backups.sh --status` for diagnosis
3. Use `--dry-run` flags to test without making changes
4. Verify file permissions and environment variables

For immediate help, the scripts include comprehensive help text accessible with `--help` flag.