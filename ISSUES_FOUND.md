# Critical Issues Found - October 5, 2025

## Issue 1: ❌ Email System - Port 25 Blocked

### Problem
**Port 25 is BLOCKED from external connections** - This is why emails to `*@addypin.com` are not being received.

### Evidence
```bash
# External test
$ timeout 5 bash -c 'cat < /dev/null > /dev/tcp/155.94.144.191/25'
Port 25 BLOCKED

# Maddy is running and listening
$ systemctl status maddy
Active: active (running)

# But no emails received
$ journalctl -u maddy --since '1 hour ago'
-- No entries --
```

### Root Cause
RackNerd VPS provider likely blocks **outbound port 25** by default to prevent spam. This is common with budget VPS providers.

### Impact
- ✅ Maddy mail server: Working
- ✅ DNS (MX records): Correct
- ✅ Webhook endpoint: Working
- ❌ **Port 25 blocked**: Emails cannot reach the server

### Solutions

#### Option 1: Contact RackNerd Support (RECOMMENDED)
```
Subject: Request to unblock port 25 for mail server

Hello,

I'm running a legitimate mail server (Maddy) on my VPS (155.94.144.191)
and need port 25 unblocked for receiving emails.

Domain: addypin.com
PTR record configured: mail.addypin.com
Purpose: Auto-response email system for location sharing service

Please unblock inbound port 25.

Thank you!
```

**Timeline:** 24-48 hours typically

#### Option 2: Use Alternative SMTP Port (Immediate)
Some providers allow port 587 or 2525 for SMTP:

**Pros:** Immediate
**Cons:** Senders must use non-standard port (not practical for general email)

#### Option 3: Use Email Service API Instead
Switch from receiving emails via SMTP to using an email service webhook:

**Services:**
- Resend (already using for sending)
- SendGrid Inbound Parse
- Mailgun Routes
- CloudMailin

**Pros:** No port 25 needed, more reliable
**Cons:** Costs money, requires code changes

---

## Issue 2: ❌ Staging - API Validation Error

### Problem
Staging API expects **strings** for latitude/longitude but frontend sends **numbers**.

### Evidence
```bash
$ curl -X POST https://staging.addypin.com/api/pins \
  -H "Content-Type: application/json" \
  -d '{"latitude":52.09,"longitude":5.14}'

Response:
{
  "message":"Invalid pin data",
  "errors":[
    {"code":"invalid_type","expected":"string","received":"number","path":["latitude"]},
    {"code":"invalid_type","expected":"string","received":"number","path":["longitude"]}
  ]
}
```

### Root Cause
Schema validation mismatch between frontend and backend.

**Backend expects:**
```typescript
latitude: z.string()
longitude: z.string()
```

**Frontend sends:**
```javascript
{
  latitude: 52.09,  // number
  longitude: 5.14   // number
}
```

### Impact
- ❌ Cannot create pins on staging
- ✅ Production might be affected (need to check)

### Fix

**Option A: Update Backend Schema (RECOMMENDED)**
```typescript
// shared/schema.ts
export const insertPinSchema = createInsertSchema(pins).extend({
  latitude: z.union([z.string(), z.number()]).transform(val => String(val)),
  longitude: z.union([z.string(), z.number()]).transform(val => String(val)),
});
```

**Option B: Update Frontend**
```javascript
// Convert numbers to strings before sending
{
  latitude: String(lat),
  longitude: String(lng)
}
```

---

## Action Items

### Immediate (Email System)
1. **Contact RackNerd** to unblock port 25
2. **OR switch to email service API** (Resend, SendGrid, etc.)
3. **Test port 25** after VPS provider responds

### Immediate (Staging API)
1. **Fix schema validation** in shared/schema.ts
2. **Test on staging** after fix
3. **Deploy to production** if needed

---

## Testing After Fixes

### Email System Test
```bash
# After port 25 is unblocked
# Send email to: ABC123@addypin.com

# Monitor logs
ssh root@155.94.144.191 "journalctl -u maddy -f"
ssh root@155.94.144.191 "tail -f /var/log/addypin-webhook.log"
```

### Staging API Test
```bash
# After schema fix
curl -X POST https://staging.addypin.com/api/pins \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 52.09,
    "longitude": 5.14,
    "createdBy": "test@example.com"
  }'
```

---

## Summary

| Issue | Status | Priority | Solution |
|-------|--------|----------|----------|
| Port 25 Blocked | ❌ Blocking emails | **HIGH** | Contact RackNerd |
| Staging API Validation | ❌ Cannot create pins | **MEDIUM** | Fix schema |

Both issues are fixable but require action!
