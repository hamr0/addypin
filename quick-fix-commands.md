# Quick Fix: nginx Configuration for CentOS

## Check service status first:
```bash
systemctl status addypin.service
journalctl -u addypin.service -f --lines=20
```

## Fix nginx configuration (CentOS structure):
```bash
# Create nginx config directly in conf.d (CentOS standard)
sudo tee /etc/nginx/conf.d/addypin.conf > /dev/null << 'EOF'
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
        proxy_set_header X-Forwarded-For $proxy_add_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Test and start nginx
sudo nginx -t
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Test the complete deployment:
```bash
curl -I http://localhost:3000  # Direct app test
curl -I http://localhost       # nginx proxy test
```