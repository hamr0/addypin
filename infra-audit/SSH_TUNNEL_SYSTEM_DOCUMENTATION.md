# SSH Tunnel System Documentation

## Overview

The AddyPin project uses a sophisticated SSH tunnel system to enable secure database connectivity from the Replit development environment to the production PostgreSQL database on VPS (155.94.144.191). This document provides comprehensive documentation on how the system works, where to find components, and how to troubleshoot issues.

## Architecture

### Core Problem Solved
Replit's ephemeral filesystem deletes SSH keys and directories on environment restart, breaking traditional SSH tunnel setups. Our solution uses Replit Secrets for persistent SSH key storage with automatic reconstruction.

### Components Overview
```
Replit Development Environment
├── tunnel_manager.sh (SSH key reconstruction & tunnel management)
├── Replit Secrets (persistent SSH key storage)
└── Workflow Integration (automatic tunnel startup)

VPS Database Server (155.94.144.191)
├── PostgreSQL 10.23 (native installation with SSL)
├── pg_hba.conf (tunnel access configuration)
└── SSH daemon (tunnel endpoint)
```

## System Components

### 1. tunnel_manager.sh Script
**Location:** `/workspace/tunnel_manager.sh` (project root)

**Purpose:** Manages SSH key reconstruction and tunnel lifecycle

**Key Functions:**
- Rebuilds SSH key from Replit Secrets on every execution
- Establishes SSH tunnel from localhost:5432 to VPS:5432
- Tests database connectivity
- Handles tunnel lifecycle (start/stop/verify)

**Configuration Variables:**
```bash
VPS_USER="root"                          # VPS username
VPS_IP="155.94.144.191"                 # VPS IP address
SSH_KEY_PATH="$HOME/.ssh/addypin_replit" # Local SSH key path
REMOTE_DB_PORT="5432"                   # Database port on VPS
LOCAL_TUNNEL_PORT="5432"                # Local tunnel port
DATABASE_NAME="addypin_dev"             # Database name
DATABASE_USER="addypin_user"            # Database username
```

### 2. Replit Secrets Configuration
**Access:** Replit UI → Secrets tab

**Required Secrets:**
- `ADDYPIN_SSH_PRIVATE_KEY`: Base64-encoded SSH private key content (without headers/footers)
- `POSTGRES_PASSWORD`: Database password for connectivity testing

**SSH Key Format:** Base64 content only, no BEGIN/END markers
```
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW...
```

### 3. VPS Database Configuration
**Location:** VPS `/var/lib/pgsql/data/pg_hba.conf`

**SSH Tunnel Access Entry:**
```
host    all             all             127.0.0.1/32            md5
```

**Database Details:**
- Server: PostgreSQL 10.23 (native installation)
- SSL: Enabled with certificates
- Authentication: SCRAM-SHA-256
- Development Database: `addypin_dev`
- User: `addypin_user`

### 4. Workflow Integration
**Location:** Replit Workflow "Start application"

**Command:** `bash -c "./tunnel_manager.sh && npm run dev"`

**Execution Flow:**
1. Execute tunnel_manager.sh (rebuilds SSH key, establishes tunnel)
2. Start npm development server with database access

## How It Works

### SSH Key Reconstruction Process

1. **Secret Retrieval:** Script checks for `ADDYPIN_SSH_PRIVATE_KEY` in Replit environment
2. **Directory Creation:** Creates `~/.ssh/` directory if not exists
3. **Key Reconstruction:** Rebuilds proper PEM format:
   ```bash
   echo "-----BEGIN OPENSSH PRIVATE KEY-----" > "$SSH_KEY_PATH"
   echo "$ADDYPIN_SSH_PRIVATE_KEY" | fold -w 70 >> "$SSH_KEY_PATH"
   echo "-----END OPENSSH PRIVATE KEY-----" >> "$SSH_KEY_PATH"
   chmod 600 "$SSH_KEY_PATH"
   ```
4. **Validation:** Verifies key file exists and has correct permissions

### Tunnel Establishment Process

1. **Pre-cleanup:** Kills any existing SSH tunnel processes
2. **Tunnel Creation:** Establishes SSH tunnel with security options:
   ```bash
   ssh -i "$SSH_KEY_PATH" \
       -o StrictHostKeyChecking=no \
       -o ExitOnForwardFailure=yes \
       -o ServerAliveInterval=60 \
       -o IdentitiesOnly=yes \
       -N -L 5432:localhost:5432 \
       root@155.94.144.191
   ```
3. **Verification:** Tests tunnel connectivity on localhost:5432
4. **Database Test:** Verifies PostgreSQL connectivity through tunnel

### Security Features

- **SSH Key Isolation:** Uses IdentitiesOnly=yes to prevent SSH agent interference
- **Connection Monitoring:** ServerAliveInterval=60 maintains tunnel health
- **Automatic Cleanup:** Kills stale tunnel processes before starting new ones
- **Permission Security:** SSH key files set to 600 (owner read/write only)
- **SSL Database Connection:** All database traffic encrypted via SSL

## File Locations

