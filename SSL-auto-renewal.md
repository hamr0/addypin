# SSL Auto-Renewal Guide for addypin.com

## ✅ RESOLVED - SSL Working Successfully

### Current Status
- **Wildcard SSL Certificate**: `*.addypin.com` and `addypin.com`
- **Certificate Path**: `/etc/letsencrypt/live/addypin.com-0001/`
- **Expiry Date**: December 2, 2025 (89 days remaining)
- **Auto-Renewal**: Manual process (DNS challenge required)
- **Status**: ✅ **BOTH main domain and subdomains now working with HTTPS**

### Issues Fixed
1. **Nginx config certificate path** - Updated to use correct `addypin.com-0001` directory
2. **Monitoring script syntax error** - Fixed date calculation
3. **Subdomain SSL** - Resolved with nginx restart (not just reload)

## Final Working Configuration

### Nginx Config: `/etc/nginx/conf.d/addypin.conf`
```nginx
# Wildcard subdomain server block - BOTH HTTP and HTTPS
server {
    server_name *.addypin.com;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    listen 80;  # HTTP LISTENER
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/addypin.com-0001/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/addypin.com-0001/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

# Main domain server block  
server {
    server_name addypin.com www.addypin.com;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/addypin.com-0001/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/addypin.com-0001/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

# HTTP redirect - ONLY for main domains
server {
    listen 80;
    server_name addypin.com www.addypin.com;
    return 301 https://$host$request_uri;
}
```

## Scripts Created and Working

### 1. Renewal Script: `/root/renew-ssl.sh`
```bash
#!/bin/bash

echo "=== SSL Certificate Renewal for addypin.com ==="
echo "$(date): Starting renewal process"

# Get the DNS TXT record value for renewal
echo ""
echo "MANUAL STEP REQUIRED:"
echo "1. Run this command to get the new TXT record value:"
echo "   certbot certonly --manual --preferred-challenges dns -d addypin.com -d *.addypin.com --dry-run"
echo ""
echo "2. Add the TXT record to your DNS (Namecheap):"
echo "   Record Type: TXT"
echo "   Host: _acme-challenge"
echo "   Value: [value from certbot output]"
echo "   TTL: 300"
echo ""
echo "3. Wait 5-10 minutes for DNS propagation"
echo "4. Run the actual renewal:"
echo "   certbot certonly --manual --preferred-challenges dns -d addypin.com -d *.addypin.com"
echo ""
echo "5. After successful renewal, restart nginx:"
echo "   systemctl restart nginx"
echo ""

# Check current certificate expiry
echo "Current certificate info:"
certbot certificates | grep -A 10 "addypin.com"

echo ""
echo "Certificate expires on: $(openssl x509 -enddate -noout -in /etc/letsencrypt/live/addypin.com-0001/fullchain.pem | cut -d= -f2)"
echo ""
echo "Run this script again 30 days before expiry (around November 2, 2025)"
```

### 2. Working Monitoring Script: `/root/check-ssl-expiry.sh`
```bash
#!/bin/bash

CERT_FILE="/etc/letsencrypt/live/addypin.com-0001/fullchain.pem"
EXPIRY_DATE=$(openssl x509 -enddate -noout -in "$CERT_FILE" | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))

echo "SSL Certificate expires in $DAYS_UNTIL_EXPIRY days ($EXPIRY_DATE)"

if [ "$DAYS_UNTIL_EXPIRY" -lt 30 ]; then
    echo "WARNING: Certificate expires in less than 30 days!"
    echo "Run: /root/renew-ssl.sh"
fi
```

## Renewal Process (3 months from now)

1. **Run renewal script**: `/root/renew-ssl.sh`
2. **Get DNS challenge**: 
   ```bash
   certbot certonly --manual --preferred-challenges dns -d addypin.com -d *.addypin.com --dry-run
   ```
3. **Add TXT record to Namecheap**:
   - Record Type: TXT
   - Host: `_acme-challenge`
   - Value: [from certbot output]
   - TTL: 300
4. **Wait 5-10 minutes for DNS propagation**
5. **Run actual renewal**:
   ```bash
   certbot certonly --manual --preferred-challenges dns -d addypin.com -d *.addypin.com
   ```
6. **Restart nginx**: `systemctl restart nginx` (important: restart, not reload)

## Testing Commands (All Working)

### Check Certificate Expiry
```bash
/root/check-ssl-expiry.sh
# Output: SSL Certificate expires in 89 days (Dec  2 06:52:50 2025 GMT)
```

### Test HTTPS Access
```bash
# Main domain - ✅ Working
curl -I https://addypin.com

# Subdomain - ✅ Working 
curl -I https://7kvnbg.addypin.com
```

### Verify Certificate Details
```bash
# Check wildcard coverage
openssl x509 -noout -text -in /etc/letsencrypt/live/addypin.com-0001/fullchain.pem | grep -A2 "Subject Alternative Name"
# Output: DNS:*.addypin.com, DNS:addypin.com
```

## Key Fix That Resolved Everything
**nginx restart vs reload**: The certificate was correct, but nginx needed a full restart to properly bind the wildcard SSL certificate to subdomains:
```bash
systemctl restart nginx  # This was the key
```

## Monitoring
- **Cron job**: `0 1 1 * * /root/check-ssl-expiry.sh` (monthly check)
- **Manual check**: Run `/root/check-ssl-expiry.sh` anytime
- **Next renewal needed**: Around November 2, 2025

## Important Notes
- Certificate uses DNS challenge method (manual process)
- Requires manual DNS record updates at Namecheap for renewal
- No automatic renewal possible without DNS API access
- Certificate covers both `addypin.com` and `*.addypin.com`
- **Always use `systemctl restart nginx` after certificate renewal, not just reload**