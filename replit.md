# Overview

AddyPin is a lightweight, open-source location sharing service that generates short, memorable links for GPS coordinates. Users can create pins by dragging and dropping on an interactive map, then share locations via web links (`ABC123.addypin.com`) or email-style addresses. The service supports 13+ map applications including Google Maps, Apple Maps, Waze, and HERE WeGo, with real-time analytics tracking usage and engagement.

## 🚀 Current Status: RECOVERY IN PROGRESS ⚠️
- **Live Production**: https://addypin.com (static site operational)
- **API Status**: Container restart loop - DATABASE_URL environment variable issue
- **Last Working**: August 24, 2025 - Health check returned `{"status":"healthy"}`
- **Recovery Phase**: Environment cleanup and container recreation
- **Issue**: Missing database tables + environment variable injection

## 📊 Deployment Status Timeline
- **August 23, 2025**: CI/CD marked operational ✅
- **August 24, 2025**: Production API failure detected 
- **Current**: Systematic recovery using proven working configuration

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **Maps**: Leaflet with OpenStreetMap for interactive map functionality
- **State Management**: TanStack React Query for server state management
- **Deployment**: Static build served via Nginx in containerized environment

### Backend Architecture
- **Runtime**: Node.js with Express server
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful endpoints for pin creation, retrieval, and analytics
- **Architecture Pattern**: Monolithic structure with separate client/server directories
- **Development**: Hot reloading via Vite in development mode
- **Production**: Compiled JavaScript served from single Express instance

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema**: Optimized for pins (coordinates, shortcodes, metadata) and analytics
- **Connection**: @neondatabase/serverless for cloud database connectivity
- **Migrations**: Drizzle Kit for database schema management

### Authentication & Authorization
- **Provider**: Clerk authentication service integration
- **Strategy**: JWT-based authentication with user sessions
- **Access Control**: User-based pin ownership and management

### External Dependencies
- **Email Service**: SendGrid for email-based location sharing
- **Map Data**: OpenStreetMap for base map tiles and geocoding
- **Analytics**: Custom analytics tracking for pin usage and click metrics
- **Hosting**: VPS deployment with Docker containerization
- **CI/CD**: GitHub Actions Docker-first automated deployment pipeline

### CI/CD Deployment Architecture
- **Deployment Method**: Docker-first containerized deployment
- **Build Strategy**: `--packages=external` to prevent node_modules bundling issues
- **Container Management**: Docker containers replace systemd services
- **Deployment Pipeline**: GitHub Actions → Docker Build → VPS Container Deploy
- **Key Innovation**: Single source of truth build process eliminates environment mismatches
- **Recovery**: Container-based rollback using previous Docker images

The application follows a modern full-stack architecture with clear separation between frontend and backend concerns, emphasizing performance, scalability, and bulletproof automated deployment.

---

# 🏗️ HIGH LEVEL ARCHITECTURE (HLA)

## System Overview
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Development   │───▶│   CI/CD Pipeline  │───▶│   Production    │
│   (Replit)      │    │  (GitHub Actions) │    │     (VPS)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
│                                                │
├─ React + Vite                                 ├─ Docker Container
├─ TypeScript                                   ├─ PostgreSQL DB
├─ Drizzle ORM                                  ├─ Nginx Proxy
└─ Hot Reload                                   └─ Let's Encrypt SSL

External Services:
┌─────────────┐  ┌──────────────┐  ┌─────────────────┐
│    Clerk    │  │   Resend     │  │  OpenStreetMap  │
│  (Auth)     │  │  (Email)     │  │    (Maps)       │
└─────────────┘  └──────────────┘  └─────────────────┘
```

## Infrastructure Layer
- **Hosting**: RackNerd VPS (155.94.144.191)
- **OS**: Linux/NixOS with Docker support
- **Reverse Proxy**: Nginx with Let's Encrypt SSL
- **Database**: PostgreSQL 13+ with pgcrypto extension
- **Container**: Docker with multi-stage build
- **Monitoring**: Custom health checks + cron-based system monitoring

## Network Architecture
```
Internet ──▶ nginx:443 ──▶ Docker:3000 ──▶ PostgreSQL:5432
           (SSL/TLS)     (Container)      (Database)
                            │
                            └─▶ External APIs
                                ├─ Resend (Email)
                                ├─ Clerk (Auth)  
                                └─ OpenStreetMap
