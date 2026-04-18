# Testing Guide

## Manual Testing

### Pin Creation
1. Go to the app (localhost:5000 in dev)
2. Click on the map to select coordinates
3. Optionally enter email for permanent storage
4. Click "Pin this location"
5. Verify both formats appear:
   - Web link: `ABC123.addypin.com`
   - Email: `ABC123@addypin.com`

### Pin Redirect (Local)
Use the redirect endpoint since subdomains don't work locally:
```
http://localhost:5000/redirect/SHORTCODE
```

### OTP Verification
1. Click "Login to edit"
2. Enter email, click "Send Verification Code"
3. In development mode, OTP appears in toast notification
4. Enter code and verify

### Analytics
- Stats displayed in right sidebar
- Create pins and visit redirect URLs to see counters increase

### Rate Limiting
Development IPs are whitelisted in `server/middleware/rateLimiter.ts`.

## API Testing

```bash
# Health check
curl http://localhost:5000/api/health

# Create pin
curl -X POST http://localhost:5000/api/pins \
  -H "Content-Type: application/json" \
  -d '{"latitude":"52.247904","longitude":"4.761194","shortcode":"","createdBy":"test@example.com"}'

# Get pin
curl http://localhost:5000/api/pins/ABC123

# Map links
curl http://localhost:5000/api/map-links/52.247904/4.761194

# Send OTP
curl -X POST http://localhost:5000/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Stats
curl http://localhost:5000/api/stats

# Security stats
curl http://localhost:5000/api/security/stats
```

## Security Testing

- **Bot detection**: Try filling honeypot fields, sending >10 req/min, or using suspicious user agents
- **Rate limiting**: Verify limits at 5 pins/hour, 15/day (bypassed for whitelisted IPs)
- **Config blocking**: Attempt to access `/.env` or `/vendor/` paths
