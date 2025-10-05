# AddyPin Development Guide

## 🚀 Quick Start

### Start Development
```bash
./dev.sh
```

**This automatically:**
1. Establishes SSH tunnel to VPS PostgreSQL
2. Installs dependencies (if needed)
3. Starts dev server on **http://localhost:5000**

### Stop Development
```bash
./dev-stop.sh
```

Or press `Ctrl+C` in the terminal running dev.sh

---

## 🌐 Local URLs

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5000 | React app with Vite hot reload |
| **Health Check** | http://localhost:5000/api/health | Server health status |
| **Stats** | http://localhost:5000/api/stats | Analytics dashboard data |
| **System Info** | http://localhost:5000/api/health/system | Detailed system info |

### Available API Endpoints

**Pins:**
- `POST /api/pins` - Create new pin
- `GET /api/pins/:shortcode` - Get pin by shortcode (e.g., `/api/pins/ABC123`)
- `PATCH /api/pins/:shortcode` - Update pin
- `DELETE /api/pins/:shortcode` - Delete pin
- `GET /api/user/pins/:email` - Get all pins for email

**Map Services:**
- `GET /api/map-links/:lat/:lng` - Get all map app links
- `POST /api/map-click` - Track map app click

**OTP (One-Time Password):**
- `POST /api/otp/send` - Send OTP email
- `POST /api/otp/verify` - Verify OTP code

**Analytics:**
- `GET /api/stats` - Dashboard statistics
- `GET /api/analytics/batch-status` - Analytics batch queue status
- `GET /api/analytics/comprehensive` - Comprehensive analytics

**Security:**
- `GET /api/security/stats` - Security event statistics

**Other:**
- `POST /api/contact` - Contact form
- `POST /api/email-autorespond` - Email autoresponder
- `GET /:shortcode` - Redirect to pin location (e.g., `/ABC123`)

---

## 🗄️ Database Connection

**Local development uses VPS PostgreSQL via SSH tunnel:**

- **VPS**: 155.94.144.191:5432
- **Local Tunnel**: localhost:5432
- **Database**: addypin_dev
- **User**: addypin_user

**Connection string (in .env):**
```bash
DATABASE_URL=postgresql://addypin_user:UBih+0YllInCRul3liIlMXHiezktiq8vGXbZ9CiAljA=@localhost:5432/addypin_dev
```

---

## 📁 Project Structure

```
addypin/
├── client/src/           # Frontend React (Vite + TypeScript)
│   ├── components/       # React components
│   ├── pages/           # Route pages
│   ├── hooks/           # Custom hooks
│   └── lib/             # Utilities
├── server/              # Backend Node.js (Express + TypeScript)
│   ├── index.ts         # Main entry point (port 5000)
│   ├── routes.ts        # API routes
│   ├── middleware/      # Rate limiting, auth, security
│   └── services/        # Email, analytics, logging
└── shared/              # Shared schemas (Drizzle ORM)
```

---

## 🔧 Development Commands

```bash
# Start dev server (with SSH tunnel)
./dev.sh

# Stop dev server
./dev-stop.sh

# Type checking
npm run check

# Build for production
npm run build

# Database schema sync
npm run db:push
```

---

## 🧪 Testing Endpoints

### Health Check
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "environment": "development",
  "checks": [
    {"name": "postgresql", "status": "healthy", "responseTime": 1364},
    {"name": "memory", "status": "healthy", "responseTime": 62}
  ]
}
```

### Analytics Stats
```bash
curl http://localhost:5000/api/stats
```

### Create Pin (Example)
```bash
curl -X POST http://localhost:5000/api/pins \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 37.7749,
    "longitude": -122.4194,
    "title": "San Francisco",
    "description": "Test pin"
  }'
```

---

## 🚀 Deployment Workflow

### 1. **Local Development** (You are here)
```bash
./dev.sh  # Work on features locally
```

### 2. **Commit Changes**
```bash
git add .
git commit -m "feat: your feature description"
git push origin main
```

### 3. **Deploy to Staging** (GitHub Actions)
- Go to: https://github.com/[your-username]/addypin/actions
- Select: "Deploy to Staging"
- Click: "Run workflow"
- Test at: https://staging.addypin.com

### 4. **Deploy to Production** (GitHub Actions)
- Go to: https://github.com/[your-username]/addypin/actions
- Select: "Deploy to Production"
- Click: "Run workflow"
- Live at: https://addypin.com

---

## 🔐 Environment Variables

Required in `.env` (already configured):

```bash
# Database (VPS PostgreSQL via SSH tunnel)
DATABASE_URL=postgresql://addypin_user:***@localhost:5432/addypin_dev

# Email Service (Resend)
RESEND_API_KEY=re_***

# Authentication (Clerk)
CLERK_SECRET_KEY=sk_test_***
VITE_CLERK_PUBLISHABLE_KEY=pk_test_***
WEBHOOK_SECRET=***

# Analytics (Umami)
UMAMI_API_URL=https://api.umami.is
UMAMI_WEBSITE_ID=d32cebb4-bf50-486d-8a2c-8fc2e2cbaf8d

# Environment
NODE_ENV=development
```

---

## 🛠️ Troubleshooting

### SSH Tunnel Issues
```bash
# Check if tunnel is running
lsof -i:5432

# Kill existing tunnel
./dev-stop.sh

# Restart
./dev.sh
```

### Database Connection Issues
```bash
# Verify SSH tunnel
lsof -i:5432  # Should show ssh process

# Test database connection
curl http://localhost:5000/api/health
```

### Port Already in Use
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Restart
./dev.sh
```

---

## 📚 Key Documentation

- **[DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)** - Complete documentation index (start here!)
- **[CLAUDE.md](CLAUDE.md)** - Project overview and architecture
- **[EMAIL_SYSTEM_FIXED.md](EMAIL_SYSTEM_FIXED.md)** - Email system (abc123@addypin.com) ✅ WORKING
- **[SUBDOMAIN_SETUP_COMPLETE.md](SUBDOMAIN_SETUP_COMPLETE.md)** - Subdomain routing (abc123.addypin.com) ✅ WORKING
- **[DUAL_FORMAT_LINKS_STATUS.md](DUAL_FORMAT_LINKS_STATUS.md)** - Status of both access methods
- **[DEPLOYMENT_READY.md](DEPLOYMENT_READY.md)** - Deployment strategy and commands
- **[infra-audit/](infra-audit/)** - Infrastructure documentation
- **[docs/](docs/)** - Feature documentation

---

## 🎯 Development Tips

1. **Use GitHub Actions for all deployments** (proven reliable)
2. **Test locally first** with `./dev.sh`
3. **Deploy to staging** before production
4. **Use health checks** to verify deployments
5. **Keep .env updated** with latest API keys

---

**Questions?** Check the docs/ directory or ask in team chat.
