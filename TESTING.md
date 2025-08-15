# AddyPin Testing Guide

## How to Test AddyPin Features

### 1. Creating and Testing Pins

**Create a Pin:**
1. Go to the main page (localhost:5000)
2. Click on the map to select coordinates
3. Fill in optional email (for permanent storage)
4. Click "Pin this location"
5. You'll get both formats:
   - Web link: `ABC123.addypin.com`
   - Email format: `ABC123@addypin.com`

**Test the Generated Links:**

Since we can't set up real subdomains locally, test using the redirect endpoint:
```
http://localhost:5000/redirect/ABC123
```

Replace `ABC123` with your actual shortcode.

### 2. Testing the Login/Edit Modal

**Open the Modal:**
1. Click "Login to edit" in the top right
2. Enter any email address
3. Click "Send Verification Code"
4. Check the console logs in the workflow for your OTP code (6-digit number)
5. Enter the OTP code and verify

**Current OTP for testing:** `746954` (for test@example.com)

### 3. Testing Analytics and Stats

**View Analytics:**
- Stats are displayed in the right sidebar
- Shows cumulative pins created, clicks, countries, and top map apps
- Updates in real-time

**Test Link Clicks:**
1. Create a pin
2. Visit the redirect URL: `http://localhost:5000/redirect/SHORTCODE`
3. Check that the stats counter increases

### 4. Testing Map App Redirects

When you visit a pin redirect page, you'll see:
- Interactive map showing the location
- List of 13 map applications
- Click any app to open that location in the respective map service

### 5. Rate Limiting (Your IP is Whitelisted)

Your IP `172.31.93.34` is whitelisted, so you can:
- Create unlimited pins for testing
- Bypass the 5 pins/hour and 15 pins/day limits

### 6. Testing Security Features

**Bot Detection:**
- Try filling hidden honeypot fields
- Send requests too quickly (>10 per minute)
- Use suspicious user agents

**Security Stats:**
Visit: `http://localhost:5000/api/security/stats`

## API Endpoints for Testing

```bash
# Create a pin
curl -X POST http://localhost:5000/api/pins \
  -H "Content-Type: application/json" \
  -d '{"latitude": "52.247904", "longitude": "4.761194", "shortcode": "", "createdBy": "test@example.com"}'

# Get pin by shortcode
curl http://localhost:5000/api/pins/ABC123

# Get map links
curl http://localhost:5000/api/map-links/52.247904/4.761194

# Send OTP
curl -X POST http://localhost:5000/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Verify OTP
curl -X POST http://localhost:5000/api/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "code": "746954"}'

# Get stats
curl http://localhost:5000/api/stats
```

## Production Considerations

1. **Email Service**: Currently uses console logging for OTP codes
2. **Domain Setup**: In production, configure DNS wildcards for `*.addypin.com`
3. **Database**: Using PostgreSQL with proper connection pooling
4. **Security**: Rate limiting, bot detection, and security monitoring are implemented