# Umami Analytics

## Overview

Umami is a privacy-focused, GDPR-compliant analytics platform. Self-hosted on the existing PostgreSQL database for zero additional cost.

## Why Umami

- Privacy-first: No cookies, GDPR compliant
- Self-hosted: Full data ownership
- Lightweight: <2KB tracking script
- Free: Open source

## Setup

### 1. Generate Secrets
```bash
openssl rand -base64 32  # APP_SECRET
openssl rand -base64 32  # HASH_SALT
```

### 2. Environment Variables
```env
UMAMI_APP_SECRET=<generated>
UMAMI_HASH_SALT=<generated>
```

### 3. Deploy
```bash
docker-compose -f umami-docker-compose.yml up -d
```

### 4. Initial Configuration
1. Open `http://localhost:3001`
2. Login: admin / umami (change immediately)
3. Add website: addypin.com
4. Get tracking code

## Integration

### Server-Side (Recommended)
```typescript
import { umamiService } from './services/umami';

await umamiService.trackPageView({
  website: 'your-website-id',
  url: '/redirect/ABC123',
  title: 'Pin Redirect Page'
});

await umamiService.trackEvent({
  website: 'your-website-id',
  name: 'pin_created',
  data: { country: 'Netherlands' }
});
```

### Nginx Reverse Proxy
```nginx
location /analytics/ {
    proxy_pass http://localhost:3001/;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Custom Events Tracked
- Pin creation
- Map service clicks
- Country detection
- Email verification
