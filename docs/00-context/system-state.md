# System State - Current Architecture

## Technology Stack

### Frontend
| Component | Technology |
|-----------|-----------|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| UI Library | shadcn/ui + Radix UI |
| Styling | Tailwind CSS |
| State | TanStack Query |
| Routing | Wouter |
| Maps | Leaflet.js + OpenStreetMap |
| Forms | React Hook Form + Zod |

### Backend
| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 20 |
| Framework | Express.js |
| Language | TypeScript |
| ORM | Drizzle ORM |
| Email | Resend API |
| Build | ESBuild (`--packages=external`) |

### Infrastructure
| Component | Technology |
|-----------|-----------|
| Hosting | RackNerd VPS ($2/month) |
| Containers | Docker + Docker Compose |
| CI/CD | GitHub Actions (manual trigger) |
| Registry | GitHub Container Registry (GHCR) |
| Web Server | Nginx (reverse proxy + SSL) |
| SSL | Let's Encrypt (auto-renewal) |
| Database | PostgreSQL 15 (containerized) |
| Domain | Namecheap DNS |

## Architecture Diagram

```
User Browser
    │
    ▼
Nginx (Port 80/443, SSL termination)
    │
    ├──▶ Production App (127.0.0.1:3000)
    │      • React + Express in Docker
    │      • Non-root user execution
    │
    ├──▶ Staging App (127.0.0.1:8080)
    │      • Same stack, separate container
    │
    └──▶ PostgreSQL (127.0.0.1:5432)
           • addypin (production DB)
           • addypin_staging (staging DB)
           • Persistent Docker volumes
```

## VPS Layout

```
/opt/
├── addypin/                 # Production
│   ├── docker-compose.yml
│   └── .env
├── addypin-staging/         # Staging
│   ├── docker-compose.yml
│   └── .env
└── addypin-network          # Docker network

/etc/nginx/conf.d/
└── addypin.conf             # Nginx routing
```

## Network & Ports

| Component | Interface | Port | Status |
|-----------|-----------|------|--------|
| Nginx HTTP | 0.0.0.0 | 80 | Redirects to 443 |
| Nginx HTTPS | 0.0.0.0 | 443 | Main entry point |
| PostgreSQL | 127.0.0.1 | 5432 | Localhost only |
| Production App | 127.0.0.1 | 3000 | Via Nginx |
| Staging App | 127.0.0.1 | 8080 | Via Nginx |

## Database Schema

```sql
pins (
  id UUID PRIMARY KEY,
  code VARCHAR(6) UNIQUE,     -- Auto-generated shortcode
  title VARCHAR(100),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  created_by VARCHAR,          -- Email (optional)
  expires_at TIMESTAMP,        -- 72h if no email, null if email provided
  created_at TIMESTAMP
);

analytics (
  id UUID PRIMARY KEY,
  pin_code VARCHAR(6),
  event_type VARCHAR(20),      -- create, click, email_sent, visit
  user_agent TEXT,
  ip VARCHAR,
  country VARCHAR,
  timestamp TIMESTAMP
);

daily_stats (
  date DATE PRIMARY KEY,
  total_pins INTEGER,
  total_clicks INTEGER,
  unique_visitors INTEGER
);

users (
  id UUID PRIMARY KEY,
  username VARCHAR,
  password VARCHAR
);
```

## Key Architectural Decisions

1. **Docker-first**: All deployments containerized (not systemd)
2. **Monolithic container**: Frontend + backend in single container
3. **`--packages=external`**: ESBuild treats all node_modules as external to avoid dynamic require errors
4. **Manual CI/CD triggers**: Prevents accidental production deployments
5. **Dual link format**: Web subdomain + email address for same shortcode
6. **Localhost binding**: All containers bound to 127.0.0.1 only

## Performance Metrics

| Metric | Value |
|--------|-------|
| Deployment Time | ~2 minutes |
| DB Query Response | 3-16ms |
| API Response | <100ms |
| Container Memory | ~65MB |
| Monthly Cost | ~$2.83 |
| Uptime Target | 99.9% |
