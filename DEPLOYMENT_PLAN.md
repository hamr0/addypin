# AddyPin Production Deployment Implementation Plan

## Complete Infrastructure Details

### VPS Configuration
- **Provider:** RackNerd
- **IP:** 155.94.144.191
- **SSH:** root@155.94.144.191 (password: 4R1ilBJM18jt9f2TAu)
- **Application:** /opt/addypin/app (current running)
- **Repository:** /opt/addypin/addypin-repo
- **Service:** systemd (addypin.service)
- **Domain:** https://addypin.com (SSL configured)

### Database Configuration
- **PostgreSQL:** localhost:5432
- **Database:** addypin
- **User:** addypin_user
- **Connection:** postgresql://addypin_user:secure_p...@localhost:5432/addypin
- **Backups:** /opt/addypin/production-backups/

### GitHub & Secrets
- **Repository:** https://github.com/amrhas82/addypin
- **Access Token:** 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
- **Available Secrets:** GITHUB_PERSONAL_ACCESS_TOKEN, RESEND_API_KEY, VPS_DATABASE_PASSWORD

## Implementation Steps

### Phase 1: VPS Preparation (5-10 minutes)

**Your Actions (via PuTTY):**

1. **Upload deployment scripts to VPS:**
```bash
# Connect to VPS
ssh root@155.94.144.191
# Password: 4R1ilBJM18jt9f2TAu

# Create scripts directory
mkdir -p /opt/addypin/scripts

# Copy deployment script (I'll provide content to paste)
nano /opt/addypin/scripts/deploy-production.sh
# PASTE: [Content from scripts/deploy-production.sh]

# Copy health check script
nano /opt/addypin/scripts/health-check.sh  
# PASTE: [Content from scripts/health-check.sh]

# Copy rollback script
nano /opt/addypin/scripts/rollback.sh
# PASTE: [Content from scripts/rollback.sh]

# Make scripts executable
chmod +x /opt/addypin/scripts/*.sh

# Install bc for calculations
yum install -y bc
```

2. **Test current backup system:**
```bash
# Navigate to AddyPin directory
cd /opt/addypin

# Test existing backup script
./create-production-backup.sh

# Verify backup was created
ls -la production-backups/
```

### Phase 2: GitHub Secrets Configuration (3-5 minutes)

**Your Actions (via GitHub Web Interface):**

1. **Go to GitHub repository:** https://github.com/amrhas82/addypin
2. **Navigate to:** Settings → Secrets and variables → Actions
3. **Add these Repository Secrets:**

```
SSH_HOST = 155.94.144.191
SSH_USERNAME = root
SSH_PASSWORD = 4R1ilBJM18jt9f2TAu
GITHUB_TOKEN = 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
```

### Phase 3: GitHub Actions Workflow Setup (2-3 minutes)

**Your Actions (via Replit or GitHub):**

1. **Create workflow directory:**
```bash
mkdir -p .github/workflows
```

2. **Commit and push the GitHub Actions workflow:**
- The `.github/workflows/deploy.yml` file is already created
- Commit and push to repository

### Phase 4: Initial Deployment Test (10-15 minutes)

**Your Actions:**

1. **Test local build (in Replit):**
```bash
# Verify build process works
npm ci
npm run build
```

2. **Create test deployment (via GitHub):**
- Create a small change in the repository
- Create a Pull Request to test the workflow
- Merge to main to trigger deployment

3. **Monitor deployment (via PuTTY):**
```bash
# Watch deployment logs
tail -f /var/log/addypin/deploy-*.log

# Check service status
systemctl status addypin

# Run health check
/opt/addypin/scripts/health-check.sh
```

### Phase 5: Verification & Testing (5-10 minutes)

**Your Actions:**

1. **Verify deployment worked:**
```bash
# Check website
curl -I https://addypin.com

# Check API
curl https://addypin.com/api/stats

# Check service status
systemctl status addypin

# Check logs for errors
journalctl -u addypin --since "10 minutes ago"
```

2. **Test rollback capability:**
```bash
# List available backups
/opt/addypin/scripts/rollback.sh --list

# Test rollback (optional)
/opt/addypin/scripts/rollback.sh --emergency
```

## Expected Prompts & Responses

### During VPS Script Creation:
- **Prompt:** "Create new file?" → **Answer:** `y`
- **Prompt:** "Save file?" → **Answer:** `Ctrl+X`, then `y`, then `Enter`

### During Package Installation:
- **Prompt:** "Install bc package?" → **Answer:** `y`

### During Deployment:
- **Expected Output:** Green checkmarks for each deployment step
- **If Errors:** Red X marks with specific error messages

## Error Handling Strategy

### If Deployment Fails:
1. **Check logs:** `/var/log/addypin/deploy-*.log`
2. **Run health check:** `/opt/addypin/scripts/health-check.sh`
3. **Manual rollback:** `/opt/addypin/scripts/rollback.sh --emergency`

### If Health Checks Fail:
1. **Service issues:** `systemctl restart addypin`
2. **Database issues:** Check PostgreSQL status
3. **Network issues:** Check domain and SSL

### If Rollback Needed:
```bash
# Emergency rollback (safest option)
/opt/addypin/scripts/rollback.sh --emergency

# Application only rollback
/opt/addypin/scripts/rollback.sh --app

# List backups first
/opt/addypin/scripts/rollback.sh --list
```

## Success Indicators

### Deployment Success:
- ✅ GitHub Actions workflow completes without errors
- ✅ Service status shows "active (running)"
- ✅ https://addypin.com responds with HTTP 200
- ✅ API endpoints return valid data
- ✅ Health check script passes all tests

### Rollback Success:
- ✅ Previous version restored
- ✅ Service running normally
- ✅ Website accessible
- ✅ Database intact

## Emergency Contacts & Recovery

### If Complete Failure:
1. **Immediate action:** `/opt/addypin/scripts/rollback.sh --emergency`
2. **Check backup integrity:** `ls -la /opt/addypin/production-backups/`
3. **Manual service restart:** `systemctl restart addypin`
4. **Check systemd logs:** `journalctl -u addypin --since "1 hour ago"`

### Recovery Commands:
```bash
# Service recovery
systemctl stop addypin
systemctl start addypin
systemctl status addypin

# Database recovery
sudo -u postgres psql -d addypin -c "SELECT version();"

# Quick health check
curl -I https://addypin.com
```

## Next Steps After Success

1. **Document any issues encountered**
2. **Update replit.md with deployment results**
3. **Set up monitoring for future deployments**
4. **Test the CI/CD pipeline with small changes**

---

**IMPORTANT:** This plan uses your existing production infrastructure and maintains all current functionality. No breaking changes to database or service configuration.