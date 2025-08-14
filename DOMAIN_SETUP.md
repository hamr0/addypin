# AddyPin Domain Setup Guide

## DNS Configuration for addypin.com

### Required DNS Records

Add these DNS records to your AWS Route 53 (or current DNS provider):

```
# Main domain
A    addypin.com              -> [YOUR_SERVER_IP]
AAAA addypin.com              -> [YOUR_IPv6_IF_AVAILABLE]

# Wildcard subdomain for shortcodes (ABC123.addypin.com)
A    *.addypin.com            -> [YOUR_SERVER_IP]
AAAA *.addypin.com            -> [YOUR_IPv6_IF_AVAILABLE]

# Email handling for ABC123@addypin.com format
MX   addypin.com              -> 10 [YOUR_MAIL_SERVER]
TXT  addypin.com              -> "v=spf1 include:_spf.google.com ~all"
```

### Server Configuration

#### 1. Nginx Configuration (Recommended)

```nginx
# /etc/nginx/sites-available/addypin.conf

# Main site
server {
    listen 80;
    listen 443 ssl;
    server_name addypin.com;
    
    # SSL configuration
    ssl_certificate /path/to/addypin.com.crt;
    ssl_certificate_key /path/to/addypin.com.key;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Shortcode subdomains (ABC123.addypin.com)
server {
    listen 80;
    listen 443 ssl;
    server_name *.addypin.com;
    
    # SSL configuration (wildcard certificate)
    ssl_certificate /path/to/wildcard.addypin.com.crt;
    ssl_certificate_key /path/to/wildcard.addypin.com.key;
    
    location / {
        # Extract shortcode from subdomain
        if ($host ~* ^([a-zA-Z0-9]{6})\.addypin\.com$) {
            set $shortcode $1;
            return 302 http://addypin.com/redirect/$shortcode;
        }
        
        # Fallback to main site
        return 302 http://addypin.com;
    }
}
```

#### 2. Email Handling Setup

For `ABC123@addypin.com` email format, you'll need:

**Option A: Gmail Workspace (Recommended)**
1. Set up Gmail Workspace for addypin.com
2. Create a catch-all email forwarding rule
3. Configure webhook to process incoming emails

**Option B: Postfix + Custom Script**
```bash
# Install Postfix
sudo apt-get install postfix

# Configure /etc/postfix/main.cf
myhostname = mail.addypin.com
mydomain = addypin.com
virtual_alias_domains = addypin.com
virtual_alias_maps = regexp:/etc/postfix/virtual_regexp

# Create /etc/postfix/virtual_regexp
/^([A-Z0-9]{6})@addypin\.com$/ addypin-handler@localhost

# Create email processing script
/usr/local/bin/addypin-email-handler
```

### SSL Certificates

#### Using Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificates
sudo certbot --nginx -d addypin.com -d *.addypin.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Environment Variables

Set these on your production server:

```bash
# Application
NODE_ENV=production
PORT=5000
DATABASE_URL=[YOUR_POSTGRES_URL]

# Email (for Nodemailer)
EMAIL_USER=noreply@addypin.com  # Your Gmail address
EMAIL_PASS=[GMAIL_APP_PASSWORD] # Gmail App Password

# Domain
DOMAIN=addypin.com
```

### Deployment Commands

```bash
# Clone repository
git clone [YOUR_REPO_URL] /var/www/addypin
cd /var/www/addypin

# Install dependencies
npm ci --production

# Build application
npm run build

# Start with PM2 (process manager)
sudo npm install -g pm2
pm2 start ecosystem.config.js
pm2 startup
pm2 save

# Enable firewall
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22
sudo ufw enable
```

### Testing

1. **DNS Propagation**: `dig addypin.com`, `dig ABC123.addypin.com`
2. **SSL**: `curl -I https://addypin.com`
3. **Shortcode redirect**: Visit `https://ABC123.addypin.com`
4. **Email**: Send test email to `ABC123@addypin.com`

### Monitoring

- Set up monitoring for uptime, SSL expiry, and email delivery
- Consider using services like UptimeRobot or Pingdom
- Monitor DNS propagation globally

### Estimated Costs

- **Domain**: $12-15/year (already owned)
- **SSL**: Free (Let's Encrypt)
- **Server**: $5-20/month (DigitalOcean, Linode, AWS EC2)
- **Email**: Free (Gmail) or $6/month (Google Workspace)
- **Total**: ~$5-35/month depending on server choice

### Performance Optimization

- Enable gzip compression
- Set up CDN (CloudFlare free tier)
- Configure caching headers
- Use HTTP/2
- Optimize images and assets