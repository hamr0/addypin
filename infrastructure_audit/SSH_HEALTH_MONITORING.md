# 🔐 SSH Health Monitoring Documentation

## Overview
The SSH Health Check script provides comprehensive monitoring of SSH service health from the VPS perspective. This complements the existing health monitoring by focusing specifically on SSH daemon status, configuration, security, and activity.

## Script Location
- **File**: `/opt/addypin/ssh-health.sh`
- **Purpose**: Monitor SSH service health on VPS
- **Type**: Standalone health check script

## What It Monitors

### 1. SSH Daemon Status ✅
- Checks if SSH daemon (sshd) is running
- Reports process ID and uptime
- Validates service is active via systemctl

### 2. SSH Port Accessibility 🌐
- Verifies SSH port 22 is listening
- Counts active SSH listeners
- Ensures network accessibility

### 3. SSH Configuration Validation ⚙️
- Tests SSH configuration syntax
- Reports authentication settings:
  - Password Authentication
  - Public Key Authentication  
  - Root Login permissions

### 4. Recent SSH Activity 📈
- Tracks successful login attempts (last hour)
- Monitors failed password attempts
- Shows last successful connection timestamp
- Alerts on high failure rates (>10/hour)

### 5. SSH Key Environment 🔑
- Counts public keys in `/root/.ssh/`
- Reports authorized keys count
- Validates `.ssh` directory permissions (should be 700)
- Security compliance check

### 6. SSH Resource Usage 📊
- Active SSH process count
- Memory usage by SSH processes
- Performance monitoring

## How to Run

### Full Health Check
```bash
/opt/addypin/ssh-health.sh
```

### Quick Status Check
```bash
/opt/addypin/ssh-health.sh quick
```

## Sample Output

### Full Health Check Output:
```
🔐 VPS SSH Health Check
==============================
📅 2025-09-16 02:41:21

🔍 Checking SSH Daemon...
✅ SSH Daemon: Running
📊 Process ID: 894 | Uptime: 3-08:48:22

🌐 Checking SSH Port...
✅ SSH Port 22: Listening
📊 Active listeners: 2

⚙️ Checking SSH Configuration...
✅ SSH Config: Valid syntax
📊 Password Auth: yes | Pubkey Auth: yes | Root Login: yes

📈 Recent SSH Activity...
⚠️ Auth log not accessible

🔑 SSH Key Environment...
✅ SSH Keys: 5 public keys, 11 authorized
✅ Permissions: /root/.ssh (700) - secure

📊 SSH Resource Usage...
✅ SSH Processes: 3 active
📊 Memory Usage: 0.0%

==============================
✅ SSH STATUS: HEALTHY
🎉 SSH service fully operational
```

### Quick Status Output:
```
🔐 SSH Status: Daemon ✅ | Port ✅ | Config ✅
```

## Integration Options

### Current Status
- **Standalone Script**: Works independently
- **Location**: `/opt/addypin/ssh-health.sh`
- **Logging**: Writes to `/var/log/addypin-ssh-health.log`

### Future Integration Possibilities
- Add SSH checks to main health script (`/opt/addypin/universal-health.sh`)
- Include in automated monitoring cron jobs
- Integrate with alert notification system

## Usage Commands

```bash
# Set up the script (one-time)
chmod +x /opt/addypin/ssh-health.sh

# Run full SSH health check
/opt/addypin/ssh-health.sh

# Get quick SSH status
/opt/addypin/ssh-health.sh quick

# View SSH health logs
tail -f /var/log/addypin-ssh-health.log
```

## Security Benefits

1. **Early Warning System**: Detects SSH service issues before they impact access
2. **Configuration Monitoring**: Validates SSH security settings remain correct
3. **Attack Detection**: Monitors failed login attempts for security threats
4. **Permission Auditing**: Ensures SSH key directories maintain secure permissions
5. **Resource Monitoring**: Tracks SSH service resource consumption

## Relationship to Other Monitoring

- **Main Health Script**: `/usr/local/bin/health` - Monitors application services
- **SSH Health Script**: `/opt/addypin/ssh-health.sh` - Monitors SSH service specifically
- **SSH Tunnel Monitor**: `scripts/ssh-tunnel-monitor.sh` - Monitors SSH connectivity from Replit

Together, these provide comprehensive monitoring of the entire AddyPin infrastructure from multiple perspectives.