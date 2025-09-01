#!/bin/bash

# Create new backup directory with timestamp
BACKUP_DIR="/opt/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

echo "=== Creating AddyPin backup in $BACKUP_DIR ==="

# 1. Backup databases
echo "Backing up databases..."
PGPASSWORD=YOUR_DB_PASSWORD pg_dump -h localhost -U addypin_user addypin_staging > $BACKUP_DIR/db-staging.sql 2>/dev/null

# 2. Backup environment files
echo "Backing up environment files..."
cd /opt/addypin
cp .env.staging $BACKUP_DIR/ 2>/dev/null || echo "No .env.staging found"
cp .env.production $BACKUP_DIR/ 2>/dev/null || echo "No .env.production found"

# 3. Backup Docker compose files
echo "Backing up Docker compose files..."
cp docker-compose.staging.yml $BACKUP_DIR/ 2>/dev/null
cp docker-compose.production.yml $BACKUP_DIR/ 2>/dev/null
cp Dockerfile $BACKUP_DIR/ 2>/dev/null

# 4. Backup nginx configuration
echo "Backing up nginx config..."
cp /etc/nginx/conf.d/addypin-staging.conf $BACKUP_DIR/ 2>/dev/null
cp /etc/nginx/conf.d/addypin-production.conf $BACKUP_DIR/ 2>/dev/null

# 5. Backup deployment scripts
echo "Backing up deployment scripts..."
cp deploy-staging.sh $BACKUP_DIR/ 2>/dev/null
cp deploy-production.sh $BACKUP_DIR/ 2>/dev/null

# 6. Record current Docker images
echo "Recording Docker images..."
docker images | grep addypin > $BACKUP_DIR/docker-images.txt
docker ps -a | grep addypin > $BACKUP_DIR/docker-containers.txt

# 7. Backup PostgreSQL configuration
echo "Backing up PostgreSQL config..."
cp /var/lib/pgsql/data/pg_hba.conf $BACKUP_DIR/pg_hba.conf 2>/dev/null
cp /var/lib/pgsql/data/postgresql.conf $BACKUP_DIR/postgresql.conf 2>/dev/null

# 8. Backup frontend files
echo "Backing up frontend files..."
mkdir -p $BACKUP_DIR/frontend
cp -r /var/www/addypin-staging $BACKUP_DIR/frontend/ 2>/dev/null
cp -r /var/www/addypin-production $BACKUP_DIR/frontend/ 2>/dev/null

# 9. Create system info file
echo "Creating system info..."
cat > $BACKUP_DIR/system-info.txt << EOF
Backup Date: $(date)
Server: addypin.com
Production: https://addypin.com (port 443/80)
Staging: http://addypin.com:8080

Database Info:
- Host: localhost (PostgreSQL)
- Staging DB: addypin_staging
- Production DB: addypin_production
- User: addypin_user

Docker Containers:
- Staging: addypin-staging (port 3001)
- Production: addypin-production (port 3000)

Important Environment Variables:
- RESEND_API_KEY
- CLERK_SECRET_KEY
- DATABASE_URL
- GOOGLE_MAPS_API_KEY
- GITHUB_PERSONAL_ACCESS_TOKEN
- UMAMI_APP_SECRET
- UMAMI_HASH_SALT

Docker Network: 172.0.0.0/8, 10.0.0.0/8
EOF

# 10. Protect the backup
echo "Protecting backup..."
chmod -R 444 $BACKUP_DIR/*  # Read-only
chmod 555 $BACKUP_DIR  # Directory read/execute only
chattr +i $BACKUP_DIR/*  # Make files immutable

echo "=== Backup completed at $BACKUP_DIR ==="
echo "Files are protected with immutable flag."
echo "To unlock: chattr -i $BACKUP_DIR/*"
ls -la $BACKUP_DIR/