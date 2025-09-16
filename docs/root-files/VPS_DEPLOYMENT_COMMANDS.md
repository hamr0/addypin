# VPS Deployment Commands - Copy & Paste Ready

## **Phase 1: Transfer Files to VPS**

**YOU execute these commands on your LOCAL machine:**

```bash
# Create deployment package
tar -czf addypin-containerized.tar.gz \
  frontend/ backend/ nginx/ scripts/ \
  docker-compose.yml .env

# Transfer to VPS (replace with your VPS IP)
scp addypin-containerized.tar.gz root@addypin.com:/opt/addypin/

# SSH to VPS
ssh root@addypin.com
```

## **Phase 2: VPS Preparation**

**YOU execute these commands on your VPS:**

```bash
# Navigate to deployment directory
cd /opt/addypin

# Backup existing setup
cp -r addypin-repo addypin-repo-backup-$(date +%Y%m%d-%H%M%S)

# Stop existing containers and services
docker stop addypin-production 2>/dev/null || true
docker rm addypin-production 2>/dev/null || true
systemctl stop nginx || true

# Extract new deployment
tar -xzf addypin-containerized.tar.gz
cd /opt/addypin

# Set up environment variables (CRITICAL - UPDATE THESE VALUES)
cat > .env << 'EOF'
DATABASE_URL=postgresql://addypin:addypin_password@172.17.0.1:5432/addypin_db
# RESEND_API_KEY=re_your_actual_resend_key_here  # No longer needed - using MSMTP
UMAMI_APP_SECRET=your_actual_umami_secret_here
UMAMI_HASH_SALT=your_actual_umami_salt_here
EOF
```

## **Phase 3: Build and Deploy**

**YOU execute these commands on your VPS:**

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Run the deployment script
./scripts/deploy.sh

# Monitor the deployment
watch docker-compose ps
```

## **Phase 4: Validation**

**YOU execute these commands to test everything:**

```bash
# Test individual services
echo "Testing Backend:"
curl -v http://localhost:3001/api/stats

echo "Testing Frontend:"
curl -v http://localhost:3000

echo "Testing Nginx Proxy:"
curl -v http://localhost/api/stats

# Check container logs if needed
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx
```

## **Phase 5: Domain Configuration**

**YOU execute these commands to set up domain routing:**

```bash
# Update nginx to handle your domain
systemctl stop nginx  # Stop system nginx if running

# The containerized nginx will handle everything
# Access your site at: http://addypin.com

# For SSL (after basic setup works):
# 1. Get SSL certificate with certbot
# 2. Mount certificates in docker-compose.yml
# 3. Uncomment SSL block in nginx/nginx.conf
```

## **Environment Variables - UPDATE THESE**

**YOU need to update `.env` file with your actual values:**

```bash
# Edit the environment file
nano .env

# Replace these placeholder values:
DATABASE_URL=postgresql://addypin:addypin_password@172.17.0.1:5432/addypin_db
# RESEND_API_KEY=re_your_actual_resend_key_here  # No longer needed - using MSMTP
UMAMI_APP_SECRET=your_actual_umami_secret_here  
UMAMI_HASH_SALT=your_actual_umami_salt_here
```

## **Service Management Commands**

**YOU can use these commands to manage the deployment:**

```bash
# Start services
docker-compose up -d

# Stop services  
docker-compose down

# View logs
docker-compose logs -f [service_name]

# Restart a specific service
docker-compose restart backend

# Rebuild and restart everything
docker-compose up --build -d

# Rollback to previous version
./scripts/rollback.sh
```

## **Port Configuration**

**Services will run on these ports:**

- **Frontend**: Port 3000 (React app with nginx)
- **Backend**: Port 3001 (Node.js API)  
- **Nginx Proxy**: Port 80 (Main entry point)
- **PostgreSQL**: Port 5432 (Database)

**External access:**
- **http://addypin.com** → Nginx → Frontend (main site)
- **http://addypin.com/api/*** → Nginx → Backend (API calls)

## **Troubleshooting Commands**

**If something goes wrong:**

```bash
# Check container status
docker-compose ps

# View all logs
docker-compose logs

# Check specific service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs nginx

# Test individual containers
docker exec -it addypin-backend sh
docker exec -it addypin-frontend sh

# Check database connection
docker exec -it addypin-postgres psql -U addypin -d addypin_db

# Reset everything (nuclear option)
docker-compose down -v
docker system prune -f
./scripts/deploy.sh
```

## **Success Criteria**

**Your deployment is successful when:**

1. ✅ `docker-compose ps` shows all services running
2. ✅ `curl http://localhost:3001/api/stats` returns JSON data
3. ✅ `curl http://localhost:3000` returns HTML page
4. ✅ `curl http://localhost/api/stats` returns JSON data (via proxy)
5. ✅ Browser loads `http://addypin.com` successfully

## **Next Steps After Success**

1. **SSL Setup**: Configure HTTPS with Let's Encrypt
2. **Monitoring**: Set up logging and monitoring
3. **Backups**: Configure database backups
4. **Performance**: Optimize nginx caching rules
5. **Security**: Configure firewall rules

**READY TO EXECUTE: All commands are copy-paste ready with your actual tokens and configuration.**