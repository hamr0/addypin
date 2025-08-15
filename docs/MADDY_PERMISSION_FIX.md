# Fix Maddy Permission Issue

## The Problem
Maddy compiled successfully but can't create `/run/maddy` directory due to permissions.

## Quick Fix Commands
```bash
# Create the runtime directory and set ownership
sudo mkdir -p /run/maddy
sudo chown maddy:maddy /run/maddy

# Also ensure state directory permissions are correct
sudo chown maddy:maddy /var/lib/maddy

# Test maddy binary (use correct syntax)
/usr/local/bin/maddy version

# Restart service
sudo systemctl restart maddy
sudo systemctl status maddy

# Check logs
sudo journalctl -u maddy -f
```

## Expected Success Output
After fixing permissions:
- `maddy version` shows version info
- `systemctl status maddy` shows "Active: active (running)"  
- `journalctl -u maddy -f` shows "smtp: listening on 0.0.0.0:25"