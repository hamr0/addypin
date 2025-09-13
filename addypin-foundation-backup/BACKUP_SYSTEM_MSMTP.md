# AddyPin Foundation Backup System with MSMTP Email Integration

## 🎯 Overview

The AddyPin Foundation Backup System provides comprehensive infrastructure backup with automated email notifications via MSMTP Gmail SMTP. This system backs up critical infrastructure files, configurations, and certificates on a bi-weekly schedule with email completion alerts.

## 📧 Email Integration

### MSMTP Configuration
- **SMTP Provider**: Gmail SMTP (smtp.gmail.com:587) with TLS encryption
- **Authentication**: Gmail App Password (16-character) with 2FA requirement
- **Configuration File**: `/root/.msmtprc` (600 permissions)
- **Email Recipient**: `avoidaccess@gmail.com`
- **Email Format**: Professional HTML-formatted backup reports

### Email Triggers
- **Backup Success**: All files backed up successfully
- **Backup Warning**: Some files missing but backup completed
- **Backup Error**: Critical backup failures occurred

## 🔧 Script Locations

### Primary Backup Scripts
- **MSMTP Backup Script**: `/opt/addypin-foundation-backup/scripts/backup-foundation-msmtp.sh` - New MSMTP version
- **Original Backup Script**: `/opt/addypin-foundation-backup/scripts/backup-foundation.sh` - Legacy Resend API version (replaced)
- **Setup Automation**: `/opt/addypin-foundation-backup/scripts/setup-automated-backups.sh` - Cron configuration
- **Restore Script**: `/opt/addypin-foundation-backup/scripts/restore-foundation.sh` - Disaster recovery

### Backup Directories
- **Golden Backup**: `/opt/addypin-foundation-backup/golden/` - Immutable reference point
- **Versioned Backups**: `/opt/addypin-foundation-backup/versioned/YYYYMMDD_HHMMSS/` - Timestamped backups
- **Logs**: `/opt/addypin-foundation-backup/logs/` - Backup operation logs

## ⏰ Automated Backup Schedule

### Cron Configuration
```bash
# Foundation backup (bi-weekly, every other Sunday at 2:00 AM)
0 2 * * 0 "/opt/addypin-foundation-backup/scripts/backup-foundation-msmtp.sh" --auto --biweekly >> /var/log/addypin-backup-cron.log 2>&1
```

### Schedule Details
- **Frequency**: Bi-weekly (every other Sunday)
- **Time**: 2:00 AM server time
- **Mode**: Automated with email notifications
- **Log File**: `/var/log/addypin-backup-cron.log`

## 📁 Backup Coverage

### Critical Infrastructure Files (16 Files Total)

#### Docker Configurations (Critical)
- `/opt/addypin/docker-compose.yml` → `docker/production-docker-compose.yml`
- `/opt/addypin-staging/docker-compose.yml` → `docker/staging-docker-compose.yml`

#### Environment Files (Critical - Contains API Keys)
- `/opt/addypin/.env` → `environment/production.env`
- `/opt/addypin-staging/.env` → `environment/staging.env`

#### System Configuration (Critical)
- `/var/spool/cron/root` → `system/root-crontab`

#### Monitoring Scripts (High Priority)
- `/opt/addypin/scripts/health-check.sh` → `monitoring/health-check.sh`
- `/opt/addypin/scripts/enhanced-health-check.sh` → `monitoring/enhanced-health-check.sh`
- `/opt/addypin/scripts/health-check-email.js` → `monitoring/health-check-email.js`

#### Nginx Configuration (High Priority)
- `/etc/nginx/nginx.conf` → `nginx/nginx.conf`
- `/etc/nginx/conf.d/addypin.conf` → `nginx/addypin.conf`

