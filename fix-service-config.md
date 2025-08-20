# Service Configuration Fix

## Issue Identified
- Service trying to run from `/opt/addypin/` 
- But application files are in `/opt/addypin/app/`
- Need to update systemd service WorkingDirectory

## Fix Required

Update the systemd service file to use correct working directory:

```bash
# Check current service configuration
cat /etc/systemd/system/addypin.service

# Should show WorkingDirectory=/opt/addypin/app
# If it shows /opt/addypin, that's the problem
```

## Service Configuration Should Be:
```ini
[Unit]
Description=AddyPin Location Sharing Service
After=network.target

[Service]
Type=simple
User=addypin
WorkingDirectory=/opt/addypin/app
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=DATABASE_URL=postgresql://addypin_user:secure_password@localhost:5432/addypin
Environment=RESEND_API_KEY=your_key_here

[Install]
WantedBy=multi-user.target
```