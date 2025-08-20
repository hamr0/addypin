# Quick Production Backup Commands

## Actions for YOU on your VPS:

### One-time setup (install backup script):
```bash
ssh root@155.94.144.191

wget -O /opt/addypin/create-production-backup.sh https://raw.githubusercontent.com/your-repo/create-production-backup.sh
# OR manually create the script from PRODUCTION_BACKUP_GUIDE.md

chmod +x /opt/addypin/create-production-backup.sh
```

### Create backup anytime:
```bash
/opt/addypin/create-production-backup.sh
```

### View backups:
```bash
ls -la /opt/addypin/production-backups/
```

### Restore backup:
```bash
systemctl stop addypin
cp -r /opt/addypin/production-backups/prod_addypin_working_YYYYMMDD_HHMMSS /opt/addypin/app
chown -R addypin:addypin /opt/addypin/app
systemctl start addypin
```

## Backup Naming
Format: `prod_addypin_working_YYYYMMDD_HHMMSS`
Example: `prod_addypin_working_20250820_143000`