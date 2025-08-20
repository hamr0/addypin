# Deploy Database Fix - Option 1 (VPS Pull)

## Status: Ready to Deploy ✅

The database fix has been committed to GitHub. Run this on your VPS:

```bash
# Navigate to deployment directory
cd /opt/addypin

# Run the tested deployment script
./deploy.sh

# Or manual steps if script not available:
cd addypin-repo
git pull origin main
npm ci --omit=dev
systemctl restart addypin
sleep 5
curl https://addypin.com/api/stats
```

## Expected Result:
API should return actual stats like:
```json
{"pinsCreated":20,"pinnedCount":9,"linksClicked":4...}
```

Instead of:
```json
{"message":"Failed to fetch stats"}
```

## What This Fix Does:
- Disables SSL for local PostgreSQL connection in production
- Resolves database connectivity issues causing API failures
- Uses proven VPS → GitHub pull method (working connection)