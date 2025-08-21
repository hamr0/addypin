# AddyPin - High Level Design (HLD)

## System Overview

AddyPin is a location sharing service that transforms GPS coordinates into short, memorable links. Users can create pins on an interactive map and share them via dual formats: web links (`ABC123.addypin.com`) or email addresses (`ABC123@addypin.com`).

## Technology Stack

### **Frontend Layer**
```
┌─────────────────────────────────────────────────────┐
│                Frontend Stack                        │
├─────────────────────────────────────────────────────┤
│ Framework:     React 18 + TypeScript               │
│ Build Tool:    Vite (Lightning fast dev server)    │
│ UI Library:    shadcn/ui + Radix UI primitives     │
│ Styling:       Tailwind CSS (Utility-first)        │
│ State Mgmt:    TanStack Query (Server state)       │
│ Routing:       Wouter (Lightweight client routing) │
│ Maps:          Leaflet.js + OpenStreetMap          │
│ Forms:         React Hook Form + Zod validation    │
│ Icons:         Lucide React                        │
└─────────────────────────────────────────────────────┘
```

### **Backend Layer**
```
┌─────────────────────────────────────────────────────┐
│                Backend Stack                         │
├─────────────────────────────────────────────────────┤
│ Runtime:       Node.js (Latest LTS)                │
│ Framework:     Express.js (RESTful API)            │
│ Language:      TypeScript (Type safety)            │
│ Database ORM:  Drizzle ORM (Type-safe queries)     │
│ Email API:     Resend (Reliable delivery)          │
│ Build:         ESBuild (Fast compilation)          │
│ Dev Server:    TSX (TypeScript execution)          │
└─────────────────────────────────────────────────────┘
```

### **Database Layer**
```
┌─────────────────────────────────────────────────────┐
│                Database Stack                        │
├─────────────────────────────────────────────────────┤
│ Database:      PostgreSQL 15+                      │
│ Dev Hosting:   Neon Database (Serverless)          │
│ Prod Hosting:  Self-hosted on VPS                  │
│ Schema:        Drizzle ORM migrations              │
│ Connection:    Connection pooling enabled          │
└─────────────────────────────────────────────────────┘
```

### **Infrastructure Layer**
```
┌─────────────────────────────────────────────────────┐
│              Infrastructure Stack                   │
├─────────────────────────────────────────────────────┤
│ Development:   Replit Cloud IDE                     │
│ Version Ctrl:  Git + GitHub (Private repo)         │
│ Production:    RackNerd VPS ($2/month)             │
│ Web Server:    Nginx (Reverse proxy + SSL)         │
│ SSL Certs:     Let's Encrypt (Auto-renewal)        │
│ Process Mgmt:  systemd (Service management)        │
│ Domain:        Namecheap DNS management             │
└─────────────────────────────────────────────────────┘
```

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                           │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   Browser   │    │   Mobile    │    │   Desktop   │        │
│  │  (Chrome,   │    │   Safari    │    │   Firefox   │        │
│  │  Firefox)   │    │   Chrome    │    │   Edge      │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      WEB SERVER LAYER                          │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │    Nginx    │ ──▶│     SSL     │ ──▶│   Domain    │        │
│  │ (Port 80/   │    │ Let's       │    │ addypin.com │        │
│  │   443)      │    │ Encrypt     │    │             │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                           │
│                                                                 │
│  ┌─────────────────┐         ┌─────────────────┐              │
│  │  Frontend App   │         │  Backend API    │              │
│  │                 │         │                 │              │
│  │ • React/TS      │ ◄─────► │ • Node.js/TS    │              │
│  │ • Leaflet Maps  │         │ • Express.js    │              │
│  │ • TailwindCSS   │         │ • RESTful API   │              │
│  │ • shadcn/ui     │         │ • Rate Limiting │              │
│  └─────────────────┘         └─────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │ PostgreSQL  │    │   Resend    │    │  External   │        │
│  │             │    │    API      │    │ Map APIs    │        │
│  │ • pins      │    │ • OTP Email │    │ • Google    │        │
│  │ • analytics │    │ • Branded   │    │ • Apple     │        │
│  │ • daily_stats│    │   Templates │    │ • Waze +10  │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components Deep Dive

### **1. Frontend Architecture**

**Component Structure:**
```
src/
├── components/
│   ├── ui/           # shadcn/ui components
│   ├── map/          # Leaflet map components
│   ├── forms/        # Form components with validation
│   └── analytics/    # Dashboard components
├── pages/
│   ├── Home.tsx      # Main pin creation interface
│   ├── Pin.tsx       # Pin viewing/editing page
│   └── Analytics.tsx # Statistics dashboard
├── lib/
│   ├── queryClient.ts # TanStack Query setup
│   ├── utils.ts      # Utility functions
│   └── validation.ts # Zod schemas
└── hooks/           # Custom React hooks
```

**Key Technologies:**
- **React 18**: Component-based UI with hooks
- **TypeScript**: Full type safety across components
- **Vite**: Lightning-fast dev server and optimized builds
- **Tailwind CSS**: Utility-first styling with responsive design
- **shadcn/ui**: Pre-built accessible components
- **Leaflet.js**: Interactive maps with drag-and-drop pins

