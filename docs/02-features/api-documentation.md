# API Documentation

## Base URL
- **Development**: `http://localhost:5000/api`
- **Production**: `https://addypin.com/api`

## Authentication
Most endpoints are open access. Pin editing requires OTP verification.

## Rate Limiting
- **Pin Creation**: 5 pins/hour, 15 pins/day per IP
- **General API**: 100 requests/15 minutes per IP
- **Security**: Bot detection and timing analysis active

---

## Endpoints

### Create Pin
**POST** `/api/pins`

```json
// Request
{
  "latitude": "52.247904",
  "longitude": "4.761194",
  "shortcode": "",
  "createdBy": "user@example.com"  // Optional
}

// Response
{
  "id": 123,
  "shortcode": "ABC123",
  "webLink": "https://ABC123.addypin.com",
  "emailLink": "ABC123@addypin.com",
  "latitude": "52.247904",
  "longitude": "4.761194",
  "createdBy": "user@example.com",
  "expiresAt": null,
  "createdAt": "2025-01-15T12:00:00Z"
}
```

### Get Pin
**GET** `/api/pins/:shortcode`

```json
// Response
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

Returns links for 13+ map applications.

```json
// Response
{
  "Google Maps": "https://www.google.com/maps/search/?api=1&query=52.247904,4.761194",
  "Apple Maps": "http://maps.apple.com/?ll=52.247904,4.761194",
  "Waze": "https://waze.com/ul?ll=52.247904,4.761194",
  "OpenStreetMap": "https://www.openstreetmap.org/?mlat=52.247904&mlon=4.761194"
  // ... 9 more
}
```

### Update Pin Coordinates
**PATCH** `/api/pins/:id/coordinates`

Requires OTP verification. Pass edit token in `Authorization: Bearer <edit_token>` header.

```json
// Request
{ "latitude": "52.123456", "longitude": "4.654321" }
```

### Send OTP
**POST** `/api/otp/send`

```json
// Request
{ "email": "user@example.com" }
```

### Verify OTP
**POST** `/api/otp/verify`

```json
// Request
{ "email": "user@example.com", "code": "123456" }

// Response
{ "message": "OTP verified successfully", "editToken": "base64_encoded_token" }
```

### Get Statistics
**GET** `/api/stats`

```json
// Response
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

### Security Statistics
**GET** `/api/security/stats` (development only)

### Health Check
**GET** `/api/health`

```json
// Response
{
  "status": "healthy",
  "timestamp": "2025-09-16T13:04:24.200Z",
  "uptime": 700.7,
  "version": "1.0.0",
  "environment": "production",
  "checks": [
    { "name": "postgresql", "status": "healthy", "responseTime": 3 },
    { "name": "memory", "status": "healthy", "responseTime": 19 }
  ]
}
```

### System Health
**GET** `/api/health/system`

Returns detailed system metrics (Node version, platform, memory, CPU).

---

## Error Responses

| Status | Response |
|--------|----------|
| 429 | `{"error": "Too many pins created...", "retryAfter": 3600, "limit": 5, "remaining": 0}` |
| 403 | `{"error": "Automated requests not allowed"}` |
| 400 | `{"error": "Invalid coordinates provided"}` |
| 404 | `{"message": "Pin not found"}` |

## Code Examples

### JavaScript
```javascript
const response = await fetch('https://addypin.com/api/pins', {
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
```

### cURL
```bash
curl -X POST https://addypin.com/api/pins \
  -H "Content-Type: application/json" \
  -d '{"latitude":"52.247904","longitude":"4.761194","shortcode":"","createdBy":"user@example.com"}'
```
