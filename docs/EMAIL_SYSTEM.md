# Email System - Complete Documentation

## Overview

AddyPin's email system allows users to send emails to `SHORTCODE@addypin.com` and receive automatic responses with location details and map app links.

**Example**: Send email to `TRZLUA@addypin.com` → Get map links for that location

## Architecture

```
External Email Server
    ↓ (SMTP Port 25)
Maddy Mail Server
    ↓ (Webhook Script)
AddyPin Application (port 3000)
    ↓ (Resend API)
User receives auto-response email
```

## Components

### 1. Maddy Mail Server

**Status**: ✅ Running on VPS
**Service**: `systemd` service `maddy`
**Port**: 25 (SMTP)
**Config**: `/etc/maddy/maddy.conf`

**Configuration**:
```
smtp tcp://0.0.0.0:25 {
    hostname mail.addypin.com
    destination addypin.com {
        deliver_to &webhook
    }
    default_destination {
        reject 550 5.1.1 "Domain not served here"
    }
}

msgpipeline webhook {
    default_destination {
        check {
            command /usr/local/bin/addypin-webhook-sender
        }
        deliver_to dummy
    }
}
```

**What it does**:
- Listens on port 25 for incoming emails to `*@addypin.com`
- Passes emails to webhook script
- Runs on IPv6 (`:::25`) which also accepts IPv4 connections

### 2. Webhook Script

**Location**: `/usr/local/bin/addypin-webhook-sender`
**Purpose**: Forwards emails from Maddy to AddyPin application

**How it works**:
1. Receives email content via stdin from Maddy
2. Parses `To:` and `From:` headers
3. Extracts shortcode (e.g., `TRZLUA@addypin.com` → `TRZLUA`)
4. Sends JSON payload to `http://127.0.0.1:3000/api/webhook/email-inbound`
5. Logs results to `/var/log/addypin-webhook.log`

**Script excerpt**:
```bash
#!/bin/bash

# Read email from stdin
email_content=$(cat)

# Extract To: and From: headers
recipient=$(echo "$email_content" | grep -i '^To:' | head -1 | sed -E 's/^To: *//i' ...)
sender=$(echo "$email_content" | grep -i '^From:' | head -1 | sed -E 's/^From: *//i' ...)

# Extract shortcode
shortcode=$(echo "$recipient" | sed -E 's/^([A-Z0-9]{6})@addypin\.com$/\1/i' | tr '[:lower:]' '[:upper:]')

# Send to application
curl -H "Content-Type: application/json" \
  -d '{"to":"'$recipient'","from":"'$sender'","subject":"...","body":"..."}' \
  http://127.0.0.1:3000/api/webhook/email-inbound
```

### 3. AddyPin Application Webhook Handler

**Endpoint**: `POST /api/webhook/email-inbound`
**File**: `server/routes.ts:747`

**Process**:
1. Receives webhook from Maddy
2. Validates `to` and `from` fields
3. Extracts shortcode from recipient email
4. Calls `sendMapAutoResponse()` from email-autoresponder service
5. Returns success/failure to Maddy

### 4. Email Auto-Responder Service

