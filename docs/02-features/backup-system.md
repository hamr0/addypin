# Foundation Backup System

## Overview

Automated bi-weekly backup of critical infrastructure files with email notifications via MSMTP Gmail SMTP.

## Schedule

- **Frequency**: Bi-weekly (every other Sunday at 2:00 AM)
- **Log file**: `/var/log/addypin-backup-cron.log`

```bash
# Cron entry
0 2 * * 0 "/opt/addypin-foundation-backup/scripts/backup-foundation.sh" --auto --biweekly >> /var/log/addypin-backup-cron.log 2>&1
```

## What Gets Backed Up (16 files)

### Docker Configurations
- `/opt/addypin/docker-compose.yml` -> `docker/production-docker-compose.yml`
- `/opt/addypin-staging/docker-compose.yml` -> `docker/staging-docker-compose.yml`

### Environment Files (contains API keys)
- `/opt/addypin/.env` -> `environment/production.env`
- `/opt/addypin-staging/.env` -> `environment/staging.env`

### System Configuration
- Cron jobs, Nginx config, PostgreSQL config
- SSL certificates (Let's Encrypt)

### Monitoring Scripts
- `health-command-symlink`, `universal-health.sh`, `ssh-health.sh`
- `enhanced-health-check-msmtp.sh`, `enhanced-health-check.sh`, `health-check.sh`

### Backup System (self-preserving)
- `backup-foundation.sh`, `setup-automated-backups.sh`
- `backup-status-monitor.sh`, `restore-foundation.sh`

## VPS Directory Layout

```
/opt/addypin-foundation-backup/
├── golden/        # Immutable reference copies
├── versioned/     # Timestamped backups (YYYYMMDD_HHMMSS/)
├── scripts/       # Backup and restore automation
└── logs/          # Operation logs
```

## Scripts

| Script | Location | Purpose |
|--------|----------|---------|
| `backup-foundation.sh` | `/opt/addypin-foundation-backup/scripts/` | Main backup script with MSMTP integration |
| `setup-automated-backups.sh` | `/opt/addypin-foundation-backup/scripts/` | Cron configuration |
| `restore-foundation.sh` | `/opt/addypin-foundation-backup/scripts/` | Disaster recovery |
| `backup-status-monitor.sh` | `/opt/addypin-foundation-backup/scripts/` | Backup monitoring |

## Commands

```bash
# Check automation status
/opt/addypin-foundation-backup/scripts/setup-automated-backups.sh --status

# Run manual backup
/opt/addypin-foundation-backup/scripts/backup-foundation.sh --auto

# Restore from backup
/opt/addypin-foundation-backup/scripts/restore-foundation.sh
```

## Email Notifications

Sends HTML-formatted reports via MSMTP on:
- **Success**: All files backed up
- **Warning**: Some files missing but backup completed
- **Error**: Critical backup failures

## Security

- All backups: 700/600 permissions (root-only access)
- Umask 077 protection during backup operations
