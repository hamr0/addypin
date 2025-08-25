# 📊 AddyPin Monitoring Setup Plan

## 🎯 Current Status (August 25, 2025)

### ✅ What's Working
- **Health Endpoint**: `http://localhost:5000/api/health` - Returns detailed system status
- **Database Monitoring**: PostgreSQL health checks operational
- **CI/CD Pipeline**: Bulletproof automated deployment working
- **Monitoring Scripts**: Complete set of monitoring tools ready to deploy

### ❌ What's Missing
- **No active monitoring cron jobs**
- **No email notifications configured**
- **No external monitoring services set up**
- **Alert system logs but doesn't notify**

---

## 📂 Monitoring Infrastructure Locations

### Development Environment (Replit)
```
scripts/
├── health-check.sh           # Comprehensive health monitoring
├── system-monitor.sh         # System resource monitoring
├── auto-recovery.sh          # Automatic failure recovery
├── setup-monitoring.sh       # Complete monitoring installation
└── external-monitor-setup.sh # External services guide
```

### Production Environment (VPS)
```
/opt/addypin/monitoring/      # Monitoring scripts
/var/log/addypin/            # Log files
/etc/systemd/system/         # Systemd services & timers
```

---

## 🔔 Notification Configuration

### Alert Destination
- **Primary Email**: `avoidaccess@msn.com`
- **Log Files**: `/var/log/addypin/monitor.log`
- **Health Endpoint**: `https://addypin.com/api/health`

### Current Health Check Response
```json
{
  "status": "healthy",
  "timestamp": "2025-08-25T09:50:34.213Z",
  "uptime": 1942.298,
  "version": "1.0.0",
  "environment": "development",
  "checks": [
    {"name": "postgresql", "status": "healthy", "responseTime": 618},
    {"name": "memory", "status": "healthy", "responseTime": 97}
  ]
}
```

---

## 🚀 Setup Options (Choose One)

### Option 1: Internal Monitoring (Recommended)
**Time**: 5 minutes | **Cost**: Free | **Reliability**: High

```bash
# On your VPS, run:
sudo ./scripts/setup-monitoring.sh
```

**What this creates:**
- Health checks every 2 minutes via cron
- Auto-recovery on service failures every 5 minutes
- Daily system reports at 6 AM
- Log rotation and cleanup
- Systemd timer integration
- Dashboard at `/opt/addypin/monitoring/dashboard.sh`

**Monitoring Schedule:**
```bash
*/2 * * * * # Health check every 2 minutes
*/5 * * * * # Auto-recovery if health fails
0 6 * * *   # Daily report at 6 AM
0 3 * * 0   # Weekly log cleanup (Sundays 3 AM)
```

### Option 2: External Monitoring (Redundant)
**Time**: 10 minutes | **Cost**: Free tier | **Reliability**: Highest

#### UptimeRobot (Primary - 50 free monitors)
1. Sign up at https://uptimerobot.com
2. Add monitor: `https://addypin.com/api/health`
3. Type: HTTP(s)
4. Interval: 2 minutes
5. Alert: Email to `avoidaccess@msn.com`

#### Better Uptime (Secondary - 10 free monitors)
1. Sign up at https://betteruptime.com
2. Monitor: `https://addypin.com/api/health`
3. Check every: 30 seconds
4. Expected status: 200
5. Notifications: Email, Slack, Discord

#### Pingdom (Backup - 1 free monitor)
1. Sign up at https://www.pingdom.com
2. Add check: `https://addypin.com`
3. Type: HTTP
4. Interval: 1 minute
5. Alert: Email + SMS

### Option 3: Webhook Alerts (Instant)
**Time**: 2 minutes | **Cost**: Free | **Reliability**: Medium

#### Slack Integration
```bash
# Edit scripts/system-monitor.sh
SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"

# Add to send_alert() function:
curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"🚨 AddyPin Alert: $message\"}" \
    $SLACK_WEBHOOK
```

#### Discord Integration
```bash
# Edit scripts/system-monitor.sh
DISCORD_WEBHOOK="https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK"

# Add to send_alert() function:
curl -X POST -H 'Content-type: application/json' \
    --data "{\"content\":\"🚨 **AddyPin Alert** 🚨\n**Message:** $message\n**Time:** $(date)\"}" \
    $DISCORD_WEBHOOK
```

---

## 🔧 What Each Monitor Checks

### Health Check Script (`scripts/health-check.sh`)
- ✅ Service status (systemd/Docker)
- ✅ Database connectivity (PostgreSQL)
- ✅ HTTP endpoints (main site, API)
- ✅ SSL certificate expiration
- ✅ System resources (disk, memory)
- ✅ Recent error logs
- ✅ Response time monitoring

### System Monitor Script (`scripts/system-monitor.sh`)
- ✅ External health check (`https://addypin.com/api/health`)
- ✅ Local health check (`http://localhost:3000/api/health`)
- ✅ Database health status
- ✅ Critical services (Docker, PostgreSQL, Nginx)
- ✅ Resource usage (disk, memory, CPU)
- ✅ Alert sending on failures

### Auto Recovery Script (`scripts/auto-recovery.sh`)
- ✅ Automatic service restart
- ✅ Container recreation if needed
- ✅ Database connection restoration
- ✅ Health verification after recovery
- ✅ Rollback on persistent failures

---

## 📊 Monitoring URLs for External Services

### Primary Monitoring Targets
- **Main Site**: `https://addypin.com`
- **Health API**: `https://addypin.com/api/health`
- **System Status**: `https://addypin.com/api/health/system`
- **Analytics**: `https://addypin.com/api/stats`

