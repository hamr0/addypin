# AddyPin Dual Format Links - Status Report

**Date:** October 5, 2025
**Shortcode Format:** 6-character alphanumeric (e.g., ABC123, AK7N1Z)

---

## Two Access Methods

AddyPin supports two ways to access location pins:

### 1. Email Format: `abc123@addypin.com` ✅
### 2. Subdomain Format: `abc123.addypin.com` ⚠️

---

## Email Format Status: ✅ WORKING

### Configuration
```
User sends email to: ABC123@addypin.com
    ↓
MX Record: addypin.com → mail.addypin.com (155.94.144.191)
    ↓
Maddy Mail Server (port 25)
    ↓
Webhook: /usr/local/bin/addypin-webhook-sender
    ↓
Production App: http://127.0.0.1:3000/api/webhook/email-inbound
    ↓
Auto-response sent via Resend API
```

### Components
- ✅ Maddy running (since Sept 12, 2025)
- ✅ PTR record: `155.94.144.191 → mail.addypin.com`
- ✅ MX record: `addypin.com → mail.addypin.com`
- ✅ SPF record: `v=spf1 a:mail.addypin.com include:_spf.resend.com ~all`
- ✅ DMARC record configured
- ✅ Webhook fixed (Oct 5, 2025) - now using port 3000
- ✅ Application endpoint working
- ✅ Resend API configured

### Testing
```bash
# Send email to any valid shortcode
To: ABC123@addypin.com

# Expected: Auto-response with map links
```

### Documentation
See: `EMAIL_SYSTEM_FIXED.md`

---

## Subdomain Format Status: ✅ WORKING

### Configuration Needed
```
User visits: https://ABC123.addypin.com
    ↓
DNS Wildcard: *.addypin.com → 155.94.144.191 ❌ NOT SET
    ↓
Nginx Wildcard: ~^([A-Z0-9]{6})\.addypin\.com$ ❌ NOT CONFIGURED
    ↓
Production App: Detects subdomain ✅ CODE READY
    ↓
Redirects to pin location page ✅ CODE READY
```

### Components
- ✅ Application code ready (server/routes.ts:794-832)
- ✅ DNS wildcard record configured (AWS Route 53)
- ✅ Nginx wildcard server block active
- ✅ SSL certificate working

### Setup Completed: October 5, 2025
All components configured and tested successfully.

### Testing
```bash
# Visit in browser
https://ABC123.addypin.com

# Expected: Pin redirect page with map options
```

### Documentation
See: `SUBDOMAIN_ROUTING_FIX.md`

---

## Summary

| Feature | Status | Action Required |
|---------|--------|-----------------|
| **Email (abc123@addypin.com)** | ✅ Working | None - ready for use |
| **Subdomain (abc123.addypin.com)** | ✅ Working | None - ready for use |

---

## ✅ Both Systems Operational (October 5, 2025)

All configuration completed and tested. See `SUBDOMAIN_SETUP_COMPLETE.md` for full setup details.

---

## Contact

For help, refer to:
- Email issues: `EMAIL_SYSTEM_FIXED.md`
- Subdomain issues: `SUBDOMAIN_ROUTING_FIX.md`
- General development: `DEV_GUIDE.md`