```

---

# 🔧 HIGH LEVEL DESIGN (HLD)

## Development Environment (Replit)
### File Structure
```
addypin/
├── client/src/           # React frontend
│   ├── components/       # Reusable UI components
│   ├── pages/           # Route-based page components
│   ├── lib/             # Utilities and configurations
│   └── hooks/           # Custom React hooks
├── server/              # Express.js backend
│   ├── routes.ts        # API endpoint definitions
│   ├── db.ts           # Database connection
│   └── services/       # Business logic modules
├── shared/
│   └── schema.ts       # Drizzle ORM database schema
└── scripts/            # Deployment and utility scripts
```

### Database Schema (Drizzle ORM)
```typescript
Tables:
├── users           # User authentication records
├── pins            # Location pins with coordinates
├── analytics       # Usage tracking and metrics  
├── daily_stats     # Aggregated daily statistics
└── otp_codes       # Email verification codes
```

### Development Workflow
1. **Code in Replit**: Hot reload + integrated database
2. **Test locally**: Health checks + API validation
3. **Push to GitHub**: Automated CI/CD trigger
4. **Deploy to VPS**: Docker build + container restart

## Production Environment (VPS)
### Container Configuration
```yaml
Environment Variables (Required):
├── DATABASE_URL: postgresql://addypin_user:secure_password_123@172.17.0.1:5432/addypin
├── RESEND_API_KEY: Email service authentication
├── UMAMI_APP_SECRET: Analytics secret key
├── UMAMI_HASH_SALT: Analytics salt
├── GOOGLE_MAPS_API_KEY: Maps service key
└── NODE_ENV: production
```

### Port Mapping
- **Development**: Application serves on port 5000
- **Production**: Container maps 3000:5000 for external access
- **Database**: PostgreSQL on 172.17.0.1:5432 (Docker bridge)

### Database Connection Architecture
```
Application Container          PostgreSQL Service
┌─────────────────────┐       ┌─────────────────────┐
│ Node.js:5000        │────▶  │ PostgreSQL:5432     │
│ Internal Port       │       │ Bridge IP:          │
│                     │       │ 172.17.0.1          │
└─────────────────────┘       └─────────────────────┘
         │                              │
         │                              │
    Docker Bridge Network               │
         │                              │
         └──── Host:3000 ◄──────────────┘
```

---

# 🛠️ COMPLETE PRODUCT STACK

## Frontend Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 4.x with hot module replacement
- **UI Framework**: Shadcn/ui + Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack React Query v5 
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React + React Icons
- **Maps**: Leaflet with OpenStreetMap tiles
- **Routing**: Wouter (lightweight client-side routing)

## Backend Stack  
- **Runtime**: Node.js 20.x with ESM modules
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL driver
- **Database**: PostgreSQL 13+ with pgcrypto extension
- **Authentication**: Clerk SDK integration
- **Email Service**: Resend API for transactional emails
- **Analytics**: Custom tracking with Umami integration
- **Validation**: Zod schemas with drizzle-zod integration

## DevOps & Infrastructure
- **Development**: Replit workspace with integrated database
- **Version Control**: GitHub with automated workflows
- **CI/CD**: GitHub Actions with Docker builds
- **Container**: Docker with multi-stage Node.js builds
- **Hosting**: RackNerd VPS (1GB RAM, 1 vCPU)
- **Web Server**: Nginx reverse proxy
- **SSL**: Let's Encrypt with automatic renewal
- **Database**: PostgreSQL with connection pooling
- **Monitoring**: Custom health checks + system monitoring

## External Services
- **Authentication**: Clerk (user management + JWT)
- **Email**: Resend (transactional emails + OTP)
- **Maps**: OpenStreetMap (free tile service)
- **Analytics**: Custom implementation with Umami tracking
- **Geocoding**: Built-in coordinate-to-address conversion

---

# 🚨 CURRENT ISSUES & RECOVERY PLAN

## Identified Problems (August 24, 2025)
1. **Environment Variables**: Docker container missing required environment variables
2. **Database Schema**: Missing tables in production PostgreSQL
3. **Container Restart Loop**: App crashes due to missing DATABASE_URL
4. **Port Configuration**: Development vs production port mapping issues

## Proven Working Configuration
**Evidence**: Health check returned `{"status":"healthy","timestamp":"2025-08-24T19:29:49.926Z"}`

**Working Container Command**:
```bash
docker run -d \
  --name addypin \
  --restart unless-stopped \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://addypin_user:secure_password_123@172.17.0.1:5432/addypin" \
  -e RESEND_API_KEY="$(grep RESEND_API_KEY /opt/addypin/.env | cut -d'=' -f2)" \
  -e UMAMI_APP_SECRET="$(grep UMAMI_APP_SECRET /opt/addypin/.env | cut -d'=' -f2)" \
  -e UMAMI_HASH_SALT="$(grep UMAMI_HASH_SALT /opt/addypin/.env | cut -d'=' -f2)" \
  -e GOOGLE_MAPS_API_KEY="$(grep GOOGLE_MAPS_API_KEY /opt/addypin/.env | cut -d'=' -f2)" \
  -e NODE_ENV="production" \
  addypin:latest
```

## Recovery Phases
1. **Environment Cleanup**: Remove broken containers
2. **Container Recreation**: Use proven working configuration  
3. **Health Verification**: Confirm API responds correctly
4. **Database Schema**: Deploy missing tables from development
5. **Functionality Test**: Verify pin creation, maps, analytics
6. **Monitoring Setup**: Ensure persistent operation

## Database Schema Requirements
```sql
Required Tables:
├── users (id, username, password)
├── pins (id, shortcode, latitude, longitude, created_at, user_email, ...)
├── analytics (id, pin_id, event_type, timestamp, metadata, ...)
├── daily_stats (id, date, pins_created, links_clicked, ...)  
└── otp_codes (id, email, code, expires_at, used, ...)
```

The application follows a modern full-stack architecture with clear separation between frontend and backend concerns, emphasizing performance, scalability, and bulletproof automated deployment.