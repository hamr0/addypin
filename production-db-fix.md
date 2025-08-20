# Production Database Fix Commands

The database SSL verification error shows the fix wasn't applied properly. Run these commands on VPS:

```bash
# Check if the fixed file was copied correctly
cat /opt/addypin/app/server/db.ts

# It should show "ssl: false" - if not, copy again
cp /opt/addypin/addypin-repo/server/db.ts /opt/addypin/app/server/db.ts

# Check the file permissions
ls -la /opt/addypin/app/server/db.ts

# Restart service
systemctl restart addypin

# Check service logs for any startup errors
journalctl -u addypin -n 10 --no-pager

# Test API
curl https://addypin.com/api/stats
```

Expected: The API should return actual stats data instead of "Failed to fetch stats"