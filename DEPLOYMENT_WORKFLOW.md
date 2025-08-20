# AddyPin Deployment Workflow

## Overview
Git-based deployment workflow using GitHub as central repository between Replit development and VPS production environments.

## Workflow Architecture
```
Replit Development → GitHub Repository → VPS Production
     ↓                       ↓                ↓
- Code & test          - Version control   - Live website
- Dev database         - Source of truth   - Production database
- localhost:5000       - Git history       - https://addypin.com
```

## Repository Details
- **GitHub Repository**: https://github.com/amrhas82/addypin
- **Status**: Private repository (code security maintained)
- **Access**: SSH key authentication for VPS deployment

## Deployment Commands

### From Replit (Development to GitHub)
```bash
# Make changes in Replit
git add .
git commit -m "Description of changes"
git push origin main
```

### From VPS (GitHub to Production)
```bash
# SSH to VPS
ssh root@155.94.144.191

# Run deployment script
/opt/addypin/deploy.sh
```

## Deployment Script Actions
1. **Stop service**: `systemctl stop addypin`
2. **Create backup**: Timestamp backup of current deployment
3. **Pull latest code**: Clone/update from GitHub
4. **Build application**: `npm install && npm run build`
5. **Deploy files**: Copy built files to production directory
6. **Set permissions**: Ensure correct ownership
7. **Install dependencies**: Production-only packages
8. **Start service**: `systemctl start addypin`
9. **Verify deployment**: Health check via HTTPS

## Testing Deployment

### Prerequisites Check
- ✅ GitHub repository exists and accessible
- ✅ VPS deployment script at `/opt/addypin/deploy.sh`
- ✅ SSL certificates configured
- ✅ Nginx reverse proxy configured
- ✅ PostgreSQL database ready

### Test Commands
```bash
# Test repository access
curl -I https://github.com/amrhas82/addypin

# Test VPS connectivity  
ssh root@155.94.144.191 "echo 'Connected'"

# Run deployment test
ssh root@155.94.144.191 "/opt/addypin/deploy.sh"

# Verify website
curl -I https://addypin.com
```

## Expected Results
- **Successful build**: React app compiled to `/opt/addypin/app`
- **Service running**: `systemctl status addypin` shows active
- **Website accessible**: https://addypin.com responds with 200 OK
- **Health check**: https://addypin.com/api/health returns JSON status

## Troubleshooting

### Common Issues
- **GitHub access denied**: Check SSH keys or use personal access token
- **Build failures**: Check Node.js version compatibility on VPS
- **Service won't start**: Review logs with `journalctl -u addypin -n 50`
- **Website not loading**: Check nginx configuration and SSL certificates

### Log Locations
- **Application logs**: `journalctl -u addypin -f`
- **Nginx logs**: `/var/log/nginx/error.log`
- **SSL certificates**: `certbot certificates`

## Production Environment
- **Server**: RackNerd VPS (155.94.144.191)
- **Domain**: addypin.com (SSL secured)
- **Database**: PostgreSQL (clean production instance)
- **Service**: systemd service `addypin`
- **Web server**: Nginx reverse proxy
- **Cost**: $2/month (92.75% savings vs cloud hosting)