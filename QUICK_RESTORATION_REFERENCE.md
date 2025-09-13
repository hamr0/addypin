# 🚀 AddyPin Restoration Script - Quick Reference

## Essential Commands

### 1. Transfer Script to VPS
```bash
# From Replit workspace:
scp addypin-foundation-backup/scripts/restore-foundation.sh root@155.94.144.191:/opt/addypin-foundation-backup/scripts/
```

### 2. Set Up on VPS
```bash
# SSH to VPS and set permissions:
ssh root@155.94.144.191
cd /opt/addypin-foundation-backup/scripts
chmod +x restore-foundation.sh
```

### 3. Test Script (Safe Dry-Run)
```bash
# Test help system:
./restore-foundation.sh --help

# Test golden backup dry-run (safe - no changes made):
./restore-foundation.sh --dry-run --from-golden

# List available backups:
./restore-foundation.sh
```

### 4. Live Restoration (When Ready)
```bash
# Interactive restoration:
./restore-foundation.sh --from-golden

# Automated restoration:
./restore-foundation.sh --from-golden --force --skip-services
```

## 📋 Status Indicators

### ✅ Ready to Transfer When:
- Script shows permissions: `-rwxr-xr-x` (✓ Already verified)
- File size: ~27KB (✓ Already verified)

### ✅ Ready for Live Restoration When:
- Dry-run test passes without errors
- All expected files are listed in dry-run output
- Current system is stable
- Maintenance window is scheduled (if needed)

## 🆘 Emergency Rollback
If restoration causes issues, safety backups are created at:
```
/opt/addypin-foundation-backup/versioned/pre-restore-[timestamp]/
```

## 📚 Full Documentation
See `RESTORATION_SCRIPT_TESTING_GUIDE.md` for complete instructions.