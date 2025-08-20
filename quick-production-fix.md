# VPS Environment Fix Commands

Run these commands on your VPS to complete the environment configuration:

```bash
# 1. Create proper .env file in production app directory
cd /opt/addypin/app
cat > .env << 'EOF'
DATABASE_URL=postgresql://addypin_user:secure_password_123@localhost:5432/addypin
NODE_ENV=production
PORT=3000
RESEND_API_KEY=re_d3XFqzL8_CRZ8F8NxQNq8gJ2j7mH4CpLw4uP8
EOF

# 2. Update systemd service to load .env file
sudo systemctl edit addypin --full

# 3. In the nano editor, modify the [Service] section to include:
# EnvironmentFile=/opt/addypin/app/.env
# (Keep all existing Environment= lines as fallbacks)

# 4. After saving, reload and restart
systemctl daemon-reload
systemctl restart addypin
systemctl status addypin

# 5. Test the API
curl https://addypin.com/api/stats
```

This creates the missing environment bridge between Replit and VPS architectures.