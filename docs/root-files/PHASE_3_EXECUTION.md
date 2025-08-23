# Phase 3 Detailed Implementation Plan: Docker Deployment

## Prerequisites Verification
- [ ] VPS accessible and clean (Phase 2 completed)
- [ ] PostgreSQL database user created
- [ ] Domain DNS pointing to VPS
- [ ] Git repository accessible on VPS

## Step 1: VPS Docker Installation
**Objective**: Install and configure Docker environment

### Commands to Execute:
```bash
# 1.1 Install Docker
sudo apt update
sudo apt install -y docker.io docker-compose

# 1.2 Enable Docker service
sudo systemctl enable --now docker

# 1.3 Add user to docker group (optional, for convenience)
sudo usermod -aG docker $USER
# Note: Requires logout/login to take effect

# 1.4 Verify installation
docker --version
docker-compose --version
```

**Expected Output**: Docker version 20.x+, Docker Compose version 1.29+

## Step 2: Application Containerization
**Objective**: Create Docker configuration files

### 2.1 Create Dockerfile
```dockerfile
# /opt/addypin/addypin-repo/Dockerfile
FROM node:20-bookworm

# Set working directory
WORKDIR /app

# Copy package files for better caching
COPY package*.json ./

# Install ALL dependencies (including dev for tsx and drizzle-kit)
RUN npm ci

# Copy application source
COPY . .

# Build frontend assets only
RUN npm run build

# Create non-root user and switch to it
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser

# Expose application port
EXPOSE 3000

# Start command using tsx (like Replit)
CMD ["npx", "tsx", "server/index.ts"]
```

### 2.2 Create Docker Compose Configuration
```yaml
# /opt/addypin/docker-compose.yml
version: '3.8'

services:
  app:
    build: ./addypin-repo
    container_name: addypin-app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=postgresql://addypin_user:${DB_PASSWORD}@db:5432/addypin
      - RESEND_API_KEY=${RESEND_API_KEY}
    depends_on:
      - db
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs

  db:
    image: postgres:15
    container_name: addypin-db
    environment:
      - POSTGRES_DB=addypin
      - POSTGRES_USER=addypin_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    restart: unless-stopped

volumes:
  postgres_data:
```

### 2.3 Create Environment Configuration
```bash
# /opt/addypin/.env
DB_PASSWORD=secure_password_123
RESEND_API_KEY=re_d3XFqzL8_CRZ8F8NxQNq8gJ2j7mH4CpLw4uP8
```

### 2.4 Create .dockerignore
```
# /opt/addypin/addypin-repo/.dockerignore
node_modules
.git
.env*
dist/
*.log
docs/
attached_assets/
```

## Step 3: Database Initialization
**Objective**: Prepare database schema in container

### 3.1 Create Database Init Script
```sql
-- /opt/addypin/init-db/01-init.sql
-- Database user should already exist from container env
-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE addypin TO addypin_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO addypin_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO addypin_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO addypin_user;
```

## Step 4: Nginx Reverse Proxy Update
**Objective**: Configure nginx to proxy to Docker container

### 4.1 Update Nginx Configuration
```nginx
# /etc/nginx/conf.d/addypin.conf
server {
    listen 80;
    server_name addypin.com www.addypin.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

## Step 5: Deployment Execution
**Objective**: Build and start the containerized application

### 5.1 Initial Deployment
```bash
# Navigate to deployment directory
cd /opt/addypin

# Build and start containers
docker-compose --env-file .env up -d --build

# Verify containers are running
docker ps

# Check application logs
docker-compose logs -f app

# Run database migrations
docker-compose exec app npm run db:push
```

### 5.2 Nginx Configuration and SSL
```bash
# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx

# Install SSL certificate (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d addypin.com -d www.addypin.com
```

## Step 6: Verification and Testing
**Objective**: Confirm successful deployment

### 6.1 Health Checks
```bash
# Test direct container access
curl -I http://localhost:3000

# Test through nginx proxy
curl -I http://addypin.com

# Check database connectivity
docker-compose exec app npm run db:push

# Verify all services running
docker-compose ps
```

### 6.2 Application Testing
- [ ] Homepage loads correctly
- [ ] API endpoints respond
- [ ] Database operations work
- [ ] Email functionality active
- [ ] Pin creation and retrieval working

## Step 7: Production Monitoring Setup
**Objective**: Implement logging and monitoring

### 7.1 Log Management
```bash
# Configure log rotation
sudo tee /etc/logrotate.d/docker-compose << 'EOF'
/opt/addypin/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF
```

### 7.2 Monitoring Commands
```bash
# Container resource usage
docker stats

# Application logs
docker-compose logs -f --tail=100 app

# Database logs
docker-compose logs -f --tail=100 db
```

## Rollback Plan
**If deployment fails**:
```bash
# Stop containers
docker-compose down

# Remove containers and volumes
docker-compose down -v

# Restart from Step 5 with fixes
```

## Success Criteria
- [ ] Application accessible at https://addypin.com
- [ ] All API endpoints functional
- [ ] Database operations working
- [ ] Container auto-restart on failure
- [ ] Nginx proxy routing correctly
- [ ] SSL certificate installed and working
- [ ] Logs accessible and rotating properly

## Post-Deployment Tasks
- [ ] Update DNS to remove Replit references
- [ ] Test email functionality with production domains
- [ ] Implement automated backups
- [ ] Set up monitoring alerts
- [ ] Document operational procedures