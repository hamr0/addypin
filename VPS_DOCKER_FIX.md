# VPS Docker Build Context Fix

**Problem**: The frontend Dockerfile is not copying nginx.conf because of build context issues.

**Solution**: Fix the build context by modifying how docker-compose builds the frontend.

Run on VPS:

```bash
cd /opt/addypin

# Check current docker-compose.yml frontend build context
grep -A 10 "frontend:" docker-compose.yml

# Fix the build by using direct nginx config injection
cat > fix-frontend-build.sh << 'EOF'
#!/bin/bash
# Create a custom Dockerfile that directly includes the nginx config

cat > frontend/Dockerfile << 'DOCKERFILE'
# Multi-stage build for React frontend
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit
COPY . .
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine AS production

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Directly embed nginx configuration
RUN cat > /etc/nginx/conf.d/default.conf << 'NGINXCONF'
server {
    listen 80;
    server_name addypin.com www.addypin.com;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://backend:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINXCONF

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
DOCKERFILE

# Rebuild with embedded config
docker-compose build --no-cache frontend
docker-compose up -d frontend
EOF

chmod +x fix-frontend-build.sh
./fix-frontend-build.sh

# Test
curl -X POST https://addypin.com/api/pins -H "Content-Type: application/json" -d '{"latitude":"52.5200","longitude":"13.4050"}'
```