# Complete Phase 3: Replit Environment Replication

## Execute on VPS:

```bash
# 1. Stop current failing service
sudo systemctl stop addypin.service

# 2. Clean deployment directory
sudo rm -rf /opt/addypin/app/*

# 3. Deploy complete application structure (not just built files)
cd /opt/addypin/addypin-repo
cp -r server/ /opt/addypin/app/
cp -r shared/ /opt/addypin/app/
cp package.json /opt/addypin/app/
cp drizzle.config.ts /opt/addypin/app/
cp tsconfig.json /opt/addypin/app/
cp tsconfig.server.json /opt/addypin/app/

# 4. Install dependencies in production
cd /opt/addypin/app
npm install --production

# 5. Install tsx globally for TypeScript execution
npm install -g tsx

# 6. Update systemd service to use tsx (like Replit)
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
ExecStart=/usr/local/bin/tsx server/index.ts
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 7. Set ownership
chown -R appuser:appuser /opt/addypin/app/

# 8. Create database schema
npm run db:push

# 9. Start service
sudo systemctl daemon-reload
sudo systemctl start addypin.service
sudo systemctl status addypin.service
```

This mirrors Replit exactly: tsx runtime + full source + node_modules.