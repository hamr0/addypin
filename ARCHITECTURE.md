# AddyPin Architecture Overview

## System Status (August 2025)

**Production Status**: ✅ LIVE at https://addypin.com
- Service: Active (running) since Aug 20, 2025 at 10:32 EDT
- Process: Node.js running `/usr/bin/node index.js` 
- Memory Usage: 65.1MB
- Infrastructure: RackNerd VPS with SSL certificates
- Cost: $2/month (92.75% savings vs cloud hosting)

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Development   │    │   Version       │    │   Production    │
│    (Replit)     │───▶│   Control       │───▶│     (VPS)       │
│                 │    │   (GitHub)      │    │                 │
│ • Code & test   │    │ • Source truth │    │ • Live website  │
│ • Dev database  │    │ • Git history   │    │ • Prod database │
│ • localhost:5000│    │ • Private repo  │    │ • addypin.com   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Frontend Architecture

**Technology**: React + TypeScript + Vite
- **UI Framework**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with responsive design
- **State Management**: TanStack Query for server state
- **Routing**: Wouter for lightweight client-side routing
- **Maps**: Leaflet.js with OpenStreetMap tiles
- **Build**: Vite with optimized production builds (~623KB bundle)

**Key Features**:
- Interactive draggable pins on map
- Real-time coordinate display and editing
- 13+ map app integrations
- Mobile-first responsive design
- OTP-based authentication for pin editing

## Backend Architecture

**Technology**: Node.js + Express + TypeScript
- **API Design**: RESTful endpoints with proper error handling
- **Database**: PostgreSQL with Drizzle ORM for type-safe queries
- **Email Service**: Resend API for reliable email delivery
- **Authentication**: JWT-based OTP system for pin editing
- **Analytics**: Custom privacy-focused tracking system

**Key Endpoints**:
- `POST /api/pins` - Create location pins
- `GET /api/pins/:shortcode` - Retrieve pin data
- `GET /api/map-links/:lat/:lng` - Get map app links
- `POST /api/verify-otp` - OTP verification for editing
- `GET /api/stats` - Analytics and usage statistics

## Database Schema

**PostgreSQL with Drizzle ORM**:

```sql
-- Core pins table
pins (
  id: serial primary key,
  shortcode: varchar(6) unique,
  latitude: decimal(10,8),
  longitude: decimal(11,8), 
  email: varchar nullable,
  created_at: timestamp,
  expires_at: timestamp nullable
)

-- Analytics tracking
analytics (
  id: serial primary key,
  event_type: varchar,
  shortcode: varchar,
  country: varchar nullable,
  user_agent: varchar nullable,
  created_at: timestamp
)

-- Daily aggregated statistics  
daily_stats (
  id: serial primary key,
  date: date unique,
  pins_created: integer,
  links_clicked: integer,
  countries_active: integer
)
```

## Production Infrastructure

**Deployment Environment**: RackNerd VPS
- **Server**: CentOS/AlmaLinux with 155.94.144.191 IP
- **Web Server**: Nginx reverse proxy with SSL termination
- **SSL Certificates**: Let's Encrypt with automatic renewal
- **Database**: PostgreSQL with local instance
- **Service Management**: systemd service for process control

**Service Configuration**:
```bash
# /etc/systemd/system/addypin.service
ExecStart=/usr/bin/node index.js
Environment=NODE_ENV=production
Environment=DATABASE_URL=postgresql://addypin_user:***@localhost:5432/addypin
Environment=RESEND_API_KEY=re_***
Environment=PORT=3000
```

## Security & Performance

**Security Features**:
- IP-based rate limiting (5 pins/hour, 15 pins/day)
- Bot protection with honeypot fields and user agent filtering
- Request timing analysis to block rapid automation
- Environment variable security for API keys
- Non-root service user execution

**Performance Optimizations**:
- Vite build optimization with code splitting suggestions
- Database indexing on shortcodes and timestamps  
- Analytics refresh reduced from every 2 seconds to 60 minutes
- Static asset caching with proper Cache-Control headers
- Minimal memory footprint (65.1MB production usage)

## Key Business Logic

**Pin Creation Flow**:
1. User drops pin on interactive map
2. System generates 6-character shortcode (ABC123 format)
3. Optional email association for permanent storage
4. Pins without email auto-expire after 72 hours
5. Immediate redirect page creation with map view

**OTP Authentication**:
1. Email required for pin editing access
2. 6-digit OTP sent via Resend API
3. Time-limited verification (5-minute expiry)
4. Success enables coordinate editing interface

**Analytics System**:
- Real-time event tracking (creation, clicks, map app usage)
- Country detection via IP geolocation
- Daily aggregation for dashboard statistics
- Privacy-focused (no personal data storage)

## Backup & Recovery

**Production Backup System**:
- Automated script: `/opt/addypin/create-production-backup.sh`
- Naming convention: `prod_addypin_working_YYYYMMDD_HHMMSS`
- Backup location: `/opt/addypin/production-backups/`
- Contains: Complete app files, dependencies, and metadata
- Retention: Automatic cleanup keeps last 10 backups

**Recovery Process**:
1. Stop systemd service
2. Restore backup files with proper ownership
3. Restart service and verify functionality

## Cost Analysis

**Infrastructure Costs**:
- VPS Hosting: $2/month (RackNerd)
- Domain Registration: ~$10/year
- SSL Certificates: Free (Let's Encrypt)
- **Total Annual Cost**: ~$34/year
- **Savings**: 92.75% vs typical cloud hosting solutions

## Future Considerations

**Scalability Options**:
- CDN integration for static assets
- Database replication for high availability
- Load balancer for multiple VPS instances
- Container deployment with Docker

**Feature Enhancements**:
- GitHub Actions for automated deployment
- Real-time monitoring and alerting
- Advanced analytics dashboard
- Custom domain support for organizations