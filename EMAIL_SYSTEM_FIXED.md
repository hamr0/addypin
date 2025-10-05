# Email System - FIXED & WORKING

**Date:** October 5, 2025
**Status:** ✅ **OPERATIONAL**

---

## System Architecture

```
Incoming Email (abc123@addypin.com)
    ↓
MX Record (addypin.com → mail.addypin.com)
    ↓
Maddy Mail Server (Port 25 on VPS)
    ↓
Webhook Script (/usr/local/bin/addypin-webhook-sender)
    ↓
Production App (http://127.0.0.1:3000/api/webhook/email-inbound)
    ↓
Auto-Response Email (via Resend API)
```

---

## Current Configuration

### DNS Records ✅

**MX Record:**
```
Type: MX
Name: @ (addypin.com)
Value: 10 mail.addypin.com
TTL: Auto
Status: ✅ Active
```

**A Record for Mail:**
```
Type: A
Name: mail
Value: 155.94.144.191
TTL: Auto
Status: ✅ Active
```

**PTR Record (Reverse DNS):**
```
155.94.144.191 → mail.addypin.com
Provider: RackNerd
Status: ✅ Configured
```

**SPF Record:**
```
Type: TXT
Name: @ (addypin.com)
Value: "v=spf1 a:mail.addypin.com include:_spf.resend.com ~all"
Status: ✅ Active
```

**DMARC Record:**
```
Type: TXT
Name: _dmarc
Value: "v=DMARC1; p=none; rua=mailto:admin@addypin.com"
Status: ✅ Active
```

---

## VPS Components

### 1. Maddy Mail Server ✅

**Service:** `maddy.service`
**Status:** Active (running since Sept 12, 2025)
**Port:** 25 (SMTP)
**Config:** `/etc/maddy/maddy.conf`

```ini
state_dir /var/lib/maddy
runtime_dir /run/maddy
hostname mail.addypin.com

tls off

msgpipeline webhook {
    default_destination {
        check {
            command /usr/local/bin/addypin-webhook-sender
        }
        deliver_to dummy
    }
}

smtp tcp://0.0.0.0:25 {
    hostname mail.addypin.com
    destination addypin.com {
        deliver_to &webhook
    }
    default_destination {
        reject 550 5.1.1 "Domain not served here"
    }
}
```

**Check status:**
```bash
ssh root@155.94.144.191 "systemctl status maddy"
```

**View logs:**
```bash
ssh root@155.94.144.191 "journalctl -u maddy -f"
```

---

### 2. Webhook Sender Script ✅

**File:** `/usr/local/bin/addypin-webhook-sender`
**Owner:** maddy:maddy
**Permissions:** 755 (executable)

**What it does:**
1. Receives email from Maddy via stdin
2. Extracts sender, recipient, and shortcode
3. Sends HTTP POST to production app
4. Logs results to `/var/log/addypin-webhook.log`

