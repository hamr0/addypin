# Overview

AddyPin is a lightweight, open-source location sharing service that generates short, memorable links for GPS coordinates. Users can create pins by dragging and dropping on an interactive map, then share locations via web links (`ABC123.addypin.com`) or email-style addresses. The service supports 13+ map applications including Google Maps, Apple Maps, Waze, and HERE WeGo, with real-time analytics tracking usage and engagement.

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
- **Hosting**: Designed for VPS deployment with Docker containerization
- **CI/CD**: GitHub Actions for automated deployment pipeline

The application follows a modern full-stack architecture with clear separation between frontend and backend concerns, emphasizing performance, scalability, and ease of deployment across different environments.