# Simple Email Setup - smtp2http

## Perfect Solution for Your Needs

**smtp2http** is ideal because it's:
- **Free and open source** - MIT license
- **Ultra-simple** - One command setup
- **Lightweight** - Uses minimal resources  
- **Purpose-built** - Just forwards emails to webhooks

## Complete Setup Guide

### Step 1: Get a VPS Server
Any cheap VPS with port 25 open:
- DigitalOcean: $5/month
- Vultr: $5/month  
- Linode: $5/month

**Requirements:**
- 512MB RAM (minimum)
- Port 25 open for SMTP

### Step 2: Install smtp2http
```bash
# Option A: Docker (Recommended)
docker run -d --name email-forwarder \
  -p 25:25 \
  --restart always \
  alash3al/smtp2http \
  --webhook=https://your-replit-app.replit.app/api/webhook/email-inbound

# Option B: Download binary
wget https://github.com/alash3al/smtp2http/releases/latest/download/smtp2http-linux-amd64
chmod +x smtp2http-linux-amd64
./smtp2http-linux-amd64 --listen=:25 --webhook=https://your-app-url/api/webhook/email-inbound
```

### Step 3: Update DNS
Change your MX record:
```
addypin.com    MX    10    YOUR-VPS-IP-ADDRESS
```

### Step 4: Test
Send email to `r46n3k@addypin.com` and you'll get the branded auto-response!

## How It Works
1. **Email sent** to `ak7n1z@addypin.com`
2. **MX record** directs to your VPS
3. **smtp2http** receives email
4. **Posts to webhook** (your existing endpoint)
5. **Your system** sends branded response

## Total Cost
- **VPS**: $5/month
- **smtp2http**: Free
- **vs SendGrid**: $15/month+

## Your Webhook is Ready
The webhook endpoint I built (`/api/webhook/email-inbound`) will handle the emails perfectly. It extracts the shortcode, finds the location, and sends the branded response with all 13 map apps.

This gives you complete email independence with minimal complexity!