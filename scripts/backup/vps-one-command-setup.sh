#!/bin/bash
# One-command VPS setup for AddyPin Foundation Backup

echo "🚀 Setting up AddyPin Foundation Backup System..."

# Create directory structure
mkdir -p /opt/addypin-foundation-backup/{golden,versioned,scripts,logs}
mkdir -p /opt/addypin-foundation-backup/golden/{postgresql,docker,nginx,monitoring,system}

# Download the backup script (will create this approach)
echo "📥 Creating backup script..."

# For now, create a simple placeholder that we'll replace
cat > /opt/addypin-foundation-backup/scripts/backup-foundation.sh << 'EOF'
#!/bin/bash
echo "🏗️ AddyPin Foundation Backup System"
echo "📋 This script will backup your critical infrastructure files"
echo "⚠️  Script needs to be populated with full content"
echo ""
echo "Expected files to backup:"
echo "  - PostgreSQL configs: /var/lib/pgsql/data/postgresql.conf"
echo "  - Docker configs: /opt/addypin/docker-compose.yml"
echo "  - Environment files: /opt/addypin/.env"
echo "  - Monitoring scripts: /opt/addypin/scripts/enhanced-health-check.sh"
echo "  - Nginx configs: /etc/nginx/conf.d/addypin.conf"
echo ""
echo "🔧 Setup Status: Directory structure created"
echo "📁 Location: /opt/addypin-foundation-backup/"
EOF

# Set permissions
chmod +x /opt/addypin-foundation-backup/scripts/backup-foundation.sh
chown -R root:root /opt/addypin-foundation-backup

echo "✅ Base structure created at /opt/addypin-foundation-backup/"
echo "🔧 Next: Need to populate the full backup script"