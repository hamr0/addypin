# Phase 2 Fixes & Phase 3 Preparation

## Fix remaining Phase 2 issues:

```bash
# Fix 1: Create system user (CentOS compatible)
sudo useradd --system --no-create-home appuser
sudo groupadd appuser 2>/dev/null || true  # Group might exist
sudo chown appuser:appuser /opt/addypin/app

# Fix 2: Create database user and setup
sudo -u postgres psql -d addypin << 'EOF'
CREATE USER addypin_user WITH ENCRYPTED PASSWORD 'secure_password_123';
GRANT ALL PRIVILEGES ON DATABASE addypin TO addypin_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO addypin_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO addypin_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO addypin_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO addypin_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO addypin_user;
EOF

# Fix 3: Deploy build artifacts to clean app directory
cd /opt/addypin/addypin-repo
cp dist/index.js /opt/addypin/app/
cp -r dist/public /opt/addypin/app/
chown -R appuser:appuser /opt/addypin/app/
```

After fixes, proceed to Phase 3: systemd service creation.