### **2. Backend Architecture**

**API Structure:**
```
server/
├── routes.ts         # Express route definitions
├── storage.ts        # Database interface layer
├── middleware/       # Custom middleware
│   ├── auth.ts       # OTP authentication
│   ├── rateLimit.ts  # IP-based rate limiting
│   └── logging.ts    # Request/response logging
└── services/
    ├── email.ts      # Resend email service
    ├── analytics.ts  # Usage tracking
    └── mapLinks.ts   # Map app URL generation
```

**Key Technologies:**
- **Node.js**: JavaScript runtime with excellent performance
- **Express.js**: Minimal and flexible web application framework
- **TypeScript**: Type safety for API endpoints and data models
- **Drizzle ORM**: Type-safe database queries and migrations

### **3. Database Design**

**Schema Structure:**
```sql
-- Core pins table
CREATE TABLE pins (
    id SERIAL PRIMARY KEY,
    shortcode VARCHAR(6) UNIQUE NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- Analytics tracking
CREATE TABLE analytics (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    shortcode VARCHAR(6),
    country VARCHAR(2),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Daily statistics
CREATE TABLE daily_stats (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    pins_created INTEGER DEFAULT 0,
    links_clicked INTEGER DEFAULT 0,
    countries_active INTEGER DEFAULT 0
);
```

**Key Features:**
- **PostgreSQL**: ACID compliance and excellent performance
- **Drizzle ORM**: Type-safe queries with TypeScript integration
- **Indexed columns**: Fast lookups on shortcodes and timestamps
- **Automatic cleanup**: Expired pins removed via scheduled tasks

## External Integrations

### **Map Services Integration**
```typescript
const mapApps = {
  'Google Maps': `https://www.google.com/maps?q=${lat},${lng}`,
  'Apple Maps': `http://maps.apple.com/?q=${lat},${lng}`,
  'Waze': `https://waze.com/ul?q=${lat},${lng}`,
  // ... 10 more services
};
```

### **Email Service (Resend)**
```typescript
const emailConfig = {
  provider: 'Resend',
  apiKey: process.env.RESEND_API_KEY,
  domain: 'addypin.com',
  features: ['OTP delivery', 'Branded templates', 'Analytics']
};
```

## Security Architecture

### **Rate Limiting Strategy**
```
IP-based Protection:
├── Pin Creation: 5 per hour, 15 per day
├── API Requests: 100 per 15 minutes
├── OTP Requests: 3 per hour
└── Bot Detection: User agent analysis + honeypots
```

### **Data Protection**
- **No personal data storage** beyond optional email addresses
- **72-hour auto-expiry** for pins without email association
- **Environment variable security** for API keys
- **HTTPS enforcement** with SSL certificates

## Deployment Architecture

### **Development Environment**
```
Replit Cloud IDE:
├── Live development server (localhost:5000)
├── Hot module replacement via Vite
├── Development database (Neon)
├── Real-time collaboration
└── Git integration
```

### **Production Environment**
```
RackNerd VPS ($2/month):
├── CentOS/AlmaLinux OS
├── Nginx reverse proxy (Port 80/443)
├── Node.js application (Port 3000)
├── PostgreSQL database (Local)
├── systemd service management
├── Let's Encrypt SSL certificates
└── Automated backup system
```

## Performance Characteristics

### **Frontend Performance**
- **Bundle Size**: ~623KB optimized production build
- **Load Time**: <2 seconds on 3G connections
- **Map Rendering**: <500ms initial load
- **Mobile Responsive**: Optimized for all screen sizes

### **Backend Performance**
- **Memory Usage**: 65.1MB in production
- **Response Time**: <100ms for pin operations
- **Database Queries**: <50ms average query time
- **Rate Limiting**: Protects against abuse

### **Infrastructure Performance**
- **Uptime**: 99.9% target with systemd auto-restart
- **SSL Performance**: A+ rating on SSL Labs
- **CDN Ready**: Static assets optimized for CDN delivery

## Cost Analysis

### **Total Monthly Costs**
```
Infrastructure:
├── VPS Hosting (RackNerd): $2.00/month
├── Domain (annual): ~$0.83/month
├── SSL Certificates: $0.00 (Let's Encrypt)
├── Email Service (Resend): $0.00 (free tier)
└── Development (Replit): $0.00 (free tier)

Total: ~$2.83/month ($34/year)
Savings vs Cloud: 92.75% ($222.60/year → $34/year)
```

## Scalability Considerations

### **Horizontal Scaling Options**
- **Multiple VPS instances** with load balancer
- **CDN integration** for global asset delivery
- **Database replication** for read scaling
- **Microservices split** for component scaling

### **Vertical Scaling Limits**
- **Current VPS**: 1 CPU, 1GB RAM, 25GB SSD
- **Upgrade Path**: More powerful VPS instances available
- **Memory Usage**: Currently using ~6.5% of available RAM

This High Level Design provides a comprehensive overview of AddyPin's technology stack, demonstrating how modern web technologies combine to create a cost-effective, scalable location sharing service.