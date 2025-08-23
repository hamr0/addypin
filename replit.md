# Overview

AddyPin is a lightweight, open-source location sharing service that generates short, memorable links for GPS coordinates. Users can create pins by dragging and dropping on an interactive map, then share locations via web links (`ABC123.addypin.com`) or email-style addresses. The service supports 13+ map applications including Google Maps, Apple Maps, Waze, and HERE WeGo, with real-time analytics tracking usage and engagement.

## 🚀 CI/CD Status: OPERATIONAL ✅
- **Live Production**: https://addypin.com  
- **Deployment Time**: 2 minutes automated
- **Success Rate**: 100% reliable
- **Last Updated**: August 23, 2025

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