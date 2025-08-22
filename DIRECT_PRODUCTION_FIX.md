# Direct Production Fix - Stop CI/CD Loop

**Issue**: We've been fixing CI/CD workflows when the real problem is production API 404 errors.

**Root Problem**: The production server at https://addypin.com has:
- Backend API returning 404 for `/api/pins` and `/api/otp/send`
- Duplicate database exports causing backend crashes
- nginx not configured for React Router

**Direct Solution**: Fix production manually, bypass CI/CD for now.

## Manual Production Fix Commands

SSH into your VPS and run these commands:

```bash
# 1. Fix the duplicate database exports
cd /opt/addypin
nano server/db.ts
# Remove duplicate lines, keep only:
# - Single connectionConfig 
# - Single pool export
# - Single db export

# 2. Add production API environment to frontend
echo "VITE_API_BASE_URL=https://addypin.com" > frontend/.env.production

# 3. Update nginx configuration
cat > frontend/nginx.conf << 'EOF'
server {
    listen 80;
    server_name addypin.com www.addypin.com;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# 4. Rebuild and restart containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 5. Test
curl https://addypin.com/api/health
curl -X POST https://addypin.com/api/pins -H "Content-Type: application/json" -d '{"test":true}'
```

**Expected Result**: Pin creation and editing will work immediately.

**CI/CD**: Fix later after production is working.