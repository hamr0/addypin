# Working Deployment - Final Steps

## Actions for YOU on your VPS:

### Update systemd service with all required environment variables:

```bash
cat > /etc/systemd/system/addypin.service << 'EOF'
[Unit]
Description=AddyPin Location Sharing Service
After=network.target

[Service]
Type=simple
User=addypin
WorkingDirectory=/opt/addypin/app
ExecStart=/usr/bin/node index.js
Restart=always
Environment=NODE_ENV=production
Environment=DATABASE_URL=postgresql://addypin_user:secure_password_123@localhost:5432/addypin
Environment=RESEND_API_KEY=re_d3XFqzL8_CRZ8F8NxQNq8gJ2j7mH4CpLw4uP8
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl restart addypin

# Test the service
sleep 5
curl -I https://addypin.com
systemctl status addypin
journalctl -u addypin -n 10
```

This should resolve the Resend initialization error and get AddyPin running at https://addypin.com using the exact working backup files.