# Debug Production Structure

## Commands to run on VPS:

```bash
# Check service logs for specific errors
journalctl -u addypin -n 20 --no-pager

# Check actual production app structure
ls -la /opt/addypin/app/
find /opt/addypin/app/ -name "*.js" -o -name "*.ts" | head -10

# Check if the copied file exists
ls -la /opt/addypin/app/server/db.ts

# Check the main production file structure
head -20 /opt/addypin/app/index.js | grep -A 3 -B 3 DATABASE

# Test database connection directly
psql -U addypin_user -h localhost -d addypin -c "SELECT COUNT(*) FROM pins;"
```

This will show us:
1. What errors the application is producing
2. The actual production file structure  
3. If our database file was placed correctly
4. If the database connection itself works