#!/bin/bash

# AddyPin VPS Backup Setup Script
# Creates directories, sets immutable protection, then runs backup

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================${NC}"
echo -e "${BLUE}AddyPin VPS Backup Setup & Execute${NC}"
echo -e "${BLUE}==================================${NC}"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root (use sudo)${NC}"
   exit 1
fi

echo -e "${GREEN}[Step 1/3]${NC} Creating backup directory structure..."
echo "----------------------------------------"

# Create main backup directories
mkdir -p /opt/addypin/backups
mkdir -p /opt/addypin/config-backup-immutable
mkdir -p /opt/addypin/config-backup-immutable/configs
mkdir -p /opt/addypin/config-backup-immutable/nginx
mkdir -p /opt/addypin/config-backup-immutable/docker

echo -e "${GREEN}✓${NC} Created /opt/addypin/backups"
echo -e "${GREEN}✓${NC} Created /opt/addypin/config-backup-immutable"
echo -e "${GREEN}✓${NC} Created subdirectories for configs, nginx, docker"

# Set proper permissions
chmod 700 /opt/addypin/backups
chmod 700 /opt/addypin/config-backup-immutable

echo -e "${GREEN}✓${NC} Set directory permissions to 700"
echo ""

echo -e "${GREEN}[Step 2/3]${NC} Applying immutable protection..."
echo "----------------------------------------"

# First remove immutable flag if already set (to allow modifications)
chattr -i /opt/addypin/config-backup-immutable 2>/dev/null || true
find /opt/addypin/config-backup-immutable -type f -exec chattr -i {} \; 2>/dev/null || true

echo -e "${YELLOW}ℹ${NC} Cleared any existing immutable flags"

# Copy critical config files if they exist
if [[ -f "/opt/addypin/.env.staging" ]]; then
    cp "/opt/addypin/.env.staging" "/opt/addypin/config-backup-immutable/configs/"
    echo -e "${GREEN}✓${NC} Copied .env.staging to immutable backup"
fi

if [[ -f "/opt/addypin/.env.production" ]]; then
    cp "/opt/addypin/.env.production" "/opt/addypin/config-backup-immutable/configs/"
    echo -e "${GREEN}✓${NC} Copied .env.production to immutable backup"
fi

if [[ -f "/opt/addypin/docker-compose.staging.yml" ]]; then
    cp "/opt/addypin/docker-compose.staging.yml" "/opt/addypin/config-backup-immutable/docker/"
    echo -e "${GREEN}✓${NC} Copied docker-compose.staging.yml to immutable backup"
fi

if [[ -f "/etc/nginx/conf.d/addypin-staging.conf" ]]; then
    cp "/etc/nginx/conf.d/addypin-staging.conf" "/opt/addypin/config-backup-immutable/nginx/"
    echo -e "${GREEN}✓${NC} Copied nginx staging config to immutable backup"
fi

# Create critical environment variables file
cat > "/opt/addypin/config-backup-immutable/configs/CRITICAL_ENV_VARS.txt" << 'EOF'
# Critical Environment Variables for AddyPin
# NEVER LOSE THESE!

# Email Service
RESEND_API_KEY=re_YEEpxspy_2zkWUtuc3aVw4fcbYCFqD2mK

# Authentication
CLERK_SECRET_KEY=sk_test_0EIjIoMe694NJvxKoiMPwexmUsVlIo55ILP6bv5c8h

# Database (update as needed)
DATABASE_URL=postgresql://addypin_user:secure_password_123@172.17.0.1:5432/addypin_staging

# Application Settings
NODE_ENV=staging
PORT=3000
STAGING_PORT=8080
EOF

echo -e "${GREEN}✓${NC} Created CRITICAL_ENV_VARS.txt in immutable backup"

# Set immutable attributes
if command -v chattr >/dev/null 2>&1; then
    # Set immutable on all files first
    find /opt/addypin/config-backup-immutable -type f -exec chattr +i {} \; 2>/dev/null || {
        echo -e "${YELLOW}⚠${NC} Could not set immutable flags on files (filesystem may not support it)"
    }
    
    # Then set immutable on directory
    chattr +i /opt/addypin/config-backup-immutable 2>/dev/null || {
        echo -e "${YELLOW}⚠${NC} Could not set immutable flag on directory (filesystem may not support it)"
    }
    
    echo -e "${GREEN}✓${NC} Applied immutable protection (chattr +i)"
else
    echo -e "${YELLOW}⚠${NC} chattr command not available - skipping immutable protection"
fi

echo ""
echo -e "${GREEN}[Step 3/3]${NC} Running full backup script..."
echo "----------------------------------------"

# Check if the full backup script exists
if [[ ! -f "vps-complete-backup.sh" ]]; then
    echo -e "${RED}❌ vps-complete-backup.sh not found in current directory${NC}"
    echo -e "${YELLOW}Please copy vps-complete-backup.sh to the VPS first${NC}"
    echo ""
    echo "Run this from your local machine:"
    echo "  scp vps-complete-backup.sh root@155.94.144.191:/opt/addypin/"
    echo ""
    echo "Then run this setup script again"
    exit 1
fi

# Make backup script executable
chmod +x vps-complete-backup.sh

echo -e "${GREEN}✓${NC} Made backup script executable"
echo -e "${BLUE}→${NC} Starting full backup process..."
echo ""

# Run the full backup script
./vps-complete-backup.sh

echo ""
echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}✅ BACKUP SETUP COMPLETE!${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo "• Backup directories created at /opt/addypin/backups"
echo "• Immutable protection set on /opt/addypin/config-backup-immutable"
echo "• Critical environment variables preserved"
echo "• Full backup completed successfully"
echo ""
echo -e "${YELLOW}To remove immutable protection if needed:${NC}"
echo "  sudo chattr -i /opt/addypin/config-backup-immutable"
echo "  sudo find /opt/addypin/config-backup-immutable -type f -exec chattr -i {} \;"
echo ""
echo -e "${YELLOW}To run backup again in the future:${NC}"
echo "  sudo ./vps-complete-backup.sh"