#### PostgreSQL Configuration (Medium Priority)
- `/var/lib/pgsql/data/postgresql.conf` → `postgresql/postgresql.conf`
- `/var/lib/pgsql/data/pg_hba.conf` → `postgresql/pg_hba.conf`
- `/var/lib/pgsql/data/ssl/server.crt` → `postgresql/ssl/server.crt`
- `/var/lib/pgsql/data/ssl/server.key` → `postgresql/ssl/server.key`

#### System Configuration (Low Priority)
- `/etc/logrotate.d/addypin-health-check` → `system/logrotate-addypin-health-check`

#### SSL Certificates (Let's Encrypt)
- `/etc/letsencrypt/live/addypin.com/` → `ssl-certificates/addypin.com/`
- `/etc/letsencrypt/live/www.addypin.com/` → `ssl-certificates/www.addypin.com/`
- `/etc/letsencrypt/live/staging.addypin.com/` → `ssl-certificates/staging.addypin.com/`

### File Priority Classification
- **Critical**: 5 files (must exist in production)
- **High**: 5 files (should exist for proper operation)
- **Medium**: 4 files (database configurations, may not exist on all systems)
- **Low**: 1 file (optional configurations)
- **SSL**: 1 file (Let's Encrypt certificates)

## 🔧 Manual Backup Commands

### Standard Backup Operations
```bash
# Full backup with email notification
/opt/addypin-foundation-backup/scripts/backup-foundation-msmtp.sh --auto

# Test backup (dry-run, no actual copying)
/opt/addypin-foundation-backup/scripts/backup-foundation-msmtp.sh --dry-run

# Force overwrite existing backup
/opt/addypin-foundation-backup/scripts/backup-foundation-msmtp.sh --auto --force

# Create golden backup (immutable reference)
/opt/addypin-foundation-backup/scripts/backup-foundation-msmtp.sh --auto --golden

# Manual backup without email notifications
/opt/addypin-foundation-backup/scripts/backup-foundation-msmtp.sh
```

### Backup Management Commands
```bash
# Check backup system status
/opt/addypin-foundation-backup/scripts/setup-automated-backups.sh --status

# View backup automation logs
tail -f /var/log/addypin-backup-cron.log

# List existing backups
ls -la /opt/addypin-foundation-backup/versioned/
ls -la /opt/addypin-foundation-backup/golden/

# Check cron configuration
crontab -l | grep backup
```

### Email Testing Commands
```bash
# Test backup email notification
/opt/addypin/scripts/send-health-alert.sh backup "Manual backup test notification - $(date)"

# Send backup status alert
/opt/addypin/health-manager.sh backup-alert

# Test backup system via health manager
/opt/addypin/health-manager.sh backup-test
```

## 📊 Backup Process Flow

### Automated Process (Bi-weekly)
1. **Week Check**: Verify current week is even number (bi-weekly mode)
2. **Permission Check**: Ensure running as root user
3. **Logging Setup**: Initialize secure logging system
4. **File Backup**: Copy all critical infrastructure files
5. **SSL Backup**: Backup Let's Encrypt certificates if present
6. **Manifest Creation**: Generate backup manifest with statistics
7. **Security**: Set secure permissions (700/600) on backup directory
8. **Email Notification**: Send completion status via MSMTP

### Backup Security
- **File Permissions**: All backups secured with 600 permissions (root only)
- **Directory Permissions**: Backup directories secured with 700 permissions
- **Logging**: Detailed logging with timestamps and security events
- **Validation**: File integrity verification during backup process

## 📧 Email Notification Details

### Email Content (HTML Format)
- **Header**: AddyPin branding with alert type color coding
- **Summary**: Backup status, timestamp, and size information
- **Statistics**: Total files, copied successfully, missing files, errors
- **Server Details**: VPS information and backup mode
- **Quick Actions**: SSH access, health check, and backup status commands

### Email Types
- **Success (Green)**: All files backed up successfully
- **Warning (Yellow)**: Backup completed but some files missing
- **Error (Red)**: Critical backup failures occurred

### Sample Email Triggers
```bash
# Success: "✅ BACKUP: AddyPin Foundation Backup completed successfully"
# Warning: "⚠️ BACKUP: AddyPin Foundation Backup completed with 2 missing files"
# Error: "❌ BACKUP: AddyPin Foundation Backup failed with 3 file errors"
```

## 🔍 Troubleshooting

### Common Issues

#### Backup Not Running
```bash
# Check cron service
systemctl status crond

# Verify cron job exists
crontab -l | grep backup

# Check script permissions
ls -la /opt/addypin-foundation-backup/scripts/backup-foundation-msmtp.sh

# Run manual test
/opt/addypin-foundation-backup/scripts/backup-foundation-msmtp.sh --dry-run
```

#### Email Notifications Not Sending
```bash
# Test MSMTP directly
echo "Test backup email" | msmtp avoidaccess@gmail.com

# Check MSMTP configuration
ls -la /root/.msmtprc

# Verify email script
/opt/addypin/scripts/send-health-alert.sh backup "Test backup notification"

# Check backup script uses MSMTP
grep -i "msmtp\|send-health-alert" /opt/addypin-foundation-backup/scripts/backup-foundation-msmtp.sh
```

#### Missing Files in Backup
```bash
# Review backup manifest
cat /opt/addypin-foundation-backup/versioned/*/BACKUP_MANIFEST.txt

# Check file priorities
grep -A20 "Missing Files by Priority" /opt/addypin-foundation-backup/logs/backup_*.log

# Verify critical files exist
ls -la /opt/addypin/docker-compose.yml /opt/addypin/.env
```

## 🔧 Maintenance and Monitoring

### Regular Maintenance Tasks
- **Monthly**: Review backup manifests for missing files
- **Quarterly**: Test restore procedure with golden backup
- **Semi-annually**: Verify all critical files are being backed up
- **As needed**: Update backup file list for new infrastructure

### Backup Verification
```bash
# Check latest backup status
ls -la /opt/addypin-foundation-backup/versioned/ | tail -5

# Review backup manifest
find /opt/addypin-foundation-backup/versioned -name "BACKUP_MANIFEST.txt" -exec cat {} \; | tail -20

# Verify golden backup exists
ls -la /opt/addypin-foundation-backup/golden/

# Check backup logs
tail -20 /opt/addypin-foundation-backup/logs/backup_*.log
```

### Storage Management
- **Disk Usage**: Monitor `/opt/addypin-foundation-backup/` disk usage
- **Log Rotation**: Backup logs automatically managed
- **Cleanup**: Old versioned backups can be manually removed if space needed
- **Golden Backup**: Maintain as permanent reference point

## 🚨 Disaster Recovery

### Restore Process
1. **Access VPS**: SSH to server with recovery account
2. **Navigate to Backup**: `cd /opt/addypin-foundation-backup/`
3. **Choose Backup**: Select golden or recent versioned backup
4. **Run Restore**: Use restore script with specific backup directory
5. **Verify Services**: Restart services and verify functionality

### Restore Commands
```bash
# Restore from golden backup
/opt/addypin-foundation-backup/scripts/restore-foundation.sh --from golden

# Restore from specific versioned backup
/opt/addypin-foundation-backup/scripts/restore-foundation.sh --from versioned/20250913_020000

# Dry-run restore (test mode)
/opt/addypin-foundation-backup/scripts/restore-foundation.sh --dry-run --from golden
```

### Emergency Contacts
- **Primary**: avoidaccess@gmail.com (automatic notifications)
- **VPS Access**: SSH root@155.94.144.191
- **Backup Location**: `/opt/addypin-foundation-backup/`

---

**📧 All backup notifications sent to: avoidaccess@gmail.com**  
**⏰ Automated backups: Bi-weekly Sunday 2:00 AM**  
**🔧 Manual commands available via backup-foundation-msmtp.sh**  
**📁 Perfect coverage: 16/16 critical infrastructure files**