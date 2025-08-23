# Fix Current Issues - Systematic Approach

## Issue Analysis:
1. **`drizzle-kit: command not found`** - Missing dev dependency in production
2. **`203/EXEC` on tsx** - Same path access issue as before

## Root Cause: 
- `--production` flag excludes dev dependencies like `drizzle-kit`
- `tsx` installed globally but `appuser` can't access it

## Solution: Install ALL dependencies + fix tsx path

```bash
# Fix 1: Install ALL dependencies (not just production)
cd /opt/addypin/app
npm install  # Remove --production flag

# Fix 2: Check where tsx was installed and fix path
which tsx
ls -la /usr/local/bin/tsx

# Fix 3: Make tsx accessible to appuser OR install in project
# Option A: Fix global tsx permissions
sudo chmod +x /usr/local/bin/tsx
sudo ln -sf $(which tsx) /usr/local/bin/tsx

# Option B: Install tsx locally in project
npm install tsx

# Fix 4: Update service to use local tsx if needed
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
ExecStart=./node_modules/.bin/tsx server/index.ts
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Fix 5: Test tsx access
sudo -u appuser which tsx
sudo -u appuser ./node_modules/.bin/tsx --version

# Fix 6: Create database schema
npm run db:push

# Fix 7: Restart service
sudo systemctl daemon-reload
sudo systemctl start addypin.service
sudo systemctl status addypin.service
```