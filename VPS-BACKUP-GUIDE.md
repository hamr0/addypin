# VPS Backup Guide for AddyPin

## 📍 Script Locations

### In Your Replit Environment
- **`vps-complete-backup.sh`** - Main backup script (root directory)
- **`vps-backup-setup.sh`** - Setup script that creates directories and sets immutable protection (root directory)
- **`replit-git-push.sh`** - Git push/commit script for Replit (root directory)

### To Copy to VPS
```bash
# Copy both backup scripts to VPS
scp vps-complete-backup.sh root@155.94.144.191:/opt/addypin/
scp vps-backup-setup.sh root@155.94.144.191:/opt/addypin/
```

## 🚀 Complete Setup Process (In Order)

### Step 1: Initial VPS Setup
```bash
# SSH into VPS
ssh root@155.94.144.191
cd /opt/addypin

# Make scripts executable
chmod +x vps-backup-setup.sh
chmod +x vps-complete-backup.sh

# Run setup script (creates dirs, sets immutable, runs backup)
sudo ./vps-backup-setup.sh
```

### Step 2: What Gets Created

#### Directory Structure
```
/opt/addypin/
├── backups/                        # Main backup storage (timestamped)
│   ├── 20250202_123456/           # Example backup directory
│   └── backup.log                  # Backup operation logs
└── config-backup-immutable/        # Protected immutable backup
    ├── configs/                    # Environment files, scripts
    │   ├── .env.staging
    │   ├── .env.production
    │   └── CRITICAL_ENV_VARS.txt
    ├── nginx/                      # Nginx configurations
    └── docker/                     # Docker compose files
```

#### Critical Environment Variables Preserved
```bash
# Email Service
RESEND_API_KEY=re_YEEpxspy_2zkWUtuc3aVw4fcbYCFqD2mK

# Authentication  
CLERK_SECRET_KEY=sk_test_0EIjIoMe694NJvxKoiMPwexmUsVlIo55ILP6bv5c8h

# Database
DATABASE_URL=postgresql://addypin_user:secure_password_123@172.17.0.1:5432/addypin_staging

# Application
NODE_ENV=staging
PORT=3000
STAGING_PORT=8080
```

## 🔒 Immutable Protection

### What It Does
- Prevents accidental deletion of critical configs
- Uses filesystem `chattr +i` attribute
- Protects against CI/CD accidents

### Remove Protection (If Needed)
```bash
sudo chattr -i /opt/addypin/config-backup-immutable
sudo find /opt/addypin/config-backup-immutable -type f -exec chattr -i {} \;
```

### Reapply Protection
```bash
sudo chattr +i /opt/addypin/config-backup-immutable
sudo find /opt/addypin/config-backup-immutable -type f -exec chattr +i {} \;
```

## 📤 Git Push/Commit from Replit

### Location
**`replit-git-push.sh`** in root directory

### How to Use
```bash
# In Replit terminal
chmod +x replit-git-push.sh
./replit-git-push.sh

# It will:
# 1. Show current changes
# 2. Ask for commit message (or auto-generate)
# 3. Push to GitHub main branch
# 4. Ready for CI/CD deployment
```

## 🚀 CI/CD Deployment Status

### ✅ Staging CI/CD - READY TO RUN
- **Workflow:** `.github/workflows/addypin-staging-deploy.yml`
- **Port:** 8080
- **Access:** http://addypin.com:8080
- **Features:**
  - Environment variables hardcoded (won't lose them)
  - Separate staging database
  - Browser headers for anti-bot bypass
  - Health check delays to avoid rate limiting

### ✅ Production CI/CD - READY TO RUN  
- **Workflow:** `.github/workflows/addypin-manual-deploy.yml`
- **Port:** 3000
- **Access:** http://addypin.com
- **Features:**
  - Production database
  - Proven deployment approach
  - Comprehensive health checks

### How to Deploy

1. **Push Changes to GitHub**
   ```bash
   # In Replit
   ./replit-git-push.sh
   ```

2. **Run CI/CD Workflow**
   - Go to GitHub repository
   - Click "Actions" tab
   - Choose workflow:
     - **"AddyPin Staging Deploy"** for staging (port 8080)
     - **"AddyPin Manual Deploy"** for production (port 3000)
   - Click "Run workflow"
   - Select main branch
   - Click "Run workflow" button

## 🔄 Regular Backup Schedule

### Manual Backup
```bash
# SSH to VPS and run
cd /opt/addypin
sudo ./vps-complete-backup.sh
```

### What Gets Backed Up
- ✅ Configuration files (`/opt/addypin/*`)
- ✅ Environment variables (`.env.staging`, `.env.production`)
- ✅ Docker configurations (`docker-compose.*.yml`)
- ✅ Nginx configurations (`/etc/nginx/*`)
- ✅ PostgreSQL database dump
- ✅ Firewall rules (UFW/iptables)
- ✅ Systemd services
- ✅ Web application files (`/var/www/*`)
- ✅ System logs (7 days)

### Backup Retention
- Keeps last 7 backups automatically
- Older backups deleted to save space
- Immutable backup never deleted

## 🚨 Troubleshooting

### If Backup Fails
```bash
# Check logs
cat /opt/addypin/backups/backup.log

# Check disk space
df -h

# Check PostgreSQL status
systemctl status postgresql
```

### If CI/CD Fails
- Check GitHub Actions logs
- Verify secrets are set in GitHub repository settings:
  - `SSH_PRIVATE_KEY`
  - `RESEND_API_KEY` (though hardcoded in staging)
  - `PERSONAL_ACCESS_TOKEN`

### If Immutable Protection Issues
```bash
# Check filesystem support
mount | grep /opt

# Remove protection, modify, reapply
sudo chattr -i /opt/addypin/config-backup-immutable
# make changes
sudo chattr +i /opt/addypin/config-backup-immutable
```

## 📊 Status Summary

| Component | Status | Location |
|-----------|--------|----------|
| VPS Backup Script | ✅ Ready | `vps-complete-backup.sh` |
| VPS Setup Script | ✅ Ready | `vps-backup-setup.sh` |
| Git Push Script | ✅ Ready | `replit-git-push.sh` |
| Staging CI/CD | ✅ Ready | `.github/workflows/addypin-staging-deploy.yml` |
| Production CI/CD | ✅ Ready | `.github/workflows/addypin-manual-deploy.yml` |
| Immutable Backup | 🔧 Run setup | `/opt/addypin/config-backup-immutable/` |

## 🎯 Quick Commands Reference

```bash
# Push to GitHub (Replit)
./replit-git-push.sh

# Initial VPS Setup (one-time)
ssh root@155.94.144.191 "cd /opt/addypin && ./vps-backup-setup.sh"

# Regular Backup (VPS)
ssh root@155.94.144.191 "cd /opt/addypin && ./vps-complete-backup.sh"

# Deploy Staging
# Go to GitHub Actions → Run "AddyPin Staging Deploy"

# Deploy Production  
# Go to GitHub Actions → Run "AddyPin Manual Deploy"
```

## 🔐 Security Notes

1. **Critical Environment Variables** are preserved in multiple places:
   - Hardcoded in staging CI/CD workflow
   - Saved in immutable backup directory
   - Documented in this guide

2. **Immutable Protection** prevents accidental deletion during:
   - CI/CD deployments
   - Manual cleanup operations
   - System maintenance

3. **Backup Verification** - Always check after backup:
   ```bash
   ls -la /opt/addypin/backups/
   ls -la /opt/addypin/config-backup-immutable/
   ```

---

**Last Updated:** February 2, 2025
**Author:** Replit Agent
**Project:** AddyPin Location Sharing Service