### Expected Responses
- **Status Code**: 200 OK
- **Health Response**: `{"status":"healthy"}`
- **Response Time**: < 5 seconds
- **Uptime Target**: 99.9%

---

## 🛠️ Management Commands

### View System Status
```bash
# Quick dashboard
/opt/addypin/monitoring/dashboard.sh

# Manual health check
/opt/addypin/monitoring/system-monitor.sh

# Check monitoring timer
systemctl status addypin-monitor.timer

# View recent logs
tail -f /var/log/addypin/monitor.log
```

### Recovery Commands
```bash
# Manual recovery
/opt/addypin/monitoring/auto-recovery.sh

# Restart monitoring
systemctl restart addypin-monitor.timer

# Test alerts
echo "Test alert" | /opt/addypin/monitoring/system-monitor.sh
```

---

## 📧 Alert Thresholds & Triggers

### Critical Alerts (Immediate Action Required)
- Service down for > 2 minutes
- Database connection failed
- Disk usage > 90%
- Health endpoint not responding
- SSL certificate expires < 7 days

### Warning Alerts (Monitor Closely)
- Memory usage > 90%
- Disk usage > 80%
- Response time > 5 seconds
- SSL certificate expires < 30 days
- High error count in logs (>10/hour)

### Info Alerts (Informational)
- Daily health report
- Weekly resource summary
- Successful auto-recovery
- Performance metrics

---

## 🎯 Quick Setup Commands

### Immediate Internal Monitoring (VPS)
```bash
# 1. Set up complete monitoring system
sudo ./scripts/setup-monitoring.sh

# 2. Verify setup
systemctl status addypin-monitor.timer
/opt/addypin/monitoring/dashboard.sh

# 3. Test alerts
sudo /opt/addypin/monitoring/system-monitor.sh
```

### Immediate External Monitoring (5 minutes)
```bash
# 1. UptimeRobot setup
# - Go to: https://uptimerobot.com/signUp
# - Add monitor: https://addypin.com/api/health
# - Email: avoidaccess@msn.com
# - Interval: 2 minutes

# 2. Test monitoring
curl -I https://addypin.com/api/health
```

### Immediate Webhook Alerts (2 minutes)
```bash
# 1. Get Slack webhook URL from Slack workspace settings
# 2. Edit scripts/system-monitor.sh
# 3. Add webhook URL to send_alert() function
# 4. Test: ./scripts/system-monitor.sh
```

---

## 🔍 Troubleshooting Guide

### If Health Checks Fail
```bash
# 1. Check service status
docker ps | grep addypin
systemctl status postgresql nginx

# 2. Check logs
tail -f /var/log/addypin/monitor.log
docker logs addypin

# 3. Manual recovery
/opt/addypin/monitoring/auto-recovery.sh
```

### If Alerts Not Working
```bash
# 1. Check cron jobs
crontab -l | grep addypin

# 2. Check systemd timer
systemctl list-timers addypin-monitor.timer

# 3. Test alert function
echo "Test" | /opt/addypin/monitoring/send_alert
```

### If External Monitoring Fails
```bash
# 1. Verify endpoints externally
curl -I https://addypin.com/api/health

# 2. Check firewall/networking
netstat -tlnp | grep :3000

# 3. Verify SSL certificate
openssl s_client -connect addypin.com:443 -servername addypin.com
```

---

## ✅ Success Verification Checklist

### Internal Monitoring Setup
- [ ] Cron jobs created and running
- [ ] Systemd timer enabled and active
- [ ] Logs being written to `/var/log/addypin/`
- [ ] Dashboard accessible and showing status
- [ ] Auto-recovery tested and working
- [ ] Alerts being logged (test with service stop)

### External Monitoring Setup
- [ ] UptimeRobot monitor active and checking
- [ ] Email notifications configured
- [ ] Alert test performed (temporary outage)
- [ ] Status page accessible (if using Better Uptime)
- [ ] Multiple monitoring services redundancy

### Webhook Alerts Setup
- [ ] Webhook URL configured in scripts
- [ ] Test alert sent successfully
- [ ] Channel/DM receiving notifications
- [ ] Alert format readable and actionable

---

## 🚨 Emergency Contact Information

### When Monitoring Alerts Trigger
1. **Check dashboard**: `/opt/addypin/monitoring/dashboard.sh`
2. **Review logs**: `tail -f /var/log/addypin/monitor.log`
3. **Attempt auto-recovery**: `/opt/addypin/monitoring/auto-recovery.sh`
4. **Manual intervention**: Contact system administrator
5. **Escalation**: Use external monitoring service incident management

### Key Contacts
- **Primary**: `avoidaccess@msn.com`
- **Logs**: `/var/log/addypin/` directory
- **Status**: `https://addypin.com/api/health`
- **Recovery**: Auto-recovery scripts + manual procedures

---

## 📈 Next Steps After Setup

1. **Monitor for 24 hours** - Verify alerts working correctly
2. **Tune thresholds** - Adjust based on normal operating patterns  
3. **Add more external monitors** - Increase redundancy
4. **Set up status page** - Public status dashboard
5. **Implement trending** - Historical performance metrics
6. **Add business metrics** - Monitor pin creation, usage stats
7. **Performance alerts** - Response time degradation detection

---

**🎯 Recommendation: Start with Option 1 (Internal Monitoring) + UptimeRobot for maximum coverage with minimal setup time.**