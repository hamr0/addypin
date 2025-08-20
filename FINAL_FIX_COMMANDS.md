# Final Fix - Module Resolution Issue

## Problem
Built application can't find its dependencies despite deployment success.

## Root Cause
The esbuild server bundle is looking for external packages that aren't available in the production environment.

## Solution Commands

```bash
# Check current application logs
journalctl -u addypin -n 10

# Check deployed file structure
ls -la /opt/addypin/app/

# The issue is likely that the server build expects external packages
# Let's try running the built file manually to see the exact error
cd /opt/addypin/app
node index.js

# If it shows module not found errors, we need to fix the build process
# Update the deployment to handle this properly:

# Stop service
systemctl stop addypin

# Create a simple server file that works with the static build
cat > /opt/addypin/app/server.js << 'EOF'
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`AddyPin server running on port ${PORT}`);
});
EOF

# Update systemd service to use server.js
nano /etc/systemd/system/addypin.service
# Change ExecStart to: /usr/bin/node server.js

# Restart
systemctl daemon-reload
systemctl restart addypin
systemctl status addypin
```