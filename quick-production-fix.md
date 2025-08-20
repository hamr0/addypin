# Quick Production Database Fix

## Commands for VPS:

```bash
# Check current production structure
ls -la /opt/addypin/app/

# Check if we can override database configuration via environment
cat /etc/systemd/system/addypin.service

# Update the service to use local PostgreSQL without SSL
sudo systemctl edit addypin

# Add this content:
[Service]
Environment="DATABASE_URL=postgresql://addypin_user:secure_password_123@localhost:5432/addypin?sslmode=disable"

# Reload and restart
systemctl daemon-reload
systemctl restart addypin

# Test the fix
curl https://addypin.com/api/stats
```

This overrides the database connection at the environment level without touching the compiled code.