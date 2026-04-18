# MSMTP Email Alert System

## Overview

MSMTP provides email notifications for health monitoring and backup alerts, replacing the previous Resend API approach. Uses Gmail SMTP for reliable, free email delivery.

## Configuration

- **SMTP**: Gmail (`smtp.gmail.com:587`) with TLS
- **Auth**: Gmail App Password (16-character) with 2FA
- **Config file**: `/root/.msmtprc` (600 permissions)
- **Recipient**: `avoidaccess@gmail.com`

### Gmail App Password Setup
1. Go to https://myaccount.google.com/apppasswords
2. Enable 2-Factor Authentication if not already enabled
3. Generate new App Password (16 characters)
4. Add to `/root/.msmtprc`

## Monitoring Integration

### Health Checks (every 10 minutes)
```bash
# Cron entry
*/10 * * * * /opt/addypin/scripts/enhanced-health-check.sh >/dev/null 2>&1
```

### Alert Types

| Level | Trigger | Examples |
|-------|---------|---------|
| Critical | Service failure | Nginx, Docker, PostgreSQL down; container crashes; API errors |
| Warning | Resource threshold | Disk >80%, Memory >85%, Load >4.0, SSL expiring |
| Success | All checks pass | Normal operation |

## Scripts

| Script | Location | Purpose |
|--------|----------|---------|
| `health-manager.sh` | `/opt/addypin/` | Main command interface |
| `enhanced-health-check.sh` | `/opt/addypin/scripts/` | Automated monitoring |
| `send-health-alert.sh` | `/opt/addypin/scripts/` | MSMTP email sender |

## Commands

```bash
# Health manager
/opt/addypin/health-manager.sh test-email      # Test email system
/opt/addypin/health-manager.sh enhanced         # Run health check with alerts
/opt/addypin/health-manager.sh backup-status    # Check backup system
/opt/addypin/health-manager.sh alert "message"  # Send manual alert

# Direct email alerts
/opt/addypin/scripts/send-health-alert.sh test "Test message"
/opt/addypin/scripts/send-health-alert.sh critical "Critical issue"
/opt/addypin/scripts/send-health-alert.sh warning "Warning message"
/opt/addypin/scripts/send-health-alert.sh backup "Backup notification"
```

## Deployment

```bash
# Install MSMTP on VPS
chmod +x /tmp/addypin-msmtp/install-msmtp.sh
/tmp/addypin-msmtp/install-msmtp.sh

# Deploy scripts
cp send-health-alert.sh /opt/addypin/scripts/
cp enhanced-health-check-msmtp.sh /opt/addypin/scripts/
cp health-manager.sh /opt/addypin/
chmod +x /opt/addypin/scripts/* /opt/addypin/health-manager.sh

# Test
/opt/addypin/health-manager.sh test-email
```

## Benefits vs Resend API

- **Reliability**: Direct SMTP, no API rate limits
- **Cost**: Free Gmail SMTP
- **Simplicity**: Standard mail command, no curl/API calls
- **Integration**: Native Linux mail system
