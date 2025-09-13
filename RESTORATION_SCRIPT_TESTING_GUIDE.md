# AddyPin Foundation Restoration Script - Transfer & Testing Guide

## 📋 Overview
This guide provides step-by-step instructions for transferring and testing the `restore-foundation.sh` script on your VPS. The script enables you to restore critical infrastructure files from your comprehensive backup system.

---

## 🚀 Step 1: Transfer Script to VPS

### Transfer Command
```bash
# From your Replit workspace, run:
scp addypin-foundation-backup/scripts/restore-foundation.sh root@155.94.144.191:/opt/addypin-foundation-backup/scripts/
```

### Alternative Transfer (if directory doesn't exist)
```bash
# Create directory and transfer in one command:
ssh root@155.94.144.191 "mkdir -p /opt/addypin-foundation-backup/scripts"
scp addypin-foundation-backup/scripts/restore-foundation.sh root@155.94.144.191:/opt/addypin-foundation-backup/scripts/
```

---

## 🔧 Step 2: Set Up Script on VPS

### Connect to VPS and Set Permissions
```bash
# SSH to your VPS
ssh root@155.94.144.191

# Navigate to the script directory
cd /opt/addypin-foundation-backup/scripts

# Make script executable
chmod +x restore-foundation.sh

# Verify permissions
ls -la restore-foundation.sh
# Expected output: -rwxr-xr-x 1 root root 27370 Sep 13 XX:XX restore-foundation.sh
```

---

## 🧪 Step 3: Testing Procedures

### 3.1 Display Help and Available Options
```bash
# Show help message
./restore-foundation.sh --help
```

**Expected Output:**
```
AddyPin Foundation Restore Script
Usage: ./restore-foundation.sh [OPTIONS]

Restore Options:
  --from-golden       Restore from golden backup (immutable reference)
  --timestamp=X       Restore from specific timestamp (YYYYMMDD_HHMMSS)

Control Options:
  --dry-run          Show what would be restored without actually copying files
  --force            Skip confirmation prompts and overwrite files
  --skip-services    Skip service restart prompts
  --help             Show this help message

Examples:
  ./restore-foundation.sh --from-golden                    # Restore from golden backup
  ./restore-foundation.sh --timestamp=20250913_143022      # Restore from specific backup
  ./restore-foundation.sh --dry-run --from-golden          # Preview golden restoration
  ./restore-foundation.sh --force --skip-services          # Automated restoration
```

### 3.2 Test Backup Discovery
```bash
# Test if script can find available backups (without actually restoring)
./restore-foundation.sh
```

**Expected Output:**
```
╔══════════════════════════════════════════════╗
║         🔄  AddyPin Foundation Restore        ║
║              Infrastructure Recovery         ║
║                                              ║
║ ⚠️  CRITICAL: Production system restoration  ║
╚══════════════════════════════════════════════╝

❌ No restore source specified. Use --from-golden or --timestamp=X

📂 Available Backups:
   Golden Backup (Created: 2025-09-13)
     Use: --from-golden

   Recent Versioned Backups:
     20250913_143022
       Use: --timestamp=20250913_143022
```

### 3.3 Dry-Run Test (Golden Backup)
```bash
# Test dry-run mode to see what would be restored
./restore-foundation.sh --dry-run --from-golden
```

**Expected Output Structure:**
```
╔══════════════════════════════════════════════╗
║         🔄  AddyPin Foundation Restore        ║
║              Infrastructure Recovery         ║
║                                              ║
║ ⚠️  CRITICAL: Production system restoration  ║
╚══════════════════════════════════════════════╝

🔄 Checking permissions...
✅ Permission check completed

🔄 Determining restore source...
✅ Restore source: Golden Backup
ℹ️  Location: /opt/addypin-foundation-backup/golden

📂 Available Backups:
   Golden Backup (Created: 2025-09-13)
     Use: --from-golden

📋 Restoration Configuration:
   Source: Golden Backup
   Dry Run: YES
   Force Mode: NO
   Skip Services: NO
   Safety Backup: Would Create

🔄 Verifying backup integrity...
✅ Backup integrity verified

ℹ️  Would create safety backup at: /opt/addypin-foundation-backup/versioned/pre-restore-20250913_XXXXXX

🔄 Starting infrastructure restoration...

📂 Restoring infrastructure files:
ℹ️  Would restore: postgresql.conf
ℹ️  Would restore: pg_hba.conf
ℹ️  Would restore: server.crt
ℹ️  Would restore: server.key
ℹ️  Would restore: production-docker-compose.yml
ℹ️  Would restore: staging-docker-compose.yml
ℹ️  Would restore: production.env
ℹ️  Would restore: staging.env
ℹ️  Would restore: enhanced-health-check.sh
ℹ️  Would restore: health-check-email.js
ℹ️  Would restore: infra-health-check.sh
ℹ️  Would restore: nginx.conf
ℹ️  Would restore: addypin.conf
ℹ️  Would restore: root-crontab
ℹ️  Would restore: logrotate-infra-health-check

🔒 Restoring SSL certificates:
ℹ️  Would restore SSL certs: addypin.com
ℹ️  Would restore SSL certs: www.addypin.com
ℹ️  Would restore SSL certs: staging.addypin.com

✅ Verifying restoration:
ℹ️  All files verified successfully (XX files)

╔══════════════════════════════════════════════╗
║            📊 Restoration Summary            ║
╚══════════════════════════════════════════════╝

Restoration Details:
   Source: Golden Backup
   Mode: DRY RUN

File Statistics:
   📊 Total Files: XX
   ✅ Restored Successfully: 0 (Dry Run)
   ❌ Failed Restorations: 0
   ⏭️  Skipped Files: 0

✅ Restoration completed successfully! 🎉

💡 Next Steps:
   1. Review what would be restored above
   2. Run without --dry-run to perform actual restoration
   3. Ensure you have proper backups before proceeding
```

