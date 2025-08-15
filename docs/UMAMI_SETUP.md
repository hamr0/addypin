# Umami Analytics Setup - Self-Hosted & Free

## Overview
Umami is a privacy-focused, GDPR-compliant alternative to Google Analytics. We'll set it up to use your existing PostgreSQL database for zero additional cost.

## Why Umami?
- ✅ **Privacy-first**: No cookies, GDPR compliant
- ✅ **Self-hosted**: Full data ownership
- ✅ **Lightweight**: <2KB tracking script
- ✅ **Free**: Open source, no licensing costs
- ✅ **Modern UI**: Clean, real-time analytics dashboard

## Setup Steps

### 1. Generate Secrets
Run these commands to generate secure secrets:

```bash
# Generate APP_SECRET
openssl rand -base64 32

# Generate HASH_SALT  
openssl rand -base64 32
```

### 2. Environment Variables
Add these to your `.env` file:

```env
# Umami Analytics Configuration
UMAMI_APP_SECRET=your-generated-app-secret-here
UMAMI_HASH_SALT=your-generated-hash-salt-here
```

### 3. Deploy Umami
Using the provided Docker Compose file:

```bash
# Deploy Umami using your existing PostgreSQL
docker-compose -f umami-docker-compose.yml up -d
```

### 4. Initial Setup
1. Open `http://localhost:3001` (or your domain:3001)
2. Login with default credentials:
   - **Username**: `admin`
   - **Password**: `umami`
3. **IMPORTANT**: Immediately change the admin password
4. Create a new admin user and delete the default one

### 5. Add Your Website
1. Click "Add website" 
2. Enter:
   - **Name**: addypin
   - **Domain**: addypin.com (or your domain)
3. Get your tracking code

### 6. Integration Options

#### Option A: Direct HTML Integration
Add to your main HTML template:
```html
<script async src="http://your-domain:3001/umami.js" data-website-id="your-website-id"></script>
```

#### Option B: Server-Side Integration (Recommended)
Use the Umami service I created in `server/services/umami.ts`:

```typescript
import { umamiService } from './services/umami';

// Track page views
await umamiService.trackPageView({
  website: 'your-website-id',
  url: '/redirect/ABC123',
  title: 'Pin Redirect Page'
});

// Track events
await umamiService.trackEvent({
  website: 'your-website-id',
  name: 'pin_created',
  data: { country: 'Netherlands' }
});
```

## Reverse Proxy Setup (Production)

Add to your web server config to serve Umami on the same domain:

### Nginx Config
```nginx
# Serve Umami analytics on /analytics path
location /analytics/ {
    proxy_pass http://localhost:3001/;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Benefits of This Setup
- **Cost**: $0 (uses your existing infrastructure)
- **Privacy**: All data stays on your servers
- **Performance**: Direct database integration
- **Flexibility**: Custom events and tracking
- **Compliance**: GDPR ready out of the box

## Tracking Capabilities

### Automatic Tracking
- Page views
- Unique visitors
- Referrers
- Countries/regions
- Browser/OS detection
- Device types

### Custom Events (Your addypin Use Cases)
- Pin creation events
- Map service clicks
- Country detection events
- User registration events
- Email verification events

## Production Deployment

1. **Security**: Change default ports, use HTTPS
2. **Backup**: Include Umami data in your backup strategy
3. **Updates**: Regular updates via Docker image updates
4. **Monitoring**: Include Umami health checks

## Database Impact
- **Storage**: ~1-2MB for 10k page views
- **Performance**: Minimal impact on your main app
- **Maintenance**: Automatic table creation and management

---
**Next Steps**: Generate secrets, update environment variables, and deploy!