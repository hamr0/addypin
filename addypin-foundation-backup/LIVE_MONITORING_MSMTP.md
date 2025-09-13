# AddyPin Live Monitoring System with MSMTP Email Integration

## 🎯 Overview

The AddyPin live monitoring system provides 24/7 infrastructure health monitoring with automated email alerts via MSMTP Gmail SMTP. This system has replaced the previous Resend API implementation with a more reliable email notification system.

## 📧 Email System Configuration

### MSMTP Setup
- **SMTP Provider**: Gmail SMTP (smtp.gmail.com:587) with TLS encryption
- **Authentication**: Gmail App Password (16-character) with 2FA requirement
- **Configuration File**: `/root/.msmtprc` (600 permissions)
- **Email Recipient**: `avoidaccess@gmail.com`
- **Email Format**: Professional HTML-formatted alerts with AddyPin branding

### Gmail App Password Setup
1. Go to: https://myaccount.google.com/apppasswords
2. Enable 2-Factor Authentication if not already enabled
3. Generate a new App Password (16 characters)
4. Configure in `/root/.msmtprc`

## 🔧 Script Locations

### Primary Scripts
- **Health Manager**: `/opt/addypin/health-manager.sh` - Main command interface
- **Enhanced Health Check**: `/opt/addypin/scripts/enhanced-health-check.sh` - Automated monitoring
- **Email Alert System**: `/opt/addypin/scripts/send-health-alert.sh` - MSMTP email sender

### Configuration Files
- **MSMTP Config**: `/root/.msmtprc` - Gmail SMTP configuration (600 permissions)
- **Log File**: `/var/log/addypin-health.log` - Health check logs

## ⏰ Automated Monitoring Schedule

### Cron Configuration
```bash
# Live health monitoring (every 10 minutes)
*/10 * * * * /opt/addypin/scripts/enhanced-health-check.sh >/dev/null 2>&1
```

### Monitoring Frequency
- **Health Checks**: Every 10 minutes
- **Email Alerts**: Immediate on critical issues or warnings
- **Log Rotation**: Automatic with system logrotate

## 🚨 Alert Types and Triggers

### Critical Alerts (🔴)
- **Service Failures**: nginx, docker, postgresql not running
- **Container Crashes**: Production or staging containers down
- **Database Connection**: PostgreSQL connection failures
- **API Endpoints**: Health endpoints returning errors

### Warning Alerts (🟡)
- **Resource Usage**: Disk >80%, Memory >85%, Load >4.0
- **SSL Certificates**: Expiring within threshold
- **Missing Components**: Backup system not configured
- **MSMTP Issues**: Email system not configured

### Success Status (✅)
- **All Systems Healthy**: No issues detected
- **Normal Resource Usage**: All metrics within acceptable ranges
- **Services Running**: All critical services operational

## 🔧 Manual Commands

### Health Management Commands
```bash
# Test email notification system
/opt/addypin/health-manager.sh test-email

# Run enhanced health check with email alerts
/opt/addypin/health-manager.sh enhanced

# Send manual alert
/opt/addypin/health-manager.sh alert "Your custom message"

# Check overall system status
/opt/addypin/health-manager.sh status

# View recent health logs
/opt/addypin/health-manager.sh logs

# Set up automated monitoring cron job
/opt/addypin/health-manager.sh setup-cron
```

### Direct Email Alert Commands
```bash
# Send test email
/opt/addypin/scripts/send-health-alert.sh test "Test message"

# Send critical alert
/opt/addypin/scripts/send-health-alert.sh critical "Critical infrastructure issue"

# Send warning alert
/opt/addypin/scripts/send-health-alert.sh warning "Warning message"

# Send manual notification
/opt/addypin/scripts/send-health-alert.sh manual "General notification"
```

### Health Check Commands
```bash
# Run health check directly
/opt/addypin/scripts/enhanced-health-check.sh

# View health check logs
tail -f /var/log/addypin-health.log

# Check cron status
crontab -l | grep health
```

## 📊 Monitoring Coverage

### System Services
- ✅ **Nginx**: Web server and reverse proxy status
- ✅ **Docker**: Container runtime platform status
- ✅ **PostgreSQL**: Database service status

### Docker Containers
- ✅ **Production Container**: addypin-app-1 status
- ✅ **Staging Container**: addypin-staging-app-1 status

### Resource Monitoring
- ✅ **Disk Usage**: Root filesystem usage percentage
- ✅ **Memory Usage**: System memory utilization
- ✅ **Load Average**: System load monitoring

### AddyPin Infrastructure
- ✅ **Backup System**: Automated backup scheduling status
- ✅ **Email System**: MSMTP configuration verification
- ✅ **SSL Certificates**: Certificate expiration monitoring

## 🔍 Troubleshooting

### Common Issues

#### Email Not Sending
```bash
# Check MSMTP configuration
cat ~/.msmtp.log

# Test basic MSMTP
echo "Test email" | msmtp avoidaccess@gmail.com

# Verify Gmail App Password
cat /root/.msmtprc
```

#### Health Check Not Running
```bash
# Check cron status
systemctl status crond
crontab -l

# Check script permissions
ls -la /opt/addypin/scripts/enhanced-health-check.sh

# Run health check manually
/opt/addypin/health-manager.sh enhanced
```

#### Log File Issues
```bash
# Check log file permissions
ls -la /var/log/addypin-health.log

# Create log file if missing
touch /var/log/addypin-health.log
chmod 644 /var/log/addypin-health.log
```

### Error Resolution
1. **MSMTP Errors**: Check `/root/.msmtprc` permissions (must be 600)
2. **Permission Errors**: Ensure scripts are executable (`chmod +x`)
3. **Cron Issues**: Verify cron service is running (`systemctl status crond`)
4. **Email Delivery**: Check Gmail App Password and 2FA settings

## 📈 System Status Verification

### Quick Health Check
```bash
# Complete system overview
/opt/addypin/health-manager.sh status

# Test all email functions
/opt/addypin/health-manager.sh test-email

# Verify automation
crontab -l | grep -E "(health|backup)"
```

### Expected Output (Healthy System)
```
✅ MSMTP: Installed
✅ Email Alerts: Ready  
✅ Backup System: Available
✅ Docker: Running
✅ Nginx: Running
```

## 🔧 Maintenance Tasks

### Regular Maintenance
- **Weekly**: Review health logs for patterns
- **Monthly**: Test email alert system manually
- **Quarterly**: Verify Gmail App Password validity
- **As Needed**: Update MSMTP configuration

### Log Management
- Health logs automatically rotate with system logrotate
- Manual log review: `tail -100 /var/log/addypin-health.log`
- Log location: `/var/log/addypin-health.log`

## 📞 Emergency Procedures

### Critical System Failure
1. **SSH Access**: `ssh root@155.94.144.191`
2. **Manual Health Check**: `/opt/addypin/health-manager.sh enhanced`
3. **Send Alert**: `/opt/addypin/health-manager.sh alert "Emergency: Manual intervention required"`
4. **Check Services**: `systemctl status nginx docker postgresql`

### Email System Failure
1. **Check MSMTP**: `msmtp --version`
2. **Test Direct**: `echo "Test" | msmtp avoidaccess@gmail.com`
3. **Verify Config**: `ls -la /root/.msmtprc`
4. **Reinstall if needed**: `dnf install -y msmtp mailx`

---

**📧 All monitoring alerts sent to: avoidaccess@gmail.com**  
**⏰ Automated monitoring: Every 10 minutes**  
**🔧 Manual commands available via health-manager.sh**