**Fixed Issues:**
- ✅ Changed from port 5000 (dev) to port 3000 (production)
- ✅ Removed HMAC signature (endpoint doesn't validate it)
- ✅ Added logging for debugging

**View logs:**
```bash
ssh root@155.94.144.191 "tail -f /var/log/addypin-webhook.log"
```

---

### 3. Production Application ✅

**Container:** addypin-app-1
**Port:** 127.0.0.1:3000
**Endpoint:** `/api/webhook/email-inbound`
**Code:** `server/routes.ts:747-789`

**Webhook Behavior:**
1. Receives POST with `{from, to, subject, body}`
2. Extracts shortcode from `to` field (ABC123@addypin.com)
3. Looks up pin in database
4. Sends auto-response email with map links via Resend
5. Returns JSON response

**Test webhook:**
```bash
ssh root@155.94.144.191 'curl -sS -X POST http://127.0.0.1:3000/api/webhook/email-inbound \
  -H "Content-Type: application/json" \
  -d "{\"from\":\"test@example.com\",\"to\":\"ABC123@addypin.com\",\"subject\":\"Test\",\"body\":\"Test\"}"'
```

Expected response:
```json
{"status":"processed"}  // If pin exists
{"status":"failed","message":"Pin not found"}  // If pin doesn't exist
```

---

## How It Works

### Email Flow Example

**User sends email:**
```
To: AK7N1Z@addypin.com
From: user@gmail.com
Subject: Where is this location?
```

**Step-by-step process:**

1. **Email arrives at Maddy** (port 25)
   ```
   Maddy receives SMTP connection
   Validates recipient domain (addypin.com)
   Accepts email for processing
   ```

2. **Maddy triggers webhook script**
   ```bash
   /usr/local/bin/addypin-webhook-sender
   RECIPIENT=AK7N1Z@addypin.com
   SENDER=user@gmail.com
   ```

3. **Webhook script extracts data**
   ```
   Shortcode: AK7N1Z
   JSON payload created
   ```

4. **HTTP POST to production app**
   ```bash
   POST http://127.0.0.1:3000/api/webhook/email-inbound
   Content-Type: application/json
   {
     "to": "AK7N1Z@addypin.com",
     "from": "user@gmail.com",
     "subject": "Where is this location?",
     "body": "Email content..."
   }
   ```

5. **Application processes email**
   ```
   Extract shortcode: AK7N1Z
   Look up pin in database
   Get lat/long: 37.7749, -122.4194
   Generate map links (Google Maps, Apple Maps, etc.)
   ```

6. **Send auto-response via Resend**
   ```
   To: user@gmail.com
   From: noreply@addypin.com
   Subject: Your AddyPin location (AK7N1Z)

   [Branded email with all map app links]
   ```

7. **User receives email**
   ```
   Email arrives in inbox with clickable map links
   ```

---

## Testing

### Manual Email Test

**Prerequisites:**
1. Get a valid shortcode from production database
2. Use your real email address

**Send test email:**
```
To: AK7N1Z@addypin.com  (replace with real shortcode)
From: your-email@example.com
Subject: Test
Body: Testing email system
```

**Expected outcome:**
1. Email delivered to Maddy (check: `journalctl -u maddy -f`)
2. Webhook triggered (check: `/var/log/addypin-webhook.log`)
3. App processes request (check: `docker logs addypin-app-1`)
4. Auto-response sent (check your inbox)

---

### Monitoring Commands

**On VPS:**

```bash
# SSH to VPS
ssh root@155.94.144.191

# Check Maddy status
systemctl status maddy

# Watch Maddy logs (incoming emails)
journalctl -u maddy -f

# Watch webhook logs (forwarding to app)
tail -f /var/log/addypin-webhook.log

# Watch application logs (processing & responses)
docker logs addypin-app-1 -f --tail=100

# Test production app health
curl http://127.0.0.1:3000/api/health

# Test webhook endpoint
curl -X POST http://127.0.0.1:3000/api/webhook/email-inbound \
  -H "Content-Type: application/json" \
  -d '{"from":"test@example.com","to":"ABC123@addypin.com","subject":"Test","body":"Test"}'
```

---

## Troubleshooting

### Email Not Received

**1. Check MX records:**
```bash
dig MX addypin.com +short
# Should return: 10 mail.addypin.com.

dig A mail.addypin.com +short
# Should return: 155.94.144.191
```

**2. Check Maddy is running:**
```bash
ssh root@155.94.144.191 "systemctl status maddy"
```

**3. Check port 25 is listening:**
```bash
ssh root@155.94.144.191 "netstat -tlnp | grep :25"
# Should show: tcp  0.0.0.0:25  LISTEN  maddy
```

**4. Test SMTP connection:**
```bash
telnet 155.94.144.191 25
# Should connect and show Maddy greeting
# Type: QUIT
```

---

### Webhook Not Triggered

**1. Check webhook script exists:**
```bash
ssh root@155.94.144.191 "ls -la /usr/local/bin/addypin-webhook-sender"
# Should show: -rwxr-xr-x maddy maddy
```

**2. Test webhook script manually:**
```bash
ssh root@155.94.144.191 'echo "Test email" | RECIPIENT="ABC123@addypin.com" SENDER="test@example.com" /usr/local/bin/addypin-webhook-sender'

# Check logs
ssh root@155.94.144.191 "tail /var/log/addypin-webhook.log"
```

---

### Auto-Response Not Sent

**1. Check Resend API key:**
```bash
ssh root@155.94.144.191 "grep RESEND_API_KEY /opt/addypin/.env"
# Should show: RESEND_API_KEY=re_***
```

**2. Check application logs:**
```bash
ssh root@155.94.144.191 "docker logs addypin-app-1 --tail=100 | grep -i email"
```

**3. Test webhook endpoint directly:**
```bash
ssh root@155.94.144.191 'curl -X POST http://127.0.0.1:3000/api/webhook/email-inbound \
  -H "Content-Type: application/json" \
  -d "{\"from\":\"test@example.com\",\"to\":\"AK7N1Z@addypin.com\",\"subject\":\"Test\",\"body\":\"Test\"}"'
```

---

## What Was Fixed (October 5, 2025)

### Issue #1: Wrong Port
**Problem:** Webhook pointed to port 5000 (dev) instead of 3000 (production)
**Fix:** Updated `/usr/local/bin/addypin-webhook-sender` to use correct port
**Impact:** Emails now properly reach production app

### Issue #2: Unnecessary HMAC
**Problem:** Webhook script generated HMAC signatures but endpoint didn't validate
**Fix:** Removed HMAC code to simplify script
**Impact:** Cleaner code, no functionality change

### Issue #3: No Logging
**Problem:** No visibility into webhook processing
**Fix:** Added `/var/log/addypin-webhook.log` with detailed logging
**Impact:** Easy debugging and monitoring

---

## Maintenance

### Regular Checks

**Weekly:**
```bash
# Check Maddy is running
ssh root@155.94.144.191 "systemctl status maddy"

# Check webhook logs for errors
ssh root@155.94.144.191 "grep FAILED /var/log/addypin-webhook.log | tail -20"
```

**Monthly:**
```bash
# Rotate webhook logs (if getting large)
ssh root@155.94.144.191 "echo > /var/log/addypin-webhook.log"

# Check Maddy version for updates
ssh root@155.94.144.191 "/usr/local/bin/maddy version"
```

---

## Email System Status: ✅ FULLY OPERATIONAL

**Infrastructure:**
- ✅ Maddy installed and running
- ✅ PTR record configured (mail.addypin.com)
- ✅ MX record active
- ✅ SPF/DMARC records set
- ✅ Webhook script fixed
- ✅ Production app responding
- ✅ Resend API configured

**Ready for production use!**

Send email to any valid shortcode: `ABC123@addypin.com`
