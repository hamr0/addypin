# Fix Service Configuration

## Problem Identified:
- **Service expects**: `/opt/addypin/app/index.js`
- **Build creates**: `/opt/addypin/app/dist/index.js` 
- **Package.json start script**: `node dist/index.js`

## Solution: Update systemd service to use correct path

Run these commands on VPS:

```bash
# Update the systemd service to use the correct file path
sudo systemctl edit addypin --full

# Replace the ExecStart line with:
ExecStart=/usr/bin/node dist/index.js

# Or alternatively, copy the built file to the expected location:
cd /opt/addypin/app
cp dist/index.js index.js

# Then restart the service
systemctl daemon-reload
systemctl restart addypin
systemctl status addypin
```

This aligns the service configuration with our build output location.