### Replit Development Environment
```
/workspace/
├── tunnel_manager.sh              # Main tunnel management script
├── ~/.ssh/addypin_replit         # SSH key (rebuilt on startup)
└── node_modules/.../             # Application files
```

### VPS Production Environment
```
/var/lib/pgsql/data/
├── pg_hba.conf                   # Database access configuration
├── postgresql.conf               # Database configuration
└── ssl/                         # SSL certificates

/opt/addypin/
├── .env                         # Production environment variables
└── docker-compose.yml           # Production container configuration

/opt/addypin-staging/
├── .env                         # Staging environment variables
└── docker-compose.yml           # Staging container configuration
```

## Troubleshooting Guide

### Common Issues

#### 1. "SSH key secret not found"
**Symptom:** `❌ SSH key secret not found - check ADDYPIN_SSH_PRIVATE_KEY in Secrets`
**Solution:**
```bash
# Check if secret exists
[ -n "$ADDYPIN_SSH_PRIVATE_KEY" ] && echo "✅ Found" || echo "❌ Missing"
```
**Fix:** Add the secret in Replit Secrets tab

#### 2. "Tunnel startup failed"
**Symptoms:** Tunnel PID shown but connectivity test fails
**Diagnosis:**
```bash
# Check tunnel process
ps aux | grep ssh | grep 155.94.144.191

# Test port connectivity
nc -z localhost 5432 && echo "✅ Port open" || echo "❌ Port closed"

# Check SSH connection manually
ssh -i ~/.ssh/addypin_replit root@155.94.144.191 "echo 'SSH OK'"
```

#### 3. "Database connection failed"
**Symptoms:** Tunnel established but database test fails
**Diagnosis:**
```bash
# Test database connection manually
PGPASSWORD="$POSTGRES_PASSWORD" psql -h localhost -p 5432 -U addypin_user -d addypin_dev -c "SELECT version();"
```

#### 4. "Invalid SSH key format"
**Symptoms:** SSH authentication failures
**Fix:** Re-extract SSH key content:
```bash
echo "$VPS_SSH_KEY" | sed 's/-----BEGIN OPENSSH PRIVATE KEY----- //' | sed 's/ -----END OPENSSH PRIVATE KEY-----//'
```

### Testing Commands

#### Full System Test
```bash
# Run complete tunnel management
./tunnel_manager.sh

# Expected output:
# 🔧 AddyPin SSH Tunnel Manager (Secrets Version)
# 🔑 Setting up SSH key from Secrets... ✅ SSH key rebuilt
# 🔄 Tunnel not running, starting new one...
# 🚀 Starting SSH tunnel... ✅ Tunnel started successfully
# 🧪 Testing database connectivity... ✅ Database connection successful
```

#### Reset Simulation
```bash
# Simulate Replit restart (delete keys and tunnels)
pkill -f 'ssh.*155.94.144.191'
rm -f ~/.ssh/addypin_replit

# Run tunnel manager - should rebuild automatically
./tunnel_manager.sh
```

#### Manual Database Test
```bash
# Test database through tunnel
PGPASSWORD="your_password" psql -h localhost -p 5432 -U addypin_user -d addypin_dev
```

## Operational Commands

### Start Tunnel Manually
```bash
./tunnel_manager.sh
```

### Check Tunnel Status
```bash
nc -z localhost 5432 && echo "✅ Tunnel active" || echo "❌ Tunnel down"
```

### Kill Tunnel
```bash
pkill -f 'ssh.*155.94.144.191'
```

### View Tunnel Process
```bash
ps aux | grep ssh | grep 155.94.144.191
```

### Test Database Connectivity
```bash
PGPASSWORD="$POSTGRES_PASSWORD" psql -h localhost -p 5432 -U addypin_user -d addypin_dev -c "SELECT 'Connected' as status;"
```

## Maintenance

### SSH Key Rotation
1. Generate new SSH key on VPS
2. Extract base64 content (without headers)
3. Update `ADDYPIN_SSH_PRIVATE_KEY` in Replit Secrets
4. Update public key in VPS `~/.ssh/authorized_keys`

### Configuration Updates
Edit `tunnel_manager.sh` variables:
- `VPS_IP`: Change target server
- `DATABASE_NAME`: Change target database
- `DATABASE_USER`: Change database user
- Port mappings if needed

### Monitoring
The tunnel includes automatic health monitoring:
- Connectivity verification on startup
- Database connection testing
- Process lifecycle management
- Automatic cleanup of stale connections

## Integration with AddyPin Application

### Environment Variables
Application connects to database via tunnel:
```bash
DATABASE_URL="postgresql://addypin_user:password@localhost:5432/addypin_dev"
```

### Workflow Integration
The tunnel is automatically established before application startup through the "Start application" workflow, ensuring database connectivity is available when the application needs it.

### Development vs Production
- **Development (Replit):** Uses SSH tunnel to VPS database
- **Production (VPS):** Direct database connection
- **Staging (VPS):** Direct database connection to staging database

This architecture allows seamless development with production data while maintaining security and isolation.