# Quick Production Status Check

## Run these commands to check current status:

```bash
# Check if AddyPin service is running
systemctl status addypin.service

# Check service logs for startup issues
journalctl -u addypin.service --lines=20 --no-pager

# Check if port 3000 is listening
netstat -tlnp | grep :3000

# Test direct connection to app
curl -v http://localhost:3000 || echo "App not responding yet"
```

## Expected behavior:
- Service may take 30-60 seconds to initialize database schema
- First startup creates tables and connects to PostgreSQL
- After initialization, port 3000 should be listening

## If service fails:
Check logs for specific error (database connection, missing dependencies, etc.)

## If service runs but no response:
May need to run database migration to create tables:
```bash
# Switch to repo directory and run migration
cd /opt/addypin/addypin-repo
npm run db:push
```