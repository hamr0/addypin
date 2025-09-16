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

## SSH Testing from Two Perspectives

### 1. VPS-Side SSH Testing (Current Script)
**Location**: `/opt/addypin/ssh-health.sh`  
**Purpose**: Tests SSH service health ON the VPS itself

#### What Each VPS Test Does:

**🔍 SSH Daemon Check**
- Tests: `systemctl is-active sshd`
- Purpose: Verifies SSH service is running
- Reports: Process ID, uptime
- Detects: Service crashes, startup failures

**🌐 Port Accessibility Check**  
- Tests: `netstat -ln | grep ":22 "`
- Purpose: Confirms SSH port 22 is listening
- Reports: Number of active listeners
- Detects: Port binding issues, network problems

**⚙️ Configuration Validation**
- Tests: `sshd -t` (syntax test)
- Purpose: Validates SSH config file syntax
- Reports: Auth methods (password/pubkey/root)
- Detects: Configuration errors, security misconfigurations

**📈 Activity Monitoring**
- Tests: Parses `/var/log/auth.log`
- Purpose: Tracks login attempts and failures
- Reports: Recent successes/failures, last login time
- Detects: Brute force attacks, unusual activity

**🔑 Key Environment Check**
- Tests: Scans `/root/.ssh/` directory
- Purpose: Validates SSH key setup and permissions
- Reports: Key counts, authorized keys, permissions
- Detects: Permission issues, missing keys

**📊 Resource Usage**
- Tests: `pgrep sshd`, memory usage
- Purpose: Monitors SSH service performance
- Reports: Process count, memory consumption
- Detects: Resource leaks, performance issues

### 2. Replit-Side SSH Testing (Connectivity Testing)
**Location**: `scripts/ssh-tunnel-monitor.sh`  
**Purpose**: Tests SSH connectivity FROM Replit TO VPS

#### What Each Replit Test Does:

**🔍 SSH Tunnel Process Check**
- Tests: `ps aux | grep "ssh.*155.94.144.191.*5432"`
- Purpose: Verifies SSH tunnel processes are running on Replit
- Reports: Process IDs, users, runtime
- Detects: Tunnel crashes, process failures

**🧪 Tunnel Connectivity Test**
- Tests: `nc -z localhost 5432`
- Purpose: Confirms tunnel port is accessible locally
- Reports: Port accessibility status
- Detects: Tunnel connection failures, port binding issues

**🔑 SSH Key Validation (Replit)**
- Tests: Checks `/home/runner/.ssh/addypin_replit`
- Purpose: Validates SSH key exists with correct permissions
- Reports: Key file presence, permissions (should be 600)
- Detects: Missing keys, permission issues on Replit side

**🌐 Direct SSH Connectivity Test**
- Tests: `ssh -i key root@155.94.144.191 "echo test"`
- Purpose: Tests actual SSH connection to VPS
- Reports: Connection success/failure
- Detects: Network issues, authentication failures, VPS accessibility

**🗄️ Database Connectivity Through Tunnel**
- Tests: `psql -h localhost -p 5432` through tunnel
- Purpose: Validates database access via SSH tunnel
- Reports: Database connection status
- Detects: Database issues, tunnel routing problems

## How to Run Both Types of Tests

### VPS-Side Testing (Run on VPS)
```bash
# SSH to VPS first
ssh root@155.94.144.191

# Full SSH health check
/opt/addypin/ssh-health.sh

# Quick SSH status
/opt/addypin/ssh-health.sh quick
```

### Replit-Side Testing (Run from Replit)
```bash
# Full SSH tunnel health check
./scripts/ssh-tunnel-monitor.sh

# Test just connectivity
./scripts/ssh-tunnel-monitor.sh --connectivity

# Test just tunnel processes
./scripts/ssh-tunnel-monitor.sh --processes
```

## Comprehensive SSH Monitoring Strategy

| Test Type | Location | Tests What | Detects |
|-----------|----------|------------|---------|
| **VPS SSH Service** | VPS | SSH daemon health | Service crashes, config errors |
| **VPS SSH Security** | VPS | Keys, permissions, activity | Security issues, attacks |
| **Replit Tunnel** | Replit | SSH tunnel processes | Tunnel failures, process crashes |
| **Replit Connectivity** | Replit | Network connectivity to VPS | Network issues, authentication |
| **Database Access** | Replit | DB through tunnel | Database/tunnel routing issues |

## Relationship to Other Monitoring

- **Main Health Script**: `/usr/local/bin/health` - Monitors application services
- **VPS SSH Health**: `/opt/addypin/ssh-health.sh` - Monitors SSH service on VPS
- **Replit SSH Monitor**: `scripts/ssh-tunnel-monitor.sh` - Monitors SSH connectivity from Replit

Together, these provide **360-degree SSH monitoring** covering service health, security, connectivity, and tunneling from both ends of the connection.