# AddyPin API Documentation

## Overview
AddyPin provides a RESTful API for creating short links for GPS coordinates. The API supports creating pins, retrieving pin data, and accessing analytics.

## Base URL
- Development: `http://localhost:5000/api`
- Production: `https://your-domain.com/api`

## Authentication
Most endpoints are open access. Some administrative endpoints may require authentication in the future.

## Rate Limiting
- **Pin Creation**: 5 pins per hour, 15 pins per day per IP address
- **General API**: 100 requests per 15 minutes per IP address
- **Security**: Bot detection and timing analysis active

## Endpoints

### Create Pin
**POST** `/api/pins`

Create a new location pin with a generated shortcode.

**Request Body:**
```json
{
  "latitude": "52.247904",
  "longitude": "4.761194",
  "shortcode": "", // Leave empty - will be auto-generated
  "createdBy": "user@example.com" // Optional - for permanent storage
}
```

**Response:**
```json
{
  "id": 123,
  "shortcode": "ABC123",
  "webLink": "https://ABC123.addypin.com",
  "emailLink": "ABC123@addypin.com",
  "latitude": "52.247904",
  "longitude": "4.761194",
  "createdBy": "user@example.com",
  "expiresAt": null, // null if email provided, otherwise 72 hours from creation
  "createdAt": "2025-01-15T12:00:00Z"
}
```

**Rate Limits:**
- 5 pins per hour per IP
- 15 pins per day per IP

### Get Pin by Shortcode
**GET** `/api/pins/:shortcode`

Retrieve pin information by shortcode.

**Response:**
```json
{
  "id": 123,
  "shortcode": "ABC123",
  "latitude": "52.247904",
  "longitude": "4.761194",
  "createdBy": "user@example.com",
  "expiresAt": null,
  "createdAt": "2025-01-15T12:00:00Z"
}
```

### Get Map Links
**GET** `/api/map-links/:latitude/:longitude`

Get map application links for specific coordinates.

**Response:**
```json
{
  "Google Maps": "https://www.google.com/maps/search/?api=1&query=52.247904,4.761194",
  "Apple Maps": "http://maps.apple.com/?ll=52.247904,4.761194",
  "Waze": "https://waze.com/ul?ll=52.247904,4.761194",
  "OpenStreetMap": "https://www.openstreetmap.org/?mlat=52.247904&mlon=4.761194",
  // ... 9 more map services
}
```

### Update Pin Coordinates
**PATCH** `/api/pins/:id/coordinates`

Update pin coordinates (requires OTP verification).

**Headers:**
```
Authorization: Bearer <edit_token>
```

**Request Body:**
```json
{
  "latitude": "52.123456",
  "longitude": "4.654321"
}
```

### Send OTP Code
**POST** `/api/otp/send`

Send OTP verification code to email for pin editing.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

### Verify OTP Code
**POST** `/api/otp/verify`

Verify OTP code and receive edit token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response:**
```json
{
  "message": "OTP verified successfully",
  "editToken": "base64_encoded_token"
}
```

### Get Statistics
**GET** `/api/stats`

Get daily statistics.

**Response:**
```json
{
  "pinsCreated": 45,
  "linksClicked": 123,
  "emailsSent": 0,
  "activeCountries": 8,
  "totalPins": 1542,
  "topMapApps": [
    { "name": "Google Maps", "clicks": 67 },
    { "name": "Apple Maps", "clicks": 23 }
  ]
}
```

### Security Statistics (Development)
**GET** `/api/security/stats`

Get security monitoring statistics.

**Response:**
```json
{
  "total_events_24h": 45,
  "total_events_1h": 3,
  "rate_limits_24h": 12,
  "bot_detections_24h": 8,
  "suspicious_activity_24h": 2,
  "top_ips_24h": [
    { "ip": "192.168.1.1", "count": 15 },
    { "ip": "10.0.0.1", "count": 8 }
  ]
}
```

## Error Responses

### Rate Limit Exceeded
```json
{
  "error": "Too many pins created from this location. Please try again in an hour.",
  "retryAfter": 3600,
  "limit": 5,
  "remaining": 0
}
```

### Bot Detection
```json
{
  "error": "Automated requests not allowed"
}
```

### Invalid Request
```json
{
  "error": "Invalid coordinates provided"
}
```

### Pin Not Found
```json
{
  "message": "Pin not found"
}
```

## Security Features

### Bot Protection
- User agent validation
- Honeypot field detection
- Request timing analysis
- IP-based rate limiting

### Data Privacy
- No recent pins display
- Optional email storage
- Automatic cleanup (72-hour expiry for pins without email)
- Comprehensive security logging

## SDKs and Examples

### JavaScript/Node.js Example
```javascript
// Create a pin
const response = await fetch('http://localhost:5000/api/pins', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    latitude: '52.247904',
    longitude: '4.761194',
    shortcode: '',
    createdBy: 'user@example.com'
  })
});

const pin = await response.json();
console.log('Generated:', pin.webLink);
```

### cURL Example
```bash
curl -X POST http://localhost:5000/api/pins \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": "52.247904",
    "longitude": "4.761194",
    "shortcode": "",
    "createdBy": "user@example.com"
  }'
```

## Supported Map Applications
1. Google Maps
2. Apple Maps  
3. Waze
4. HERE WeGo
5. MapQuest
6. Maps.me
7. OpenStreetMap
8. Bing Maps
9. TomTom
10. Citymapper
11. OsmAnd
12. Sygic Maps
13. Badger Maps

## Links Display Location

The generated URL and email links are displayed in the sidebar after pin creation:

1. **Web Link**: `ABC123.addypin.com` format - appears in a green success box
2. **Email Format**: `ABC123@addypin.com` format - appears in the same success box
3. Both links have copy-to-clipboard buttons for easy sharing
4. Links are highlighted with green styling to indicate successful generation

The links appear immediately after clicking "Generate AddyPin" and are prominently displayed in the right sidebar.