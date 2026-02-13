# Development Workflow

## Quick Start

```bash
./dev.sh        # Start dev server (SSH tunnel + dependencies + Vite)
./dev-stop.sh   # Stop dev server and SSH tunnel
```

Dev server runs at **http://localhost:5000** with hot reload.

## Local URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5000 |
| Health Check | http://localhost:5000/api/health |
| Stats | http://localhost:5000/api/stats |
| System Info | http://localhost:5000/api/health/system |

## Database Connection

Local development uses VPS PostgreSQL via SSH tunnel:

- **VPS**: 155.94.144.191:5432
- **Local Tunnel**: localhost:5432
- **Database**: addypin_dev

## Development Commands

```bash
npm run dev       # Start dev server with hot reload
npm run check     # TypeScript type checking
npm run build     # Build frontend (Vite) + backend (ESBuild)
npm run start     # Start production server
npm run db:push   # Sync database schema with Drizzle
```

## Project Structure

```
addypin/
├── client/src/           # Frontend React (Vite + TypeScript)
│   ├── components/       # React components (ui/, forms/, maps/, layout/)
│   ├── pages/            # Route pages
│   ├── hooks/            # Custom hooks
│   └── lib/              # Utilities
├── server/               # Backend Node.js (Express + TypeScript)
│   ├── index.ts          # Main entry point
│   ├── routes.ts         # API routes
│   ├── middleware/        # Rate limiting, auth, security, DDoS
│   ├── services/          # Email, analytics, logging
│   ├── db.ts             # Drizzle database connection
│   └── storage.ts        # Data persistence layer
├── shared/               # Shared code
│   ├── schema.ts         # Drizzle ORM schemas
│   └── utils.ts          # Shared utilities
└── docs/                 # Documentation
```

## Environment Variables

Required in `.env`:
```bash
DATABASE_URL=postgresql://addypin_user:***@localhost:5432/addypin_dev
RESEND_API_KEY=re_***
NODE_ENV=development
```

## Deployment

### Deploy to Staging
1. `git push origin main`
2. GitHub Actions -> "Deploy to Staging" -> "Run workflow"
3. Test at https://staging.addypin.com

### Deploy to Production
1. GitHub Actions -> "Deploy to Production" -> "Run workflow"
2. Wait ~2 minutes for automated build + deploy
3. Verify at https://addypin.com

## Troubleshooting

### SSH Tunnel Issues
```bash
lsof -i:5432          # Check if tunnel running
./dev-stop.sh         # Kill existing tunnel
./dev.sh              # Restart
```

### Port Already in Use
```bash
lsof -ti:5000 | xargs kill -9
./dev.sh
```

### Database Connection
```bash
lsof -i:5432          # Should show ssh process
curl http://localhost:5000/api/health  # Verify connection
```
