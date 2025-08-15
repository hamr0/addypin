# DNS Cleanup Guide for addypin.com

## Records to Keep (Essential)
These are required for basic domain functionality:

### ✅ Keep These Records
- **NS records** (nameservers) - Required for DNS to work
- **SOA record** - Required for domain authority
- **@.addypin.com A record** (34.111.179.208) - If this is your current server IP
- **@.addypin.com TXT record** ("replit-verify=56876a2b-5c54-4cc0-aea7-068b225bbdeb") - Required for Replit verification

## Records to Remove (Old Email Setup)
These appear to be from a previous email service setup and can be removed:

### ❌ Remove These Records
1. **mailjet._1a64960a.addypin.com TXT** - Old Mailjet email service
2. **_amazonses.addypin.com TXT** - Amazon SES email verification
3. **_dmarc.addypin.com TXT** - DMARC policy for email
4. **3auq66zb5jxvufhnj7it223iky23yjmi._domainkey.addypin.com CNAME** - DKIM key 1
5. **apykvxcp62kbo4xyz7rbir7v2sg5tk4m._domainkey.addypin.com CNAME** - DKIM key 2
6. **ex4ebewt6nvqfobbghm66xukd2ky7q4o._domainkey.addypin.com CNAME** - DKIM key 3

### ⚠️ Uncertain Records
- ***.addypin.com TXT** ("ae923eb0d09f1513e639b2d2ed147091") - This could be:
  - Old verification token
  - SSL certificate verification
  - Another service verification
  
**Recommendation**: Remove this unless you know what service it's for.

## New Replit Setup
For your new Replit deployment, you'll need:

1. **A Record**: Point @ to Replit's provided IP address
2. **TXT Record**: Add Replit's verification token (you already have this)

## DNS Propagation Timeline
- **Minimum**: 5-15 minutes for basic propagation
- **Typical**: 1-4 hours for global propagation
- **Maximum**: 24-48 hours in rare cases

## Current Status Check
Your verification is showing "verifying" because:
1. DNS changes need time to propagate globally
2. Replit checks multiple DNS servers worldwide
3. Verification typically completes within 1-4 hours

## Recommended Actions
1. **Remove old email records** (listed above)
2. **Keep essential records** (NS, SOA, current A, Replit TXT)
3. **Wait 2-4 hours** for verification to complete
4. **Check again** if still verifying after 6+ hours