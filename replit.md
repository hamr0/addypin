# addypin - Location Sharing Service

## Overview

addypin is a modern location sharing service that generates short, memorable links for geographic coordinates. Users can pin locations on an interactive map and share them via short URLs (like `ABC123.addypin.com`) or email addresses (like `ABC123@addypin.com`). The application provides seamless redirection to 13+ popular mapping services and includes comprehensive analytics tracking.

## User Preferences

Preferred communication style: Simple, everyday language.
**Command clarity requirements**: Always specify WHO (you/me), WHERE (VPS/Replit), what to REPLACE (exact tokens/keys), and special instructions.
Project organization: Keep main folder clean - documentation moved to `/docs` folder.
Documentation strategy: Maintain detailed .md files as development journal and troubleshooting knowledge base for complex setups.

## Recent Changes (August 2025)

✅ **PRODUCTION DEPLOYMENT SUCCESSFUL (August 20, 2025):**
- **AddyPin LIVE at https://addypin.com**: Fully operational with HTTP 200 responses and SSL certificates
- **Simple restoration approach**: Used working backup files instead of complex build processes
- **Service configuration**: systemd running `/usr/bin/node index.js` with proper environment variables
- **Cost optimization achieved**: 92.75% savings ($2/month VPS vs expensive cloud hosting)
- **Infrastructure separation complete**: Development (Replit + database) and Production (VPS + clean database)
- **Key lesson learned**: Simplicity over complexity - pre-built JavaScript files work better than live compilation
- **Working environment variables**: DATABASE_URL, RESEND_API_KEY, NODE_ENV=production, PORT=3000
- **Service status**: Active (running), Process ID 73019, Memory usage 65.1MB
- **Complete infrastructure**: SSL, nginx reverse proxy, PostgreSQL database, Resend email service
- **Deployment documentation**: Comprehensive guides for troubleshooting and future maintenance

✅ **Latest Updates (August 15, 2025):**
- **Dual format system ready for deployment**: Both `ak7n1z@addypin.com` and `ak7n1z.addypin.com` formats fully implemented
- **DNS configuration clarified**: MX record for `addypin.com` needed (separate from existing `send.addypin.com` setup)
- **Email auto-responder tested**: Branded emails with 13 map apps, custom logo, and professional template operational
- **Subdomain routing ready**: Middleware detects shortcode subdomains for when custom domain goes live
- **Email webhook prepared**: Inbound email processing endpoint ready for open-source email receiving solutions
- **MX record updated successfully**: DNS now points to RackNerd server 155.94.144.191, complete email independence system ready for 24-48h propagation
- **Security fix complete**: GitHub API key exposure resolved, new RESEND_API_KEY secured in environment
- **GitHub integration complete**: Repository connected at `https://github.com/amrhas82/addypin` with active Git workflow
- **Version control established**: Replit Git panel configured for ongoing development and updates
- **Email system operational**: Professional OTP delivery via Resend with verified addypin.com domain and secure API key
- **Custom analytics dashboard**: Built privacy-focused analytics dashboard at `/analytics` (scalable local solution)
- **Performance optimization**: Fixed rate limiting - reduced API calls by 97% (every 2 seconds → 60 minutes)  
- **Enhanced analytics**: Added daily user tracking, registered user counts, and session-based analytics
- **Email association fix**: Corrected pin-email relationships - 1 registered user with 8 pins identified
- **Smart refresh strategy**: Critical actions (editing, country detection) remain instant, stats refresh hourly
- **Production-ready analytics**: Non-intrusive tracking for business intelligence and scaling decisions
- **Global country detection**: Implemented comprehensive coverage for all 195+ UN member states and territories
- **Pre-deployment testing**: Completed full system verification - all services operational
- **Deployment documentation**: Created comprehensive deployment and maintenance guides

✅ **Previous Fixes:**
- Fixed modal z-index issues - login modal now appears above map
- Added Save Changes button after successful OTP authentication
- Fixed cumulative statistics counting (includes both regular clicks and map app clicks)
- Map app counter working correctly (shows individual app click counts)
- OTP codes now display in toast notifications with proper debugging

## Previous Changes

