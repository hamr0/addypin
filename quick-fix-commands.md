# Quick Fix Commands for VPS

## Start Service and Complete Deployment

```bash
# Start the service first
systemctl start addypin
systemctl status addypin

# Verify service is running
curl https://addypin.com/

# Now run deployment
./scripts/deploy-production.sh
```

## If Service Won't Start

```bash
# Check what's wrong
journalctl -u addypin -n 20 --no-pager

# Manual start if needed
cd /opt/addypin/app
node index.js
```

The service just needs to be started before running the deployment script.