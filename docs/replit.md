# Overview

AddyPin is a lightweight, open-source location sharing service that generates short, memorable links for GPS coordinates. Users can create pins by dragging and dropping on an interactive map, then share locations via web links or email-style addresses. The service supports 13+ map applications including Google Maps, Apple Maps, Waze, and HERE WeGo, with real-time analytics tracking usage and engagement. The project's ambition is to provide a fully operational and robust location sharing solution with a bulletproof automated deployment pipeline.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite
- **UI Library**: Shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **Maps**: Leaflet with OpenStreetMap
- **State Management**: TanStack React Query

## Backend Architecture
- **Runtime**: Node.js 20.x with Express server (version locked via .nvmrc)
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful endpoints
- **Architecture Pattern**: Monolithic with separate client/server directories

## Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema**: Optimized for pins (coordinates, shortcodes, metadata) and analytics
- **Connection**: @neondatabase/serverless for cloud connectivity
- **Migrations**: Drizzle Kit

## Authentication & Authorization
- **Provider**: Clerk authentication service
- **Strategy**: JWT-based authentication with user sessions
- **Access Control**: User-based pin ownership and management

## CI/CD and Infrastructure
- **Deployment Method**: Docker-first containerized deployment with systematic validation
- **Root Cause Analysis**: Eliminated dependency drift issues in CI/CD
- **Validation Strategy**: Node.js version locking and dependency integrity checks before build
- **Container Management**: Enhanced cleanup with `docker container prune`
- **Deployment Pipeline**: GitHub Actions → Validation → Docker Build → VPS Container Deploy
- **Hosting**: RackNerd VPS with Docker support
- **Reverse Proxy**: Nginx with Let's Encrypt SSL
- **Monitoring**: Custom health checks

## File Structure
```
addypin/
├── client/src/           # React frontend
│   ├── components/
│   ├── pages/
│   ├── lib/
│   └── hooks/
├── server/              # Express.js backend
│   ├── routes.ts
│   ├── db.ts
│   └── services/
├── shared/
│   └── schema.ts
└── scripts/
```

## Database Schema
```typescript
Tables:
├── users
├── pins
├── analytics
├── daily_stats
└── otp_codes
```

# External Dependencies

- **Email Service**: Resend (for transactional emails and OTP)
- **Map Data**: OpenStreetMap (for base map tiles and geocoding)
- **Authentication**: Clerk (for user management and JWT)
- **Analytics**: Custom implementation with Umami tracking
- **VPS Hosting**: RackNerd
- **CI/CD**: GitHub Actions