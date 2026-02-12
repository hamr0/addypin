# Quick Deployment Test

## Repository Status
✅ GitHub Repository: https://github.com/hamr0/addypin (accessible)
✅ VPS Deployment Script: `/opt/addypin/deploy.sh` (ready)
✅ SSL Certificates: Let's Encrypt configured with auto-renewal

## Test Command
```bash
# SSH to VPS and run deployment
ssh root@155.94.144.191
/opt/addypin/deploy.sh
```

## Expected Output
```
🚀 Starting AddyPin deployment from GitHub...
Stopping AddyPin service...
Creating backup...
Cloning repository... (or Updating repository...)
Building application...
npm install
npm run build
Deploying files...
Installing production dependencies...
Starting AddyPin service...
Verifying deployment...
✅ AddyPin deployment completed successfully!
🌐 Live at: https://addypin.com
```

## Verification Steps
After deployment, verify:
1. **Website loads**: https://addypin.com
2. **Health check**: https://addypin.com/api/health
3. **Service status**: `systemctl status addypin`

## If Deployment Fails
Common issues and solutions:
- **SSH key needed**: Repository might be private, need SSH authentication
- **Node.js version**: Ensure VPS has compatible Node.js version
- **Build errors**: Check package.json and build dependencies
- **Permissions**: Verify `/opt/addypin` ownership and permissions

Run the deployment test now!