✅ **Core Features Implemented:**
- Interactive map with draggable pins using Leaflet.js and OpenStreetMap
- 6-character auto-generated shortcodes (ABC123 format)
- Dual format support: web links (ABC123.addypin.com) and email format (ABC123@addypin.com)
- Interactive redirect page with map view and editing functionality
- Real-time statistics dashboard showing pins created, links clicked, and active countries
- Comprehensive analytics tracking with daily reports sent to avoidaccess@msn.com
- **Open pin creation** - no login required for pin creation
- **Optional email storage** - pins without email auto-delete after 72 hours
- **OTP-based editing** - verify email to edit existing pin coordinates

✅ **Technical Implementation:**
- PostgreSQL database with proper schema for pins, analytics, daily stats, and expiration tracking
- Responsive design optimized for mobile, tablet, and desktop
- All 13 map apps integrated: Google Maps, Apple Maps, Waze, HERE WeGo, MapQuest, Maps.me, OpenStreetMap, Bing Maps, TomTom, Citymapper, OsmAnd, Sygic Maps, Badger Maps
- Logo design with traditional pin replacing the "P" in AddyPin
- Clean, lightweight architecture with optional authentication for editing only
- OTP verification system for secure coordinate editing
- Automatic cleanup system for temporary pins (72-hour expiry)

✅ **Privacy & Analytics:**
- No recent pins display for privacy protection
- Analytics capture: OS detection, browser, countries, time spent, pins created, link clicks
- Daily automated reports with comprehensive metrics
- IP geolocation ready for country tracking (placeholder implemented)
- Email functionality removed to avoid service limits

✅ **Security & DDoS Protection:**
- **IP-based rate limiting**: 5 pins per hour, 15 pins per day per IP address
- **Multi-layer bot protection**: User agent filtering, honeypot fields, behavioral analysis
- **Request timing analysis**: Blocks suspiciously fast requests (>10 per minute)
- **Security logging**: Real-time monitoring of rate limits, bot detection, and suspicious activity
- **API protection**: General rate limiting (100 requests per 15 minutes) across all endpoints
- **Hidden form fields**: Frontend honeypot implementation to catch automated form submission

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent, modern UI components
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Maps**: Leaflet.js for interactive map functionality with coordinate selection
- **Build System**: Vite with custom configuration for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with proper error handling and request logging
- **Middleware**: Custom logging middleware for API requests and responses
- **Development Setup**: Vite integration for hot module replacement in development

### Data Storage
- **Database**: PostgreSQL using Drizzle ORM for type-safe database operations
- **Connection**: Neon serverless PostgreSQL with connection pooling
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Data Models**: 
  - Pins: Store coordinates, shortcodes, and metadata
  - Analytics: Track events like creation, clicks, and email sends
  - Daily Stats: Aggregate analytics for dashboard reporting
  - Users: Support for future authentication features

### Authentication & Authorization
- **Current State**: Open pin creation - no authentication required for creating pins
- **Design Decision**: Hybrid approach - open creation with OTP verification for editing
- **User Experience**: 
  - Immediate pin creation without barriers
  - Optional email field for permanent storage
  - OTP verification required only for editing existing pins
  - 72-hour auto-deletion for pins without email addresses

## External Dependencies

### Third-Party Services
- **Database Hosting**: Neon Database for serverless PostgreSQL hosting
- **Geolocation**: Browser's native geolocation API for initial position detection
- **Email Service**: Removed to avoid service limits and dependencies
- **Analytics**: Umami self-hosted analytics for privacy-focused web analytics (GDPR compliant)

### Key Libraries & Tools
- **UI Components**: Radix UI primitives with shadcn/ui styling system
- **Form Handling**: React Hook Form with Zod validation schemas
- **Date Handling**: date-fns for date manipulation and formatting
- **Maps Integration**: Leaflet with custom marker handling and multiple map service integrations
- **Analytics**: Custom analytics service with IP geolocation and user agent parsing
- **Development**: ESBuild for production builds, TSX for development server

### Map Service Integrations
The application integrates with multiple mapping services for universal compatibility:
- Google Maps (primary for most platforms)
- Apple Maps (iOS/macOS optimization)
- Waze (navigation focused)
- HERE WeGo, MapQuest, Maps.me, OpenStreetMap, Bing Maps

### Infrastructure Dependencies
- **Environment Variables**: DATABASE_URL for database connection
- **Build Process**: Multi-stage build separating client and server builds
- **Asset Management**: Vite handles static assets with custom alias configuration
- **Simplified Setup**: No external API keys or email service dependencies