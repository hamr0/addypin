# Deployment Test Instructions

## Prerequisites Check
- ✅ GitHub repository exists: https://github.com/amrhas82/addypin
- ✅ VPS deployment script created: `/opt/addypin/deploy.sh`
- ✅ VPS has SSL certificates and nginx configured

## Test Procedure

### Step 1: Push Code to GitHub (Replit Shell)
```bash
cd /home/runner/workspace
git init
git add .
git commit -m "Initial deployment test"
git branch -M main
git remote add origin https://github.com/amrhas82/addypin.git
git push -u origin main
```

### Step 2: Run Deployment Script (VPS Terminal)
```bash
ssh root@155.94.144.191
/opt/addypin/deploy.sh
```

### Step 3: Verify Deployment
```bash
# Check if service is running
systemctl status addypin

# Test the website
curl -I https://addypin.com

# Check application logs
journalctl -u addypin -f
```

## Expected Output

### Successful Deployment Should Show:
```
🚀 Starting AddyPin deployment from GitHub...
Cloning repository...
Building application...
npm install
npm run build
Deploying files...
✅ Deployment complete!
```

### Website Should Be Accessible:
- https://addypin.com - Main site
- https://addypin.com/api/health - Health check
- All SSL certificates working

## Troubleshooting

### If Deployment Fails:
1. Check GitHub repository is public and accessible
2. Verify VPS has internet connectivity
3. Check Node.js and npm versions on VPS
4. Review systemctl logs: `journalctl -u addypin`

### If Website Doesn't Load:
1. Check nginx status: `systemctl status nginx`
2. Verify SSL certificates: `certbot certificates`
3. Check application logs: `journalctl -u addypin -n 50`