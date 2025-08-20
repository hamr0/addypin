# addypin - Compressed replit.md

## Overview
addypin is a modern location sharing service that generates short, memorable links for geographic coordinates. It allows users to pin locations on an interactive map and share them via short URLs (e.g., `ABC123.addypin.com`) or email addresses (e.g., `ABC123@addypin.com`). The application provides seamless redirection to 13+ popular mapping services and includes comprehensive analytics tracking. The business vision is to provide a simple, cost-effective, and robust location sharing solution.

## User Preferences
Preferred communication style: Simple, everyday language.
**Command clarity requirements**: Always specify WHO (you/me), WHERE (VPS/Replit), what to REPLACE (exact tokens/keys), and special instructions.
Project organization: Keep main folder clean - documentation moved to `/docs` folder.
Documentation strategy: Maintain detailed .md files as development journal and troubleshooting knowledge base for complex setups.
**Critical Requirement**: Stop reactive troubleshooting and whack-a-mole fixes. Use systematic E2E architectural analysis for infrastructure issues. No more repetitive log checking without holistic problem understanding.

## System Architecture

### UI/UX Decisions
- **Styling**: Tailwind CSS with shadcn/ui for a consistent, modern UI.
- **Interactive Map**: Leaflet.js provides interactive map functionality with draggable pins.
- **Responsive Design**: Optimized for mobile, tablet, and desktop.
- **Logo Design**: Traditional pin replacing the "P" in AddyPin.
- **User Flow**: Open pin creation without login, optional email storage for permanence, and OTP-based editing for existing pins.
- **Privacy**: No recent pins displayed, analytics are privacy-focused (GDPR compliant).

### Technical Implementations
- **Frontend**: React with TypeScript, using Vite as the build tool.
- **State Management**: TanStack Query (React Query) for server state management and caching.
- **Routing**: Wouter for lightweight client-side routing.
- **Backend**: Node.js with Express.js framework, written in TypeScript with ES modules.
- **API Design**: RESTful API with error handling and logging.
- **Authentication**: Hybrid approach with open creation and OTP verification for editing. Pins without email auto-delete after 72 hours.
- **DDoS Protection**: Multi-layer defense including IP rate limiting (5 pins/day per IP), email limits (5 per email), and advanced bot detection with behavioral analysis.
- **Performance Optimization**: Server-side caching (30 minutes) and client-side optimization (60 minutes) reduce API calls significantly. Smart cache invalidation is implemented.
- **Country Detection**: Comprehensive support for 195+ countries with hierarchical detection.

### Feature Specifications
- **Shortcodes**: 6-character auto-generated shortcodes (ABC123 format).
- **Dual Format Support**: Web links (`ABC123.addypin.com`) and email format (`ABC123@addypin.com`).
- **Interactive Redirect Page**: Includes map view and editing functionality.
- **Real-time Statistics**: Dashboard showing pins created, links clicked, and active countries.
- **Analytics Tracking**: Comprehensive analytics with daily reports, capturing OS, browser, countries, time spent, pins created, and link clicks.
- **Map App Integration**: Integrates with 13+ map apps (Google Maps, Apple Maps, Waze, etc.).

### System Design Choices
- **Database**: PostgreSQL using Drizzle ORM for type-safe operations.
- **Schema**: Dedicated schemas for Pins, Analytics, Daily Stats, and Users.
- **Build System**: Vite for frontend, ESBuild for production builds.
- **Environment Management**: Utilizes environment variables (e.g., `DATABASE_URL`, `RESEND_API_KEY`).
- **Infrastructure**: Relies on a PostgreSQL database, nginx reverse proxy, and SSL certificates.

## External Dependencies

### Third-Party Services
- **Database Hosting**: Neon Database for serverless PostgreSQL hosting.
- **Geolocation**: Browser's native geolocation API.
- **Email Service**: Resend for professional OTP delivery.
- **Analytics**: Umami self-hosted analytics.

### Key Libraries & Tools
- **UI Components**: Radix UI primitives.
- **Form Handling**: React Hook Form with Zod validation.
- **Date Handling**: date-fns.
- **Maps Integration**: Leaflet.js.

### Map Service Integrations
- Google Maps
- Apple Maps
- Waze
- HERE WeGo
- MapQuest
- Maps.me
- OpenStreetMap
- Bing Maps
- TomTom
- Citymapper
- OsmAnd
- Sygic Maps
- Badger Maps