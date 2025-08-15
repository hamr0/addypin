# DNS Changes Required for RackNerd Email Server

## Current DNS Configuration (Issues Identified)

**Problem**: Your MX record points to Amazon SES instead of your RackNerd server.

**Current MX Record:**
```
@.addypin.com    MX    10 inbound-smtp.us-east-1.amazonaws.com
```

**Needs to be changed to:**
```
@.addypin.com    MX    10 155.94.144.191
```

## Required DNS Changes

### Change This Record:
```
Record: @.addypin.com MX
FROM: 10 inbound-smtp.us-east-1.amazonaws.com  
TO:   10 155.94.144.191
TTL:  300
```

### Keep These Records (Already Correct):
✅ SPF Record: "v=spf1 mx -all" (Perfect)
✅ DMARC Record: "v=DMARC1; p=none; rua=mailto:admin@addypin.com" (Perfect)

### Optional: Clean Up Old Records
These Amazon SES records are no longer needed since you're self-hosting:
- 3auq66zb5jxvufhnj7it223iky23yjmi._domainkey.addypin.com (CNAME)
- apykvxcp62kbo4xyz7rbir7v2sg5tk4m._domainkey.addypin.com (CNAME)  
- ex4ebewt6nvqfobbghm66xukd2ky7q4o._domainkey.addypin.com (CNAME)

Keep the Resend DKIM record for your OTP emails:
✅ resend._domainkey.addypin.com (Keep this)

## Summary
**Only 1 change needed**: Update MX record to point to 155.94.144.191

Once this change propagates (24-48 hours), emails to ak7n1z@addypin.com will go to your RackNerd server instead of Amazon SES.