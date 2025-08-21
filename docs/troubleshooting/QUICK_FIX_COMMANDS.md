# Quick Fix - Service Configuration

## Issue Found
Service is looking for `server.js` but built file is `index.js`

## Fix Commands (Run on VPS)

```bash
# Stop the failing service
systemctl stop addypin

# Check what files were actually deployed
ls -la /opt/addypin/app/

# Update systemd service to use correct file
nano /etc/systemd/system/addypin.service

# Change this line:
# ExecStart=/usr/bin/node server.js
# To:
# ExecStart=/usr/bin/node index.js

# Reload and restart
systemctl daemon-reload
systemctl restart addypin

# Check status
systemctl status addypin

# Test the site
curl -I https://addypin.com
```

## Alternative: Create symlink
```bash
# If you prefer, create a symlink instead
cd /opt/addypin/app
ln -sf index.js server.js
systemctl restart addypin
```