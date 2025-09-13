# AddyPin Foundation Backup Automation Guide

This guide covers the setup and management of automated bi-weekly backups for the AddyPin infrastructure.

## Overview

The automated backup system performs comprehensive backups of critical infrastructure files every other Sunday at 2:00 AM using a cron job. The system includes monitoring, email notifications, and automatic cleanup.

## Features

- **Bi-weekly Schedule**: Backups run every other Sunday at 2:00 AM
- **Email Notifications**: Success/failure notifications via Resend API
- **Monitoring Integration**: Status monitoring with health checks
- **Secure Storage**: All backups protected with 700/600 permissions
- **Automatic Cleanup**: Old backups managed through versioned storage
- **Comprehensive Logging**: Detailed logs for troubleshooting

## Quick Setup

### 1. Install Automated Backups

```bash
# On your VPS, navigate to the backup system
cd /opt/addypin-foundation-backup

# Install the automation (requires root)
sudo ./scripts/setup-automated-backups.sh --install
```

### 2. Verify Installation

```bash
# Check automation status
./scripts/setup-automated-backups.sh --status

# View next scheduled backup times
crontab -l | grep backup
```

### 3. Test the System

```bash
# Run a test backup (dry-run mode)
sudo ./scripts/backup-foundation.sh --dry-run --auto

# Run a real backup manually
sudo ./scripts/backup-foundation.sh --auto
```

## System Components

### 1. Main Scripts

- **`backup-foundation.sh`**: Core backup script with automation support
- **`backup-status-monitor.sh`**: Monitors backup status and health
- **`setup-automated-backups.sh`**: Installs/manages automation

### 2. Directory Structure

```
/opt/addypin-foundation-backup/
├── scripts/
│   ├── backup-foundation.sh         # Main backup script
│   ├── backup-status-monitor.sh     # Status monitoring
│   └── setup-automated-backups.sh   # Automation setup
├── versioned/
│   └── YYYYMMDD_HHMMSS/            # Timestamped backups
├── golden/                         # Reference backups
└── logs/                          # Backup logs
```

### 3. Backup Contents

Each automated backup includes:

- **PostgreSQL Configuration**: `postgresql.conf`, `pg_hba.conf`, SSL certificates
- **Docker Configurations**: Production and staging `docker-compose.yml` files
- **Environment Files**: `.env` files with API keys and secrets
- **Monitoring Scripts**: Health check and monitoring scripts
- **Nginx Configuration**: Server and site configurations
- **SSL Certificates**: Let's Encrypt certificates for all domains
- **System Configuration**: Cron jobs and system settings

## Email Notifications

The system sends email notifications for backup completion:

### Configuration

Set the `RESEND_API_KEY` environment variable:

```bash
# Add to your environment (typically in /opt/addypin/.env)
export RESEND_API_KEY="your-resend-api-key"

# Or set it in the cron environment
sudo crontab -e
# Add: RESEND_API_KEY=your-resend-api-key
```

### Notification Types

- **Success**: All files backed up successfully
- **Warning**: Backup completed but some files were missing
- **Error**: Backup failed or had errors

### Email Format

Notifications include:
- Backup status and timestamp
- File statistics (total, copied, missing, errors)
- Backup size and location
- Direct links to backup manifest

## Monitoring and Status Checks

### Check Recent Backup Status

```bash
# Human-readable status
./scripts/backup-status-monitor.sh

# JSON format (for integration)
./scripts/backup-status-monitor.sh --json

# Exit with error if backup is stale
./scripts/backup-status-monitor.sh --alert-if-stale
```

### Integration with Health Monitoring

Add backup status to your health monitoring system:

```bash
# Add to your health check script
BACKUP_STATUS=$(./scripts/backup-status-monitor.sh --json --alert-if-stale)
if [ $? -ne 0 ]; then
    echo "CRITICAL: Backup system issues detected"
    # Send alert
fi
```

## Schedule Management

### Current Schedule

- **Frequency**: Every other week (bi-weekly)
- **Day**: Sunday
- **Time**: 2:00 AM
- **Week Pattern**: Even weeks only (Week 2, 4, 6, 8, etc.)

### View Scheduled Times

```bash
# Show next 4 potential backup dates
./scripts/setup-automated-backups.sh --status

# View raw cron schedule
crontab -l | grep backup
```

### Modify Schedule

To change the backup schedule:

1. **Uninstall current automation**:
   ```bash
   sudo ./scripts/setup-automated-backups.sh --uninstall
   ```

2. **Edit the setup script** to modify `CRON_SCHEDULE` variable

3. **Reinstall automation**:
   ```bash
   sudo ./scripts/setup-automated-backups.sh --install
   ```

## Log Management

### Cron Logs

```bash
# View cron execution log
tail -f /var/log/addypin-backup-cron.log

# View recent cron entries
journalctl -u crond -f
```

### Backup Logs

