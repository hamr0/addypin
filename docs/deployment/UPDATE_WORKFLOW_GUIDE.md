# Update Workflow Guide - Pushing Changes to Production

## Daily Development Workflow

### 1. Development in Replit
```bash
# Your normal development process
# - Make changes to code
# - Test locally at localhost:5000
# - Use Replit's development database
# - Test all features thoroughly
```

### 2. Push Changes to GitHub
```bash
# When ready to deploy changes to production
git add .
git commit -m "Descriptive commit message about your changes"
git push origin main
```

### 3. Deploy to Production
```bash
# SSH to your VPS
ssh root@155.94.144.191

# Set your GitHub token (replace with actual token)
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_your_actual_token_here"

# Run deployment (pulls from GitHub and builds)
/opt/addypin/deploy.sh

# Expected output:
# 🚀 Starting AddyPin deployment from GitHub...
# Stopping AddyPin service...
# Creating backup...
# Updating repository...
# Building application...
# Building React client...
# Building Node.js server...
# Deploying files...
# Installing production dependencies...
# Starting AddyPin service...
# ✅ Deployment complete!
```

### 4. Verify Deployment
```bash
# Check website is live
curl -I https://addypin.com
# Should return: HTTP/1.1 200 OK

# Test API endpoints
curl https://addypin.com/api/health
curl https://addypin.com/api/stats

# Check service status
systemctl status addypin
```

## Types of Updates

### Code Changes
- **Frontend changes**: React components, styling, UI improvements
- **Backend changes**: API endpoints, database operations, business logic
- **Configuration**: Environment variables, build settings
- **Dependencies**: New npm packages, version updates

### Database Schema Changes
```bash
# If you modify database schema in shared/schema.ts
# Run on your VPS after deployment:
cd /opt/addypin/addypin-repo
npm run db:push
```

### Environment Configuration
```bash
# Update production environment variables on VPS
nano /etc/systemd/system/addypin.service

# Add new environment variables:
Environment=NEW_VAR=value

# Reload and restart
systemctl daemon-reload
systemctl restart addypin
```

## Emergency Procedures

### Rollback to Previous Version
```bash
# List available backups
ls -la /opt/addypin/app-backup-*

# Stop current service
systemctl stop addypin

# Restore from backup (replace with actual backup name)
cd /opt/addypin
rm -rf app
mv app-backup-20250820-143000 app

# Restart service
systemctl start addypin

# Verify rollback
curl -I https://addypin.com
```

### Quick Hotfix
```bash
# For urgent fixes, you can edit files directly on VPS
cd /opt/addypin/app
nano index.js  # Edit the built file directly

# Restart service
systemctl restart addypin

# Remember to also fix in your Replit code and push to GitHub
```

## Best Practices

### Before Deploying
- Test all changes thoroughly in Replit
- Verify database operations work correctly
- Check for any console errors or warnings
- Ensure all new environment variables are documented

### During Deployment
- Monitor the deployment output for errors
- Wait for the complete success message
- Don't interrupt the deployment process

### After Deployment
- Test critical user journeys (pin creation, map viewing)
- Check analytics and stats endpoints
- Monitor logs for any errors: `journalctl -u addypin -f`
- Verify SSL certificates are working

### Commit Message Guidelines
```bash
# Good commit messages:
git commit -m "Add country detection for global coverage"
git commit -m "Fix rate limiting - reduce API calls by 97%"
git commit -m "Update analytics dashboard with daily user tracking"
git commit -m "Security fix: resolve GitHub token exposure"

# Avoid generic messages:
git commit -m "updates"
git commit -m "fix stuff"
git commit -m "changes"
```

## Monitoring Production

### Regular Health Checks
```bash
# Weekly checks recommended
curl https://addypin.com/api/health
systemctl status addypin
certbot certificates  # Check SSL expiry
df -h  # Check disk space
```

### Log Monitoring
```bash
# Monitor real-time logs
journalctl -u addypin -f

# Check for errors in recent logs
journalctl -u addypin -n 100 | grep -i error

# Check nginx errors
tail -f /var/log/nginx/error.log
```

## Automation Options

### Simple Automation Script
```bash
# Create on your local machine: auto-deploy.sh
#!/bin/bash
echo "Deploying AddyPin to production..."
git push origin main
ssh root@155.94.144.191 "export GITHUB_PERSONAL_ACCESS_TOKEN='$GITHUB_TOKEN' && /opt/addypin/deploy.sh"
echo "Deployment complete - check https://addypin.com"
```

### GitHub Actions (Future Enhancement)
Consider setting up GitHub Actions for:
- Automatic deployment on push to main
- Running tests before deployment  
- Slack/Discord notifications
- Automated backups before deployment

## Cost Monitoring

### Current Infrastructure
- VPS: $2/month
- Domain: ~$10/year  
- Bandwidth: Included in VPS
- **Total**: ~$34/year

### Scaling Considerations
If traffic grows significantly:
- Consider CDN for static assets
- Database optimization and indexing
- Load balancer for multiple instances
- Monitoring and alerting tools