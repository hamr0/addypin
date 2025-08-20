# Quick Fix Commands

## Run these on VPS to diagnose service failure:

```bash
# Check service logs for specific errors
journalctl -u addypin -n 20 --no-pager

# Check service status
systemctl status addypin --no-pager

# Check if port 3000 is in use
netstat -tlnp | grep :3000

# Check production app structure
ls -la /opt/addypin/app/

# Try starting manually to see errors
cd /opt/addypin/app
node index.js
```

The deployment completed but service startup failed. These commands will show us the specific error preventing the application from starting.