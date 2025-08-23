# Manual Production Fix Commands

Since the deployment script has persistent directory conflicts, let's apply the database fix manually:

```bash
# Navigate to repository and pull latest changes
cd /opt/addypin/addypin-repo
git pull origin main

# Copy the fixed database file directly to production
cp server/db.ts /opt/addypin/app/server/db.ts

# Restart service to apply the fix
systemctl restart addypin

# Wait a moment for service to start
sleep 5

# Test the fix
curl https://addypin.com/api/stats

# Check service status
systemctl status addypin
```

This applies the database connectivity fix without the deployment complexity.