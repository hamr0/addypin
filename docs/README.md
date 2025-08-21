# AddyPin Documentation

## Quick Links
- **Live Website**: [https://addypin.com](https://addypin.com)
- **Status**: Production deployment successful (August 20, 2025)
- **Architecture**: See [../ARCHITECTURE.md](../ARCHITECTURE.md) for technical overview

## Documentation Structure

### 📁 deployment/
Production deployment guides and VPS setup:
- **PRODUCTION_BACKUP_GUIDE.md** - Simple backup/restore procedures
- **GITHUB_DEPLOYMENT_GUIDE.md** - GitHub-to-VPS deployment workflow
- **DEPLOYMENT_SUCCESS.md** - Record of successful deployment
- **VPS_DEPLOYMENT_COMMANDS.md** - Server setup commands

### 📁 troubleshooting/
Problem resolution and maintenance:
- **DEBUG_502_COMMANDS.md** - Fix 502 Bad Gateway errors
- **QUICK_FIX_COMMANDS.md** - Emergency recovery procedures
- **SERVICE_RESTART_COMMANDS.md** - Service management
- **MANUAL_DEPLOYMENT.md** - Alternative deployment methods

### 📁 scripts/
Automation and utility scripts:
- **create-production-backup.sh** - Backup script for VPS
- **deploy-to-vps.sh** - Deployment automation
- **clean-deployment-script.sh** - Clean deployment process

### 📁 Original Documentation
Complete project history and setup guides:
- **API_DOCUMENTATION.md** - REST API reference
- **ANALYTICS_SUMMARY.md** - Analytics system overview
- **DOMAIN_SETUP.md** - Custom domain configuration
- **EMAIL_SYSTEM_MONITORING.md** - Email service setup
- **GITHUB_CONNECTION.md** - Version control setup
- **PERFORMANCE_OPTIMIZATION.md** - Speed improvements
- **SECURITY_FIX_COMPLETE.md** - Security enhancements
- **TESTING.md** - QA procedures and test cases

## Production Status

**Current Deployment** (as of August 20, 2025):
- ✅ **Service**: Active and running on VPS
- ✅ **Website**: https://addypin.com responding (HTTP 200)
- ✅ **SSL**: Let's Encrypt certificates active
- ✅ **Database**: PostgreSQL operational
- ✅ **Email**: Resend API configured
- ✅ **Cost**: $2/month VPS (92.75% savings achieved)

## Key Features Deployed

1. **Location Sharing**: Interactive map with draggable pins
2. **Dual Format Links**: `ABC123.addypin.com` and `ABC123@addypin.com`
3. **13+ Map Apps**: Universal compatibility across mapping services
4. **OTP Authentication**: Email verification for pin editing
5. **Analytics Dashboard**: Privacy-focused usage tracking
6. **Auto-Expiry**: 72-hour cleanup for temporary pins

## Development Workflow

**Current Setup**:
- **Development**: Replit environment with development database
- **Version Control**: Private GitHub repository
- **Production**: VPS deployment with separate database
- **Backup System**: Automated with timestamped backups

## Emergency Contacts

For production issues:
1. **Service Restart**: `systemctl restart addypin`
2. **Check Logs**: `journalctl -u addypin -n 20`
3. **Backup Restore**: See [deployment/PRODUCTION_BACKUP_GUIDE.md](deployment/PRODUCTION_BACKUP_GUIDE.md)
4. **DNS Issues**: Check nginx status and SSL certificates

## Next Steps

- ✅ Production deployment complete
- ✅ Backup system implemented
- ⏳ GitHub Actions for automated deployment
- ⏳ Monitoring and alerting setup
- ⏳ CDN integration for global performance