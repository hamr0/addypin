# Final Deployment Steps

## Issue: VPS has outdated deployment script
The script on VPS doesn't have our latest fixes. Need to update it.

## Commands for VPS:

```bash
# Start the service first
systemctl start addypin

# Update the repository with our latest fixes
cd /opt/addypin/addypin-repo
git pull origin main

# Copy the updated script to the VPS location
cp scripts/deploy-production.sh /opt/addypin/scripts/

# Now run the updated deployment
cd /opt/addypin
./scripts/deploy-production.sh
```

## Alternative Quick Fix:
```bash
# Manual minimal deployment
systemctl start addypin
cd /opt/addypin/addypin-repo
git pull origin main
cp server/db.ts /opt/addypin/app/server/
systemctl restart addypin
curl https://addypin.com/api/stats
```

Either approach will apply the database connectivity fix.