### 3.4 Test Specific Timestamp Restoration (Dry-Run)
```bash
# Test restoration from a specific timestamp (replace with actual timestamp)
./restore-foundation.sh --dry-run --timestamp=20250913_143022
```

---

## 🔍 Step 4: Verification Tests

### 4.1 Check Script Permissions and Ownership
```bash
# Verify script is properly set up
ls -la /opt/addypin-foundation-backup/scripts/restore-foundation.sh
stat /opt/addypin-foundation-backup/scripts/restore-foundation.sh
```

### 4.2 Test Script Syntax
```bash
# Check for syntax errors
bash -n /opt/addypin-foundation-backup/scripts/restore-foundation.sh
echo $?  # Should return 0 if no syntax errors
```

### 4.3 Verify Backup Directory Structure
```bash
# Check that backup directories exist
ls -la /opt/addypin-foundation-backup/
ls -la /opt/addypin-foundation-backup/golden/
ls -la /opt/addypin-foundation-backup/versioned/
```

---

## ⚠️ Step 5: Safety Considerations

### Before Live Restoration
1. **Always run dry-run first**: Test with `--dry-run` to see what would be changed
2. **Verify current system**: Ensure current services are running properly
3. **Check backup integrity**: Confirm the backup you're restoring from is complete
4. **Plan service downtime**: Some services may need to restart after restoration

### During Live Restoration
1. **Monitor actively**: Watch for errors during the restoration process
2. **Have rollback ready**: The script creates safety backups for rollback
3. **Test immediately**: Verify services after restoration

---

## 🚨 Step 6: Live Restoration (When Ready)

### 6.1 Live Golden Backup Restoration
```bash
# CAUTION: This will overwrite current files!
./restore-foundation.sh --from-golden
```

**The script will:**
1. Create a safety backup of current files
2. Prompt for confirmation
3. Restore files from golden backup
4. Ask if you want to restart affected services
5. Provide detailed restoration summary

### 6.2 Automated Live Restoration (Skip Prompts)
```bash
# For automated deployment scenarios
./restore-foundation.sh --from-golden --force --skip-services
```

---

## 🛠️ Step 7: Post-Restoration Verification

### Verify Key Services
```bash
# Check PostgreSQL
systemctl status postgresql
sudo -u postgres psql -c "SELECT version();"

# Check Nginx
systemctl status nginx
nginx -t

# Check Docker containers
docker ps
docker compose -f /opt/addypin/docker-compose.yml ps
```

### Check Application Health
```bash
# Test health endpoints
curl -s http://localhost/api/health
curl -s https://addypin.com/api/health
curl -s https://staging.addypin.com/api/health
```

---

## 📊 Step 8: Logs and Monitoring

### View Restoration Logs
```bash
# Check restoration logs
ls -la /opt/addypin-foundation-backup/logs/
cat /opt/addypin-foundation-backup/logs/restore_*.log

# Check restoration manifest
cat /opt/addypin-foundation-backup/logs/restoration_*_manifest.txt
```

### Monitor System After Restoration
```bash
# Check system resources
htop
df -h
free -h

# Monitor service logs
journalctl -f -u nginx
journalctl -f -u postgresql
docker compose -f /opt/addypin/docker-compose.yml logs -f
```

---

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. Permission Denied
```bash
# Problem: Permission denied when running script
# Solution: Ensure script is executable and run as root
chmod +x restore-foundation.sh
sudo ./restore-foundation.sh [options]
```

#### 2. Backup Not Found
```bash
# Problem: "Golden backup not found" or "Timestamp backup not found"
# Solution: Verify backup directory exists and has content
ls -la /opt/addypin-foundation-backup/golden/
ls -la /opt/addypin-foundation-backup/versioned/
```

#### 3. Service Restart Fails
```bash
# Problem: Services fail to restart after restoration
# Solution: Check service status and restart manually
systemctl status postgresql nginx
systemctl restart postgresql nginx
docker compose -f /opt/addypin/docker-compose.yml restart
```

#### 4. Rollback Needed
```bash
# Problem: Restoration caused issues, need to rollback
# Solution: Use safety backup created during restoration
ls -la /opt/addypin-foundation-backup/versioned/pre-restore-*/
# Manually copy files back or re-run with earlier timestamp
```

### Emergency Contacts
- **System Status**: Check `/opt/infra/health-check.sh`
- **Application Logs**: `/opt/addypin/logs/`
- **Database Status**: `sudo -u postgres psql -c "SELECT now();"`

---

## ✅ Success Indicators

### Signs of Successful Testing:
1. ✅ Script displays help properly with `--help`
2. ✅ Dry-run shows available backups and restoration plan
3. ✅ No syntax errors when checking with `bash -n`
4. ✅ Script has proper permissions (rwxr-xr-x)
5. ✅ Backup directories are accessible and contain files

### Ready for Live Restoration When:
1. ✅ All dry-run tests pass without errors
2. ✅ Current system is running normally
3. ✅ Safety backups are confirmed available
4. ✅ Service restart procedures are understood
5. ✅ Rollback plan is clear and tested

---

## 📞 Next Steps

Once testing is complete and successful:

1. **Notify team**: Inform stakeholders of restoration script availability
2. **Schedule restoration**: Plan maintenance window if needed for live restoration
3. **Document results**: Record test results and any issues found
4. **Update procedures**: Add restoration script to operational runbooks

The restoration script is now ready for production use! 🎉