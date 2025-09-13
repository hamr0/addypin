# AddyPin MSMTP Email System - Deployment Guide

## 🎯 Quick Start Deployment

### Step 1: Transfer Scripts to VPS
```bash
# From Replit workspace, transfer all MSMTP scripts
scp ~/workspace/addypin-msmtp-system/* root@155.94.144.191:/tmp/addypin-msmtp/
```

### Step 2: Install MSMTP on VPS
```bash
# SSH into AddyPin VPS
ssh root@155.94.144.191

# Run the installation script
chmod +x /tmp/addypin-msmtp/install-msmtp.sh
/tmp/addypin-msmtp/install-msmtp.sh
```

### Step 3: Deploy Scripts
```bash
# Copy scripts to proper locations
cp /tmp/addypin-msmtp/send-health-alert.sh /opt/addypin/scripts/
cp /tmp/addypin-msmtp/enhanced-health-check-msmtp.sh /opt/addypin/scripts/enhanced-health-check-msmtp.sh
cp /tmp/addypin-msmtp/health-manager.sh /opt/addypin/
chmod +x /opt/addypin/scripts/* /opt/addypin/health-manager.sh
```

### Step 4: Test Email System
```bash
# Test MSMTP email functionality
/opt/addypin/health-manager.sh test-email

# Run enhanced health check with email alerts
/opt/addypin/health-manager.sh enhanced
```

## 📧 Email Setup Requirements

1. **Gmail App Password Required:**
   - Go to: https://myaccount.google.com/apppasswords
   - Enable 2-Factor Authentication
   - Generate 16-character App Password
   - Use in MSMTP configuration

2. **Email Recipient:** avoidaccess@gmail.com

## 🔄 Integration with Existing Systems

### Foundation Backup System
- Replace Resend API calls with MSMTP
- Use backup-foundation-msmtp.sh as template
- Maintain all existing backup functionality

### Health Monitoring
- Integrate with existing enhanced-health-check.sh
- Add email alerting capabilities
- Monitor Docker containers, services, and resources

## 📋 Available Commands

```bash
# Health Manager Commands
/opt/addypin/health-manager.sh test-email    # Test email system
/opt/addypin/health-manager.sh enhanced      # Run health check with alerts
/opt/addypin/health-manager.sh backup-status # Check backup system
/opt/addypin/health-manager.sh alert "msg"   # Send manual alert

# Direct Email Alerts
/opt/addypin/scripts/send-health-alert.sh test "Test message"
/opt/addypin/scripts/send-health-alert.sh critical "Critical issue"
/opt/addypin/scripts/send-health-alert.sh warning "Warning message"
/opt/addypin/scripts/send-health-alert.sh backup "Backup notification"
```

## 🎯 Benefits vs Resend API

✅ **Reliability:** Direct SMTP connection, no API rate limits  
✅ **Cost:** Free Gmail SMTP, no API costs  
✅ **Simplicity:** Standard mail command, no curl/API complexity  
✅ **Integration:** Native Linux mail system  
✅ **Proven:** Based on working Terribic system