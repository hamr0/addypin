# Monitoring System

## Architecture

Three-layer monitoring approach:

### Layer 1: Application Health Endpoints

**Basic**: `GET /api/health`
- Database connectivity (response time in ms)
- Memory usage
- Returns HTTP 503 if any dependency fails

**Detailed**: `GET /api/health/system`
- Node.js version, platform, architecture
- Process uptime
- Memory breakdown (used, total, RSS)
- CPU usage statistics
- Database response time

### Layer 2: Docker Container Health

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
```

Visible via `docker ps` (shows healthy/unhealthy status).

### Layer 3: VPS System Monitoring

**Cron-based health checks** every 5 minutes:
```
*/5 * * * * /opt/infra-health-check.sh
```

Monitored services:
- Nginx web server (auto-restart on failure)
- Production container (`addypin`)
- Staging container (`addypin-staging`)
- Database container (`addypin-postgres`)
- API health endpoints (localhost:3000, localhost:8080)

**Log location**: `/var/log/infra-health-check.log` (7-day rotation)

## Commands

```bash
# Live monitoring
sudo tail -f /var/log/infra-health-check.log

# Manual health check
sudo /opt/infra-health-check.sh

# Check errors
sudo grep "ERROR" /var/log/infra-health-check.log

# Container health
docker ps  # Shows health status column
docker logs addypin -f
docker logs addypin-staging -f
```
