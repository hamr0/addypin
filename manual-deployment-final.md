# Final Deployment Fix

## Execute these commands to complete deployment:

```bash
# Copy Node.js to accessible location
sudo cp -r /root/.nvm/versions/node/v20.19.4/bin/* /usr/local/bin/
sudo chmod +x /usr/local/bin/node

# Verify Node.js is accessible to appuser
sudo -u appuser /usr/local/bin/node --version

# Update service to use system Node.js path
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
ExecStart=/usr/local/bin/node index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Restart service
sudo systemctl daemon-reload
sudo systemctl start addypin.service

# Wait 10 seconds then check status
sleep 10
sudo systemctl status addypin.service

# If successful, test the application
curl -I http://localhost:3000
```

This should resolve the 203/EXEC error completely.