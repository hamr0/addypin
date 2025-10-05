# Port 25 Blocked - Email System Fix

**Date:** October 5, 2025
**Issue:** Emails to `*@addypin.com` are not being received
**Root Cause:** Port 25 is blocked by VPS provider (RackNerd)

---

## Problem Summary

**Current Status:**
- ✅ Maddy mail server: Running and configured correctly
- ✅ DNS MX record: `addypin.com → mail.addypin.com → 155.94.144.191`
- ✅ PTR record: `155.94.144.191 → mail.addypin.com`
- ✅ SPF/DMARC: Configured
- ✅ Webhook endpoint: Working (`/api/webhook/email-inbound`)
- ❌ **Port 25: BLOCKED from external connections**

**Evidence:**
```bash
$ timeout 5 bash -c 'cat < /dev/null > /dev/tcp/155.94.144.191/25'
Port 25 BLOCKED
```

**Impact:**
- Emails sent to `ABC123@addypin.com` never reach the VPS
- Maddy receives no emails (logs are empty)
- Auto-response system cannot function

---

## Solution Options

### Option 1: Contact RackNerd Support (RECOMMENDED)

**Action:** Request port 25 to be unblocked

**Email Template:**
```
To: support@racknerd.com
Subject: Request to unblock port 25 for legitimate mail server

Hello RackNerd Support,

I am running a legitimate mail server (Maddy) on my VPS and need
inbound port 25 unblocked to receive emails.

VPS IP: 155.94.144.191
Domain: addypin.com
Hostname: mail.addypin.com
PTR Record: Configured (mail.addypin.com)

Purpose: Auto-response email system for location sharing service
Mail Server: Maddy (lightweight, modern mail server)

I have configured:
- Proper PTR/rDNS record
- SPF record: v=spf1 a:mail.addypin.com include:_spf.resend.com ~all
- DMARC record
- Only receiving emails (not sending bulk)

Could you please unblock inbound port 25 for receiving emails?

Thank you!
```

**Timeline:** 24-48 hours typically
**Cost:** Free
**Pros:** Proper solution, keeps current architecture
**Cons:** Requires waiting

---

### Option 2: Use Email Service Webhook (IMMEDIATE)

**Switch from SMTP receiving to email service API**

#### 2A. Resend Inbound (Since we already use Resend)

**Setup:**
1. Check if Resend supports inbound emails: https://resend.com/docs
2. Configure inbound domain and webhook
3. Update webhook URL to: `https://addypin.com/api/webhook/email-inbound`

**Pros:**
- Immediate solution
- Same provider we use for sending
- Reliable delivery

**Cons:**
- May cost extra (check Resend pricing)
- Requires Resend account configuration

#### 2B. CloudMailin (Free Tier Available)

**Setup:**
1. Sign up at https://www.cloudmailin.com/
2. Configure domain: `addypin.com`
3. Set webhook: `https://addypin.com/api/webhook/email-inbound`
4. Update DNS MX records to point to CloudMailin servers
5. Update webhook code to handle CloudMailin format

**Pros:**
- Free tier available
- Easy setup
- Reliable

**Cons:**
- Another service to manage
- Webhook format different from current
- DNS changes required

#### 2C. SendGrid Inbound Parse

**Setup:**
1. Sign up at SendGrid
2. Configure Inbound Parse
3. Point MX to SendGrid
4. Update webhook

**Pros:**
- Well established
- Good documentation

**Cons:**
- Costs money
- DNS changes required

---

### Option 3: Alternative SMTP Port

**Try using port 587 or 2525 instead of 25**

**Configuration:**
```bash
# Update Maddy config
smtp tcp://0.0.0.0:587 {
    hostname mail.addypin.com
    # ... rest of config
}
```

**Update MX record:**
```
Type: MX
Name: @
Value: 10 mail.addypin.com:587
```

**Pros:**
- Keeps SMTP architecture
- Might not be blocked

**Cons:**
- Not standard (most mail servers won't work)
- Senders must support non-standard port
- Not practical for general email

**Verdict:** ❌ Not recommended for receiving emails from arbitrary senders

---

## Recommended Action Plan

### Phase 1: Immediate (Today)
1. ✅ **Contact RackNerd** - Send support request to unblock port 25
2. ✅ **Document issue** - This file
3. ✅ **Test webhook manually** - Verify auto-response works

### Phase 2: While Waiting (1-2 days)
1. **Research Resend inbound** - Check if they support it
2. **Backup: Sign up CloudMailin** - Free tier as backup
3. **Monitor RackNerd response**

### Phase 3: After Port 25 Unblocked
1. **Test email flow:**
   ```bash
   # Send email to: ABC123@addypin.com
   # Monitor logs:
   ssh root@155.94.144.191 "journalctl -u maddy -f"
   ssh root@155.94.144.191 "tail -f /var/log/addypin-webhook.log"
   ```
2. **Verify auto-response received**
3. **Document success**

---

## Testing Commands

### Test Port 25 Status
```bash
# From external (your local machine)
timeout 5 bash -c 'cat < /dev/null > /dev/tcp/155.94.144.191/25' && echo "OPEN" || echo "BLOCKED"

# From VPS
ssh root@155.94.144.191 "lsof -i:25"
```

### Test Maddy is Running
```bash
ssh root@155.94.144.191 "systemctl status maddy"
```

### Test Webhook Manually
```bash
ssh root@155.94.144.191 'curl -X POST http://127.0.0.1:3000/api/webhook/email-inbound \
  -H "Content-Type: application/json" \
  -d "{\"from\":\"your-email@example.com\",\"to\":\"ABC123@addypin.com\",\"subject\":\"Test\",\"body\":\"Test\"}"'
```

### Monitor Logs
```bash
# Maddy logs
ssh root@155.94.144.191 "journalctl -u maddy -f"

# Webhook logs
ssh root@155.94.144.191 "tail -f /var/log/addypin-webhook.log"

# Application logs
ssh root@155.94.144.191 "docker logs addypin-app-1 -f"
```

---

## Current Workaround

**Until port 25 is unblocked, test auto-response manually:**

```bash
# Trigger webhook directly with your email
curl -X POST https://addypin.com/api/webhook/email-inbound \
  -H "Content-Type: application/json" \
  -d '{
    "from": "avoidaccess@msn.com",
    "to": "ABC123@addypin.com",
    "subject": "Test",
    "body": "Testing email system"
  }'
```

This bypasses SMTP and tests the auto-response functionality directly.

---

## Status

**Current:** Port 25 BLOCKED
**Action:** RackNerd support request (pending)
**Workaround:** Manual webhook testing
**ETA:** 24-48 hours for VPS provider response

---

**Last Updated:** October 5, 2025
**Next Steps:**
1. Send support request to RackNerd
2. Monitor support ticket
3. Test after resolution
