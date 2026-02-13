# Deployment Reference

## Deploy in 2 Minutes

1. Push changes: `git push origin main`
2. Go to [GitHub Actions](https://github.com/hamr0/addypin/actions)
3. Select workflow ("Deploy to Staging" or "Deploy to Production")
4. Click "Run workflow"
5. Wait ~2 minutes
6. Verify: https://addypin.com or https://staging.addypin.com

## CI/CD Pipeline

```
Code Push -> GitHub -> Manual Trigger -> GitHub Actions -> Docker Build -> GHCR Push -> SSH to VPS -> Pull Image -> docker-compose up -> Health Check -> Done
```

### Pipeline Steps
1. **Manual trigger** via GitHub Actions UI
2. **Build**: Node.js 20, `npm ci`, `npm run build`
3. **Docker**: Multi-stage build (builder -> runner)
4. **Push**: Image to GitHub Container Registry
5. **Deploy**: SSH to VPS, pull image, `docker-compose up -d`
6. **Verify**: Health check at `/api/health`
7. **Rollback**: Automatic if health check fails

### Key Files
- `Dockerfile` - Multi-stage build (Node 20 Alpine, non-root user)
- `docker-compose.yml` - Production orchestration
- `.github/workflows/deploy-production.yml` - Production pipeline
- `.github/workflows/deploy-staging.yml` - Staging pipeline

## VPS Commands

```bash
# SSH to VPS
ssh root@155.94.144.191

# Container management
cd /opt/addypin
docker-compose down
docker-compose up -d

# Logs
docker logs addypin -f
docker logs addypin-staging -f
docker logs addypin-postgres -f

# Database access
docker exec -it addypin-postgres psql -U postgres -d addypin

# Health checks
curl http://localhost:3000/api/health   # Production
curl http://localhost:8080/api/health   # Staging
sudo /opt/infra-health-check.sh        # Full system check
sudo tail -f /var/log/infra-health-check.log  # Monitoring logs
```

## Emergency Commands

### Site Down
```bash
ssh root@155.94.144.191
docker restart addypin
```

### Deployment Failed
```bash
ssh root@155.94.144.191
docker logs addypin --tail 20
```

### Rollback
```bash
ssh root@155.94.144.191
docker stop addypin && docker rm addypin
docker images | grep addypin  # Find previous tag
docker run -d --name addypin -p 3000:3000 [env vars] addypin:[previous_tag]
```

### Docker Cleanup
```bash
# Clean old images (run weekly or when disk full)
docker system prune -f
docker image prune -a --filter "until=168h"  # Remove images >7 days old
```

## Domain & SSL

- **Domain**: Namecheap DNS
- **SSL**: Let's Encrypt with auto-renewal via Nginx
- **Wildcard**: `*.addypin.com` routes to app for shortcode subdomains

### DNS Records
```
A     addypin.com          <VPS-IP>
A     *.addypin.com        <VPS-IP>
A     staging.addypin.com  <VPS-IP>
A     mail.addypin.com     <VPS-IP>
MX    addypin.com          mail.addypin.com  10
```

## Environment Variables (VPS)

Required in `/opt/addypin/.env`:
```bash
DATABASE_URL=postgresql://...
RESEND_API_KEY=re_...
NODE_ENV=production
PORT=3000  # (8080 for staging)
```
