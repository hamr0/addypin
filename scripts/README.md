# AddyPin Scripts Directory

This directory contains organized shell scripts for various AddyPin operations.

---

## 📁 Directory Structure

### `git/` - Git Operations
Scripts for committing and pushing code.

- **commit.sh** - Basic git commit
- **commit-and-push.sh** - Commit and push in one command
- **git-push.sh** - Advanced git push with staging environment support

**Usage**: Mostly replaced by GitHub Actions CI/CD. Use for manual git operations if needed.

---

### `vps/` - VPS Management (Active)
Scripts for managing and troubleshooting the production VPS.

- **query_vps.sh** - Query VPS status
- **ssh-health.sh** - Check SSH connectivity
- **vps-health-check-debug.sh** - Debug VPS health check issues
- **vps-troubleshooting.sh** - Comprehensive VPS troubleshooting

**Usage**: Run these when diagnosing VPS issues.

---

### `backup/` - VPS Setup & Backup (One-Time Use)
Scripts used during initial VPS setup and for backups.

- **vps-database-setup.sh** - Initial database setup
- **vps-one-command-setup.sh** - Complete VPS setup
- **vps-backup.sh** - Database backup
- **vps-backup-setup.sh** - Configure backup automation
- **vps-complete-backup.sh** - Full system backup
- **vps-step1-container-inspection.sh** - Setup step 1
- **vps-step2-api-testing.sh** - Setup step 2

**Usage**: These were used during infrastructure setup. Keep for reference or disaster recovery.

---

### `legacy/` - Deprecated Scripts
Scripts replaced by better alternatives. Kept for reference only.

**Replaced by `dev.sh` and `dev-stop.sh`**:
- dev-with-tunnel.sh
- start-addypin.sh
- start_app.sh
- start_with_tunnel.sh
- tunnel_manager.sh
- tunnel.sh
- setup-tunnel.sh

**Replaced by GitHub Actions CI/CD**:
- configure-workflow.sh
- docker-step-by-step-test.sh

**Replaced by VPS scripts**:
- database-health-monitor.sh
- universal-health.sh
- universal-health-real.sh

**Testing/Debugging (no longer needed)**:
- test-container-detection.sh
- test_container_detection.sh
- test-staging.sh
- troubleshoot-addypin.sh
- verify-terribic-method.sh
- quick-database-fix.sh

**Usage**: Archive only. Do not use.

---

## 🚀 Recommended Scripts (Root Directory)

### Development
```bash
# Start local development (includes SSH tunnel + dev server)
./dev.sh

# Stop local development (kills server + closes tunnel)
./dev-stop.sh
```

### Git Operations (if needed)
```bash
# Commit and push changes
./scripts/git/commit-and-push.sh
```

### VPS Troubleshooting
```bash
# Debug VPS health
./scripts/vps/vps-health-check-debug.sh

# SSH connectivity check
./scripts/vps/ssh-health.sh
```

---

## 🗑️ Cleanup Recommendation

Consider deleting `legacy/` directory after confirming new scripts work:
```bash
rm -rf scripts/legacy/
```

This would reduce the script count from **32 → 14** active scripts.

---

**Last Updated**: October 4, 2025
**Organization**: Code review cleanup