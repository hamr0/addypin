# AddyPin - Location Sharing Service

## Overview

AddyPin is a modern location sharing service that generates short, memorable links for geographic coordinates. Users can pin locations on an interactive map and share them via short URLs (like `ABC123.addypin.com`) or email addresses (like `ABC123@addypin.com`). The application provides seamless redirection to 13+ popular mapping services and includes comprehensive analytics tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (August 2025)

✅ **Core Features Implemented:**
- Interactive map with draggable pins using Leaflet.js and OpenStreetMap
- 6-character auto-generated shortcodes (ABC123 format)
- Dual format support: web links (ABC123.addypin.com) and email format (ABC123@addypin.com)
- Static redirect page displaying all 13 map app options instead of auto-redirecting
- Real-time statistics dashboard showing pins created, links clicked, and active countries
- Email integration using Nodemailer (free, no SendGrid dependency)
- Comprehensive analytics tracking with daily reports sent to avoidaccess@msn.com

✅ **Technical Implementation:**
- PostgreSQL database with proper schema for pins, analytics, and daily stats
- Responsive design optimized for mobile, tablet, and desktop
- All 13 map apps integrated: Google Maps, Apple Maps, Waze, HERE WeGo, MapQuest, Maps.me, OpenStreetMap, Bing Maps, TomTom, Citymapper, OsmAnd, Sygic Maps, Badger Maps
- Logo design with traditional pin replacing the "P" in AddyPin
- Clean, lightweight architecture ready for deployment on addypin.com domain

✅ **Privacy & Analytics:**
- No recent pins display for privacy protection
- Analytics capture: OS detection, browser, countries, time spent, pins created, emails sent
- Daily automated reports with comprehensive metrics
- IP geolocation ready for country tracking (placeholder implemented)

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
- **Current State**: Basic user table structure exists but no active authentication
- **Future Ready**: Schema includes user relationships for when authentication is implemented
- **Session Management**: Connect-pg-simple configured for PostgreSQL session storage

## External Dependencies

### Third-Party Services
- **Email Service**: SendGrid for transactional emails with location information and map links
- **Database Hosting**: Neon Database for serverless PostgreSQL hosting
- **Geolocation**: Browser's native geolocation API for initial position detection

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
- **Environment Variables**: DATABASE_URL for database connection, SENDGRID_API_KEY for email service
- **Build Process**: Multi-stage build separating client and server builds
- **Asset Management**: Vite handles static assets with custom alias configuration