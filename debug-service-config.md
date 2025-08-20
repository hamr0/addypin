# Debug Service Configuration - 502 Bad Gateway

## Current Status:
- ✅ Service is running (systemctl shows active)
- ❌ nginx returns 502 Bad Gateway
- 🔍 Application likely not listening on correct port

## Debug Commands for VPS:

```bash
# Check actual application logs
journalctl -u addypin -f --no-pager

# Check what ports are actually listening
netstat -tlnp | grep node

# Check nginx configuration
cat /etc/nginx/sites-available/addypin

# Test direct connection to app
curl http://localhost:3000/api/stats

# Check if app is actually starting properly
ps aux | grep node
```

## Likely Issues:
1. App not binding to port 3000
2. App crashing after startup
3. nginx pointing to wrong port
4. Environment variables not loaded properly