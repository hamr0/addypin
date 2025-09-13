# Overview

This is a full-stack location sharing application called AddyPin, built using a modern web development stack. The application allows users to create pins on a map with shareable links, similar to location sharing services. It's designed to run in a containerized environment with PostgreSQL as the primary database and professional CI/CD deployment pipeline.

# Recent Changes

## September 13, 2025 - MSMTP Email System Implementation & Complete Infrastructure Transition ✅
- **MSMTP EMAIL SYSTEM COMPLETE**: Full transition from Resend API to reliable MSMTP Gmail SMTP system
- **Live Monitoring**: Enhanced health checks with MSMTP email alerts (every 10 minutes) - critical/warning alerts automatically sent
- **Backup Email Integration**: Foundation backup system converted to MSMTP (bi-weekly Sunday 2:00 AM) with professional HTML notifications
- **Email Infrastructure**: Gmail SMTP via MSMTP with App Password authentication, secure configuration at `/root/.msmtprc` (600 permissions)
- **Health Script Locations**: `/opt/addypin/scripts/enhanced-health-check.sh` (MSMTP), `/opt/addypin/scripts/send-health-alert.sh`, `/opt/addypin/health-manager.sh`
- **Backup Script Locations**: `/opt/addypin-foundation-backup/scripts/backup-foundation-msmtp.sh` (new MSMTP version), automated cron scheduling
- **Email Recipient**: All infrastructure alerts sent to `avoidaccess@gmail.com` with professional HTML formatting
- **System Integration**: Complete replacement of Resend API dependencies with proven MSMTP solution based on working Terribic implementation
- **Automation Status**: Live monitoring (*/10 * * * *), backup automation (0 2 * * 0), both using MSMTP email alerts
- **Production Stability**: SSL encryption maintained, all monitoring active, email notifications 100% operational

## September 10, 2025 - PHASE 5 COMPLETE
- **Infrastructure Security Hardening & Monitoring with Production Stability**: ✅
- **Container Security**: Localhost-only port bindings (127.0.0.1) for all containers
- **Docker Image Management**: Automated cleanup preventing disk space accumulation
- **Production Stability**: Fixed vite dependency issue causing container crashes
- **Environment Standardization**: All 8 required API keys configured in production
- **Security Verification**: External direct access blocked, Nginx-only routing confirmed
- **GHCR Authentication**: Fixed container registry access with proper token permissions
- **VPS Health Monitoring**: Automated 5-minute health checks (`*/5 * * * * /opt/infra-health-check.sh`)
- **Service Auto-Recovery**: Nginx automatic restart capability with comprehensive logging
- **Monitoring Logs**: Complete audit trail at `/var/log/infra-health-check.log` with 7-day rotation
- **Operations Commands**: `sudo /opt/infra-health-check.sh` manual verification, `sudo tail -f /var/log/infra-health-check.log` live monitoring
- **Infrastructure Hardening**: Complete security posture with automated operations and proactive monitoring

## September 10, 2025 (Phase 4)
- **PHASE 4 COMPLETE**: Professional CI/CD Pipeline Implementation with GitHub Actions ✅
- **Docker Multi-Stage Builds**: Optimized production images with security-first non-root execution
- **GitHub Container Registry**: Automated image builds and versioning with GHCR integration
- **SSH Automation**: Ed25519 key authentication for secure VPS deployments
- **Manual Approval Gates**: Production deployment safety with workflow_dispatch triggers
- **Health Verification**: Automated deployment validation with rollback capability
- **Permission Resolution**: Fixed Docker build issues with proper root/non-root user handling
- **Environment Isolation**: Separate staging and production deployment workflows
- **Zero-Downtime Deployments**: Health check verification ensuring service continuity
- **Security Hardening**: Container security with minimal attack surface and encrypted credentials

## August 31, 2025
- **Critical Nginx Fix**: Resolved API routing issue by removing separate `/api/` location block that was routing to wrong port (5000 instead of 3000)
- **CI/CD Anti-Bot Fix**: Added browser user-agent headers to curl commands in GitHub Actions to bypass rate limiting middleware
- **Rate Limiting Delays**: Increased health check delays from 2 to 5 seconds to prevent 429 errors during deployment
- **Documentation Updates**: Comprehensive updates to HLD and REPLIT_AGENT_LEARNING with containerization challenges and solutions
- **Production Status**: All API endpoints fully accessible, deployment pipeline working at 100% success rate
- **Subdomain Support Fixed**: Added client-side detection for subdomain access (e.g., trzlua.addypin.com) with automatic routing to pin display page
- **Map Links Fix**: Fixed map application links to properly open in new browser windows/tabs instead of same window
- **UI Improvements**: Converted Button components to direct anchor tags for better link handling and target="_blank" support

## January 28, 2025
- **Critical CI/CD Fix**: Fixed health check timeout in GitHub Actions workflow (.github/workflows/fixed-deploy-cd.yml)
- **Documentation Update**: Updated High Level Design (HLD) with comprehensive Docker containerization architecture details
- **Deployment Status**: Docker containerization fully functional - 100% deployment success rate with 2-minute automated deployments
- **Container Breakthrough**: Successfully resolved npm cache and wget health check issues preventing reliable deployments
- **Architecture Enhancement**: Added detailed before/after comparison showing evolution from manual 50% success deployments to automated 100% success Docker deployments

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
- **Runtime**: Node.js 20 with TypeScript using ESM modules
- **Framework**: Express.js for API server
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Database Migrations**: Drizzle Kit for schema management
- **Development**: Uses tsx for TypeScript execution in development
- **Production**: Builds to optimized JavaScript bundle using esbuild

