# Debug 502 Bad Gateway

## Issue Analysis
Service shows active but nginx can't connect to the Node.js application.

## Debug Commands

```bash
# Check what's actually running on port 3000
netstat -tlnp | grep 3000

# Check application logs
journalctl -u addypin -f

# Test direct connection to Node.js (bypass nginx)
curl http://localhost:3000
curl http://localhost:3000/api/health

# Check if the built file structure is correct
ls -la /opt/addypin/app/
file /opt/addypin/app/index.js

# Try running the app manually to see errors
cd /opt/addypin/app
node index.js

# Check nginx configuration
cat /etc/nginx/nginx.conf | grep -A 10 -B 5 addypin
```

## Most Likely Issues
1. Node.js app not binding to correct port/interface
2. Missing static files (public directory)
3. Database connection failing
4. Environment variables missing