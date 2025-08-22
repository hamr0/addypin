# Fix nginx Routing for Production API

Run these commands on your VPS:

```bash
# Check current nginx configuration
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf

# Create proper nginx configuration
cat > frontend/nginx.conf << 'EOF'
server {
    listen 80;
    server_name addypin.com www.addypin.com;
    root /usr/share/nginx/html;
    index index.html;

    # API requests go to backend
    location /api/ {
        proxy_pass http://backend:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend routes (React Router)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

# Rebuild frontend container with new nginx config
docker-compose build --no-cache frontend
docker-compose restart frontend

# Test API routing
curl -X POST https://addypin.com/api/pins \
  -H "Content-Type: application/json" \
  -d '{"latitude":"52.5200","longitude":"13.4050"}'

# Test health endpoint
curl https://addypin.com/api/health
```