**File**: `server/services/email-autoresponder.ts`
**API**: Resend (https://resend.com)

**Two Response Types**:

#### A. Valid Pin Response
When pin exists in database:
- Subject: `SHORTCODE - Country Name`
- Content:
  - 13 map app links (Google Maps, Apple Maps, Waze, etc.)
  - Subdomain link (`SHORTCODE.addypin.com`)
  - Beautiful HTML email with AddyPin branding

#### B. Invalid Pin Response
When pin doesn't exist/expired:
- Subject: `SHORTCODE - addypin not found`
- Content:
  - Explains why pin might not exist (deleted, expired, mistyped)
  - Link to create new addypin at addypin.com
  - Red-themed "not found" email

## DNS Configuration

**Required DNS Records** (AWS Route 53):

| Type | Host | Value | Purpose |
|------|------|-------|---------|
| MX | addypin.com | 10 mail.addypin.com | Mail server |
| A | mail.addypin.com | 155.94.144.191 | Mail server IP |
| TXT | addypin.com | v=spf1 ip4:155.94.144.191 -all | SPF record |
| TXT | _dmarc.addypin.com | v=DMARC1; p=none; rua=mailto:postmaster@addypin.com | DMARC policy |
| PTR | 155.94.144.191 | mail.addypin.com | Reverse DNS |

**Verification**:
```bash
dig addypin.com MX
dig mail.addypin.com A
dig addypin.com TXT
```

## Firewall Configuration

**Issue Encountered**: Port 25 was blocked by `firewalld`

**Solution Applied**:
```bash
# Add SMTP service to public zone
firewall-cmd --permanent --zone=public --add-service=smtp

# Add eth0 interface to public zone
firewall-cmd --permanent --zone=public --add-interface=eth0

# Reload firewall
firewall-cmd --reload
```

**Verification**:
```bash
firewall-cmd --zone=public --list-all
# Should show: services: ... smtp ...
# Should show: interfaces: eth0

# Test external connectivity
nmap 155.94.144.191 -p25
# Should show: 25/tcp open smtp

telnet 155.94.144.191 25
# Should connect and show: 220 mail.addypin.com ESMTP Service Ready
```

## Logs and Debugging

### Maddy Logs
```bash
# View Maddy logs
journalctl -u maddy -n 50 --no-pager

# Follow Maddy logs in real-time
journalctl -u maddy -f
```

### Webhook Logs
```bash
# View webhook processing log
tail -f /var/log/addypin-webhook.log

# Check recent webhook activity
tail -50 /var/log/addypin-webhook.log
```

### Application Logs
```bash
# View app logs (includes webhook processing)
docker logs addypin-app-1 --tail 100

# Follow app logs
docker logs addypin-app-1 -f | grep email
```

### Example Log Flow

**Successful Email**:
```
# Maddy log
Oct 05 16:10:47 maddy: smtp: incoming message {"msg_id":"abc123","sender":"user@example.com","rcpt":"TRZLUA@addypin.com"}
Oct 05 16:10:47 maddy: smtp: accepted {"msg_id":"abc123"}

# Webhook log
[Sun Oct 5 16:10:47 EDT 2025] SUCCESS: Email forwarded for trzlua@addypin.com (shortcode: TRZLUA) from user@example.com

# App log
📧 INCOMING EMAIL (Maddy):
To: trzlua@addypin.com
Extracted shortcode: TRZLUA
✅ Auto-response email sent: 8158d5b9-f201-48fb-890a-242f8583ce58
8:10:47 PM [express] POST /api/webhook/email-inbound 200 in 803ms
```

**Invalid Pin**:
```
# App log
📧 INCOMING EMAIL (Maddy):
To: FAKE99@addypin.com
Extracted shortcode: FAKE99
❌ Pin not found - sending not-found notification email
✅ Not-found notification email sent: uuid-here
8:12:50 PM [express] POST /api/webhook/email-inbound 200 in 168ms
```

## Testing

### Test Valid Pin
1. Create a pin on https://addypin.com with your email
2. Note the shortcode (e.g., `TRZLUA`)
3. Send email to `TRZLUA@addypin.com`
4. Check inbox for auto-response with map links

### Test Invalid Pin
1. Send email to `FAKE99@addypin.com`
2. Check inbox for "addypin not found" response

### Test from Command Line
```bash
# Test SMTP connectivity
telnet mail.addypin.com 25

# Send test email (manual SMTP)
EHLO example.com
MAIL FROM:<test@example.com>
RCPT TO:<TRZLUA@addypin.com>
DATA
Subject: Test
From: test@example.com
To: TRZLUA@addypin.com

Test email body
.
QUIT
```

## Environment Variables

**Required in VPS `.env`**:
```bash
RESEND_API_KEY=re_YEEpxspy_...  # Resend API key for sending emails
```

**In development** (without RESEND_API_KEY):
- Auto-responder logs to console instead of sending emails
- Useful for local testing without hitting email API

## Common Issues & Solutions

### Issue: Port 25 Blocked
**Symptoms**: Emails not reaching Maddy, no logs in journalctl
**Diagnosis**:
```bash
nmap 155.94.144.191 -p25  # Shows "filtered" or "closed"
```
**Solutions**:
1. Check firewalld: `firewall-cmd --zone=public --list-all`
2. Check if eth0 in zone: `firewall-cmd --get-zone-of-interface=eth0`
3. Contact VPS provider if blocked upstream

### Issue: Webhook Returns 400 Error
**Symptoms**: Maddy logs show accepted, but webhook log shows HTTP 400
**Diagnosis**:
```bash
tail /var/log/addypin-webhook.log
# Shows: {"error":"Missing to or from address"}
```
**Solution**: Webhook script not parsing email headers correctly. Check `/usr/local/bin/addypin-webhook-sender`

### Issue: No Auto-Response Received
**Check these in order**:
1. Did Maddy receive it? `journalctl -u maddy -n 20`
2. Did webhook forward it? `tail /var/log/addypin-webhook.log`
3. Did app process it? `docker logs addypin-app-1 --tail 50 | grep email`
4. Check spam folder
5. Verify RESEND_API_KEY is set
6. Check Resend dashboard for delivery status

### Issue: Pin Not Found (but it exists)
**Diagnosis**: Pin exists in different database (dev/staging vs production)
**Solution**:
- Email system uses **production** database only
- Create pins on https://addypin.com (not staging or localhost)
- Verify with: `curl https://addypin.com/api/pins/SHORTCODE`

## Security Considerations

1. **No Authentication**: Webhook endpoint is open (no HMAC validation)
   - Runs on localhost only (127.0.0.1:3000)
   - Not exposed externally
   - Only accessible from VPS itself

2. **Rate Limiting**: Consider adding rate limits to webhook endpoint to prevent abuse

3. **Email Validation**: Shortcode must match `^[A-Z0-9]{6}$` pattern

4. **SPF/DMARC**: Configured to prevent spoofing

## Files Reference

| File | Location | Purpose |
|------|----------|---------|
| Maddy config | `/etc/maddy/maddy.conf` | Mail server configuration |
| Webhook script | `/usr/local/bin/addypin-webhook-sender` | Forwards emails to app |
| Webhook log | `/var/log/addypin-webhook.log` | Webhook processing log |
| App webhook handler | `server/routes.ts:747` | Receives webhook POST |
| Email service | `server/services/email-autoresponder.ts` | Sends auto-responses |

## Maintenance

### Restart Maddy
```bash
systemctl restart maddy
systemctl status maddy
```

### Update Webhook Script
```bash
vim /usr/local/bin/addypin-webhook-sender
chmod +x /usr/local/bin/addypin-webhook-sender
# No restart needed - Maddy calls script for each email
```

### Monitor Email Volume
```bash
# Count emails processed today
grep "$(date +%Y-%m-%d)" /var/log/addypin-webhook.log | wc -l

# See recent activity
tail -20 /var/log/addypin-webhook.log
```

## Status: Production Ready ✅

- Port 25: Open
- Maddy: Running
- Webhook: Working
- Auto-responses: Sending (both valid and invalid pins)
- Firewall: Configured
- DNS: All records set

Last verified: October 5, 2025