#!/bin/bash

# AddyPin MSMTP Installation Script
# Sets up complete email notification system

echo "🏗️ AddyPin MSMTP Email System Installation"
echo "==========================================="

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root"
   echo "💡 Usage: sudo $0"
   exit 1
fi

echo ""
echo "📦 Installing MSMTP and dependencies..."

# Install MSMTP and required packages
if dnf install -y msmtp mailx libgsasl bc; then
    echo "✅ MSMTP packages installed successfully"
else
    echo "❌ Failed to install MSMTP packages"
    exit 1
fi

echo ""
echo "📁 Setting up directory structure..."

# Create scripts directory if it doesn't exist
mkdir -p /opt/addypin/scripts
chmod 755 /opt/addypin/scripts

# Create log file
touch /var/log/addypin-health.log
chmod 644 /var/log/addypin-health.log

echo "✅ Directory structure created"

echo ""
echo "📧 MSMTP Configuration Setup:"
echo "=============================="

if [[ -f "/root/.msmtprc" ]]; then
    echo "⚠️ MSMTP configuration already exists at /root/.msmtprc"
    echo "📋 Current configuration:"
    grep -E "^(from|user|host|port)" /root/.msmtprc 2>/dev/null || echo "Configuration appears incomplete"
    echo ""
    read -p "Do you want to reconfigure MSMTP? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "⏭️ Skipping MSMTP configuration"
        echo "💡 To reconfigure later, edit /root/.msmtprc manually"
        SKIP_CONFIG=true
    fi
fi

if [[ "$SKIP_CONFIG" != "true" ]]; then
    echo "📧 Please provide Gmail configuration details:"
    echo ""
    
    read -p "📨 Enter your Gmail address: " GMAIL_ADDRESS
    echo ""
    echo "🔐 Gmail App Password Setup:"
    echo "  1. Go to: https://myaccount.google.com/apppasswords"
    echo "  2. Enable 2-Factor Authentication if not already enabled"
    echo "  3. Generate a new App Password (16 characters)"
    echo "  4. Copy the 16-character code (without spaces)"
    echo ""
    read -p "🔑 Enter your Gmail App Password: " -s GMAIL_APP_PASSWORD
    echo ""
    
    if [[ -z "$GMAIL_ADDRESS" ]] || [[ -z "$GMAIL_APP_PASSWORD" ]]; then
        echo "❌ Gmail address and app password are required"
        echo "💡 Run this script again with valid credentials"
        exit 1
    fi
    
    echo "💾 Creating MSMTP configuration..."
    
    cat << EOF > /root/.msmtprc
# AddyPin MSMTP Configuration
# Generated: $(date)

# Set default values for all accounts
defaults
auth           on
tls            on
tls_trust_file /etc/ssl/certs/ca-bundle.crt
logfile        ~/.msmtp.log

# Gmail configuration for AddyPin
account        gmail
host           smtp.gmail.com
port           587
from           $GMAIL_ADDRESS
user           $GMAIL_ADDRESS
password       $GMAIL_APP_PASSWORD

# Set default account to use
account default : gmail
EOF
    
    # Set secure permissions (CRITICAL!)
    chmod 600 /root/.msmtprc
    chown root:root /root/.msmtprc
    
    echo "✅ MSMTP configuration created with secure permissions"
    
    echo ""
    echo "🧪 Testing email configuration..."
    
    # Test email
    if echo "AddyPin MSMTP test email sent at $(date)" | mail -s "✅ AddyPin MSMTP Test" avoidaccess@gmail.com; then
        echo "✅ Test email sent successfully to avoidaccess@gmail.com"
        echo "📧 Check your Gmail inbox in 30-60 seconds"
    else
        echo "❌ Failed to send test email"
        echo "📋 Check MSMTP log: cat ~/.msmtp.log"
    fi
fi

echo ""
echo "📋 Installation Summary:"
echo "========================"

echo "✅ MSMTP packages: Installed"
echo "✅ Directory structure: Created"
echo "✅ Log file: Created (/var/log/addypin-health.log)"

if [[ -f "/root/.msmtprc" ]]; then
    echo "✅ MSMTP config: Configured (/root/.msmtprc)"
else
    echo "⚠️ MSMTP config: Manual setup required"
fi

echo ""
echo "🚀 Next Steps:"
echo "=============="
echo "1. Copy AddyPin MSMTP scripts to /opt/addypin/scripts/"
echo "2. Test email system: /opt/addypin/health-manager.sh test-email"
echo "3. Run health check: /opt/addypin/health-manager.sh enhanced"
echo "4. Enable automation: /opt/addypin/health-manager.sh setup-cron"
echo ""
echo "📧 Email recipient: avoidaccess@gmail.com"
echo "📝 Log location: /var/log/addypin-health.log"
echo "⚙️ MSMTP config: /root/.msmtprc"

echo ""
echo "🏗️ AddyPin MSMTP installation completed!"