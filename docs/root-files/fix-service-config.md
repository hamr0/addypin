# Fix systemd Service Configuration

## Issue: Exit code 203/EXEC indicates wrong executable path or permissions

## Quick Fix Commands:

```bash
# 1. Stop the failing service
sudo systemctl stop addypin.service

# 2. Check actual Node.js path
which node
/root/.nvm/versions/node/v20.19.4/bin/node --version

# 3. Fix the systemd service with correct path and permissions
sudo tee /etc/systemd/system/addypin.service > /dev/null << 'EOF'
[Unit]
Description=AddyPin Location Sharing Service
After=network.target postgresql.service

[Service]
Type=simple
User=appuser
Group=appuser
WorkingDirectory=/opt/addypin/app
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=DATABASE_URL=postgresql://addypin_user:secure_password_123@localhost:5432/addypin
Environment=RESEND_API_KEY=re_d3XFqzL8_CRZ8F8NxQNq8gJ2j7mH4CpLw4uP8
Environment=PATH=/root/.nvm/versions/node/v20.19.4/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=/root/.nvm/versions/node/v20.19.4/bin/node index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 4. Make sure appuser can access Node.js
sudo chmod +x /root/.nvm/versions/node/v20.19.4/bin/node

# 5. Restart the service
sudo systemctl daemon-reload
sudo systemctl start addypin.service
sudo systemctl status addypin.service
```