```bash
# View detailed backup logs
ls /opt/addypin-foundation-backup/logs/

# View specific backup log
cat /opt/addypin-foundation-backup/logs/backup_20241213_020001.log
```

### Log Rotation

Logs are automatically rotated weekly:
- **Cron logs**: Keep 8 weeks, compressed
- **Backup logs**: Managed by backup system cleanup
- **Location**: `/etc/logrotate.d/addypin-backup-cron`

## Troubleshooting

### Common Issues

#### 1. Backup Not Running

**Check cron service**:
```bash
sudo systemctl status cron
sudo systemctl start cron
```

**Verify cron job**:
```bash
crontab -l | grep backup
```

**Check permissions**:
```bash
ls -la /opt/addypin-foundation-backup/scripts/
```

#### 2. Email Notifications Not Working

**Verify API key**:
```bash
echo $RESEND_API_KEY
```

**Test email manually**:
```bash
# Run backup with --auto flag to trigger email
sudo ./scripts/backup-foundation.sh --auto --dry-run
```

#### 3. Permission Errors

**Fix script permissions**:
```bash
chmod +x /opt/addypin-foundation-backup/scripts/*.sh
```

**Fix backup directory permissions**:
```bash
sudo chown -R root:root /opt/addypin-foundation-backup
chmod -R 700 /opt/addypin-foundation-backup/versioned
```

#### 4. Missing Files Warnings

**Check system files exist**:
```bash
# Run dry-run to see what files are missing
sudo ./scripts/backup-foundation.sh --dry-run
```

**Review backup manifest**:
```bash
# Check latest backup manifest
find /opt/addypin-foundation-backup/versioned -name "BACKUP_MANIFEST.txt" | sort | tail -n 1 | xargs cat
```

### Recovery Procedures

#### Manual Backup

If automated backups fail, run manually:

```bash
# Create immediate backup
sudo ./scripts/backup-foundation.sh --force

# Create golden backup (reference)
sudo ./scripts/backup-foundation.sh --golden --force
```

#### Restore from Backup

See the restoration guide:
```bash
cat /opt/addypin-foundation-backup/scripts/restore-foundation.sh --help
```

## Security Considerations

### File Permissions

- **Backup scripts**: 755 (executable by root)
- **Backup directories**: 700 (root access only)
- **Backup files**: 600 (root read/write only)
- **Log files**: 644 (root write, others read)

### Sensitive Data

Backups contain sensitive information:
- Database credentials
- API keys and secrets
- SSL private keys
- Session secrets

**Never**:
- Share backup files over unsecured channels
- Store backups on public cloud without encryption
- Change backup directory permissions to be world-readable

### Environment Variables

Ensure environment variables are properly secured:

```bash
# Verify environment security
sudo crontab -l | grep -E "(API_KEY|SECRET|PASSWORD)"
```

## Maintenance

### Monthly Tasks

1. **Review backup status**:
   ```bash
   ./scripts/setup-automated-backups.sh --status
   ```

2. **Check disk usage**:
   ```bash
   du -sh /opt/addypin-foundation-backup/versioned/
   ```

3. **Verify recent backups**:
   ```bash
   find /opt/addypin-foundation-backup/versioned -type f -name "BACKUP_MANIFEST.txt" -mtime -30
   ```

### Quarterly Tasks

1. **Test backup restoration**:
   ```bash
   sudo ./scripts/backup-foundation.sh --golden --force
   # Test restore from golden backup
   ```

2. **Review and clean old backups**:
   ```bash
   # Keep last 8 backups (4 months for bi-weekly)
   find /opt/addypin-foundation-backup/versioned -maxdepth 1 -type d -name "2*" | sort | head -n -8 | xargs rm -rf
   ```

3. **Update backup notification email**:
   ```bash
   # Review and update NOTIFY_EMAIL in backup-foundation.sh
   sudo vim /opt/addypin-foundation-backup/scripts/backup-foundation.sh
   ```

### Annual Tasks

1. **Review backup strategy**
2. **Update documentation**
3. **Test full disaster recovery procedure**
4. **Audit backup contents for completeness**

## Support

For issues or questions about the backup system:

1. **Check logs**: Start with `/var/log/addypin-backup-cron.log`
2. **Run diagnostics**: Use `--status` and `--dry-run` flags
3. **Review manifests**: Check recent backup manifests for file inventory
4. **Test components**: Run individual scripts manually to isolate issues

## Configuration Reference

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `RESEND_API_KEY` | API key for email notifications | Yes | None |
| `NOTIFY_EMAIL` | Email address for notifications | No | admin@addypin.com |

### Cron Schedule Format

```bash
# Minute Hour Day Month DayOfWeek Condition && Command
0 2 * * 0 [ $(expr $(date +\%W) \% 2) -eq 0 ] && /path/to/backup-foundation.sh --auto
```

This runs at 2:00 AM on Sundays, but only on even-numbered weeks.

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Compatibility**: CentOS 7/8, AlmaLinux 8/9