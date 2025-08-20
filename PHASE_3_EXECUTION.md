# Phase 3: Deployment & Service Creation

## Create systemd service with proper ESM runtime configuration:

```bash
# Create production systemd service
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
ExecStart=/root/.nvm/versions/node/v20.19.4/bin/node --experimental-modules index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Create nginx reverse proxy configuration
sudo tee /etc/nginx/sites-available/addypin > /dev/null << 'EOF'
server {
    listen 80;
    server_name addypin.com www.addypin.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable and start services
sudo ln -s /etc/nginx/sites-available/addypin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl daemon-reload
sudo systemctl enable addypin.service
sudo systemctl start addypin.service
```