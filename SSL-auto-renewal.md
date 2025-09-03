# SSL Auto-Renewal Guide for addypin.com

## Current Status
- **Wildcard SSL Certificate**: `*.addypin.com` and `addypin.com`
- **Certificate Path**: `/etc/letsencrypt/live/addypin.com-0001/`
- **Expiry Date**: December 2, 2025
- **Auto-Renewal**: Manual process (DNS challenge required)

## Issue Identified
The nginx configuration was pointing to the wrong certificate path. Fixed with:
```bash
sed -i 's|/etc/letsencrypt/live/addypin.com/|/etc/letsencrypt/live/addypin.com-0001/|g' /etc/nginx/conf.d/addypin.conf
```

## Scripts Created

### 1. Renewal Script: `/root/renew-ssl.sh`
- Shows manual DNS challenge steps
- Displays current certificate info
- Guides through renewal process

### 2. Monitoring Script: `/root/check-ssl-expiry.sh`
- Checks days until expiry
- Warns when < 30 days remaining
- Added to monthly cron job

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
6. **Reload nginx**: `systemctl reload nginx`

## Testing Commands

### Check Certificate Expiry
```bash
/root/check-ssl-expiry.sh
```

### Test HTTPS Access
```bash
# Main domain
curl -I https://addypin.com

# Subdomain
curl -I https://7kvnbg.addypin.com
```

### View Certificate Details
```bash
# Check all certificates
certbot certificates

# View specific certificate dates
echo | openssl s_client -servername addypin.com -connect addypin.com:443 2>/dev/null | openssl x509 -noout -dates
```

### Verify Nginx Configuration
```bash
nginx -t
systemctl status nginx
```

## Current Issue
**Subdomain SSL still not working** - getting error:
```
SSL: no alternative certificate subject name matches target host name '7kvnbg.addypin.com'
```

This indicates the wildcard certificate is not being used properly for subdomains. The nginx configuration needs to be checked and the certificate path corrected.

## Monitoring
- **Cron job**: Runs monthly check on 1st day of each month at 1 AM
- **Manual check**: Run `/root/check-ssl-expiry.sh` anytime
- **Next renewal needed**: Around November 2, 2025

## Important Notes
- Certificate uses DNS challenge method
- Requires manual DNS record updates at Namecheap
- No automatic renewal possible without DNS API access
- Certificate covers both `addypin.com` and `*.addypin.com`