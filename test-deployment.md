# Deployment Troubleshooting Guide

## Current Situation
- Manual deployment script executed successfully
- Service failed to start with new code
- Automatic rollback maintained service availability
- Need to fix startup issue before next deployment

## Diagnostic Commands for VPS

Run these on your VPS to identify the startup issue:

```bash
# Check service logs for error details
journalctl -u addypin -n 50 --no-pager

# Check if the main index.js file exists
ls -la /opt/addypin/app-backup-*/

# Test the new deployment manually
cd /opt/addypin/app-backup-20250820_150902
ls -la
node index.js

# Check current working directory structure
cd /opt/addypin/app
ls -la
```

## Expected Issues
1. Missing main entry file (index.js vs server/index.js)
2. Environment variables not loaded properly
3. Database connection string format issue
4. Node.js module resolution problems

## Next Steps
1. Identify the exact startup error
2. Fix the configuration issue
3. Test deployment again