## Database Design
- **Primary Database**: PostgreSQL 10.23 (Native Installation with SSL Encryption) with UUID-based primary keys
- **Connection Architecture**: Containers connect via `host.docker.internal:5432` with `sslmode=require` for encrypted communications
- **SSL Configuration**: Full encryption enabled with certificates at `/var/lib/pgsql/data/ssl/` (server.crt, server.key)
- **Authentication**: pg_hba.conf configured for `hostssl` connections with scram-sha-256 authentication
- **Schema Management**: Centralized in `shared/schema.ts` using Drizzle ORM
- **Key Tables**: 
  - Users table for authentication
  - Pins table for location data with latitude/longitude coordinates
- **Extensions**: Uses pgcrypto extension for UUID generation
- **Environment Isolation**: Separate production (`addypin`) and staging (`addypin_staging`) databases with identical SSL setup
- **Performance**: Sub-20ms database response times maintained with SSL encryption (11ms production, 19ms staging)

## Development Environment
- **Monorepo Structure**: Client and server code in separate directories with shared schema
- **Path Aliases**: Configured for clean imports (@/, @shared/, @assets/)
- **Hot Reload**: Vite dev server with HMR for frontend development
- **Type Safety**: Full TypeScript coverage across frontend, backend, and shared code

## Production Architecture
- **Containerization**: Docker-first deployment with Alpine Linux base (Node.js 20) for application services
- **Database Architecture**: Native PostgreSQL 10.23 installation with SSL encryption (not containerized)
- **Multi-stage Builds**: Optimized production images with security-first non-root execution
- **Container Orchestration**: Docker Compose with automated health checks and restart policies
- **Database Connectivity**: Application containers connect to native PostgreSQL via `host.docker.internal:5432` with SSL encryption
- **Health Monitoring**: Enhanced automated health checks with MSMTP email alerting via Gmail SMTP
- **Port Configuration**: Localhost-only binding (127.0.0.1:3000 production, 127.0.0.1:8080 staging)
- **Image Management**: GitHub Container Registry with tagged releases and automated cleanup (optimized from 53% to 51% disk usage)
- **SSL Security**: Enterprise-grade encryption for all database communications with certificate management
- **Environment Isolation**: Complete dependency containerization with security hardening and consistent SSL configuration
- **CI/CD Pipeline**: Professional GitHub Actions with manual approval gates and automated deployments
- **Security Posture**: External access blocked, internal routing secured, all environments standardized with SSL encryption

## CI/CD Infrastructure
- **Build System**: GitHub Actions with Node.js 20 and multi-stage Docker builds
- **Container Registry**: GitHub Container Registry (GHCR) with automated image versioning
- **Deployment**: SSH-based VPS deployments with Ed25519 key authentication
- **Security**: Manual approval gates, localhost-only containers, encrypted credentials
- **Monitoring**: Automated health verification with deployment rollback capability
- **Workflows**: Separate staging and production pipelines with environment isolation
- **Image Cleanup**: Automated Docker cleanup preventing disk space accumulation
- **Production Stability**: Container crash issues resolved with proper dependency management

# External Dependencies

## Core Infrastructure
- **Database**: PostgreSQL 10.23 (Native Installation with SSL Encryption)
- **Container Runtime**: Docker for application packaging and deployment
- **Web Server**: nginx for static file serving and reverse proxy in production
- **Container Registry**: GitHub Container Registry for image storage and distribution

## CI/CD & DevOps
- **CI/CD Platform**: GitHub Actions with automated workflows
- **SSH Authentication**: Ed25519 keys for secure VPS access
- **Health Monitoring**: Enhanced automated health checks with email alerting and system health checks
- **Email Integration**: MSMTP Gmail SMTP system for automated infrastructure alerts and notifications (replaced Resend API)
- **Image Management**: Automated builds, versioning, and registry management

## Authentication & Communication
- **Clerk**: User authentication service (optional based on configuration)
- **Email Services**: 
  - MSMTP for infrastructure monitoring and backup alerts (primary)
  - SendGrid for transactional email (application level)
  - React Email for email template rendering (application level)
  - Gmail SMTP for all VPS infrastructure notifications

## MSMTP Email System
- **SMTP Provider**: Gmail SMTP (smtp.gmail.com:587) with TLS encryption
- **Authentication**: Gmail App Password (16-character) with 2FA requirement
- **Configuration**: `/root/.msmtprc` with 600 permissions for security
- **Email Format**: Professional HTML-formatted alerts with AddyPin branding
- **Recipients**: `avoidaccess@gmail.com` for all infrastructure notifications
- **Integration**: Direct msmtp command usage bypassing mail client compatibility issues
- **Script Locations**:
  - Health Manager: `/opt/addypin/health-manager.sh`
  - Email Alerts: `/opt/addypin/scripts/send-health-alert.sh`
  - Enhanced Health Check: `/opt/addypin/scripts/enhanced-health-check.sh`
  - MSMTP Backup: `/opt/addypin-foundation-backup/scripts/backup-foundation-msmtp.sh`

## Automated Monitoring Schedule
- **Live Health Monitoring**: Every 10 minutes via cron (`*/10 * * * * /opt/addypin/scripts/enhanced-health-check.sh`)
- **Foundation Backup**: Bi-weekly Sundays at 2:00 AM via cron (`0 2 * * 0 backup-foundation-msmtp.sh --auto --biweekly`)
- **Email Alerts**: Automatic notifications for critical issues, warnings, and backup completion
- **Manual Commands**:
  - Test email: `/opt/addypin/health-manager.sh test-email`
  - Manual alert: `/opt/addypin/health-manager.sh alert 'message'`
  - Manual backup: `/opt/addypin-foundation-backup/scripts/backup-foundation-msmtp.sh --auto`
  - Health status: `/opt/addypin/health-manager.sh status`

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