# Overview

This is a full-stack location sharing application called AddyPin, built using a modern web development stack. The application allows users to create pins on a map with shareable links, similar to location sharing services. It's designed to run in a containerized environment with PostgreSQL as the primary database.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Extensive use of Radix UI components for accessibility and consistency
- **Styling**: Tailwind CSS with shadcn/ui component library for design system
- **State Management**: TanStack Query for server state management
- **Authentication**: Clerk for user authentication (though may be optional based on configuration)
- **Build Tool**: Vite with custom configuration for development and production builds

## Backend Architecture
- **Runtime**: Node.js with TypeScript using ESM modules
- **Framework**: Express.js for API server
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Database Migrations**: Drizzle Kit for schema management
- **Development**: Uses tsx for TypeScript execution in development
- **Production**: Builds to optimized JavaScript bundle using esbuild

## Database Design
- **Primary Database**: PostgreSQL with UUID-based primary keys
- **Schema Management**: Centralized in `shared/schema.ts` using Drizzle ORM
- **Key Tables**: 
  - Users table for authentication
  - Pins table for location data with latitude/longitude coordinates
- **Extensions**: Uses pgcrypto extension for UUID generation

## Development Environment
- **Monorepo Structure**: Client and server code in separate directories with shared schema
- **Path Aliases**: Configured for clean imports (@/, @shared/, @assets/)
- **Hot Reload**: Vite dev server with HMR for frontend development
- **Type Safety**: Full TypeScript coverage across frontend, backend, and shared code

## Production Architecture
- **Containerization**: Docker-based deployment with multi-stage builds
- **Static Serving**: Production frontend built as static assets served by nginx
- **Process Management**: Single Node.js process serving both API and static files
- **Port Configuration**: Configurable port (defaults to 5000) for unified serving

# External Dependencies

## Core Infrastructure
- **Database**: PostgreSQL (Neon serverless or local instance)
- **Container Runtime**: Docker for application packaging and deployment
- **Web Server**: nginx for static file serving in production

## Authentication & Communication
- **Clerk**: User authentication service (optional based on configuration)
- **Email Services**: 
  - SendGrid for transactional email
  - Resend as alternative email provider
  - React Email for email template rendering

## Development Tools
- **Package Manager**: npm with lock file for dependency consistency
- **Build Tools**: 
  - Vite for frontend bundling
  - esbuild for backend bundling
  - PostCSS for CSS processing
- **Code Quality**: TypeScript for type safety across the entire stack

## Third-Party Libraries
- **UI Framework**: Extensive Radix UI component ecosystem
- **Styling**: Tailwind CSS with typography plugin
- **Forms**: React Hook Form with Zod validation resolvers
- **Maps**: Leaflet for interactive mapping functionality
- **State Management**: TanStack React Query for API state management

## Development Environment
- **Replit Integration**: Special Vite plugins for Replit development environment
- **Error Handling**: Runtime error modal for development debugging
- **Hot Reload**: Cartographer plugin for enhanced development experience