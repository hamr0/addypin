# Manual Deployment Guide

Since GitHub Actions SSH authentication is having issues, let's deploy manually using the VPS scripts we created.

## Method 1: Manual Deployment via VPS Scripts

**Connect to your VPS and run the deployment script directly:**

```bash
# Connect via PuTTY
ssh root@155.94.144.191

# Run the manual deployment script
cd /opt/addypin
./scripts/deploy-production.sh
```

This will:
- Create backups automatically
- Pull latest code from GitHub 
- Build and deploy safely
- Run health checks
- Rollback if anything fails

## Method 2: Quick Manual Update

If you prefer to update specific files manually:

**1. Update database configuration:**
```bash
# Connect to VPS
ssh root@155.94.144.191

# Navigate to repository 
cd /opt/addypin/addypin-repo

# Pull latest changes
git fetch origin
git reset --hard origin/main

# Update the running application
cp server/db.ts /opt/addypin/app/server/db.ts

# Restart service to apply database fix
systemctl restart addypin

# Verify fix worked
curl https://addypin.com/api/stats
```

## Expected Results

After either method:
- API stats endpoint should return data instead of 500 error
- Service should be running normally
- Database connectivity issue should be resolved

The manual deployment will achieve the same result as the automated GitHub Actions workflow.