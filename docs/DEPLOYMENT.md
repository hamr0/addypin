# addypin Deployment Guide

## Production Environment

### Database
- **Type**: PostgreSQL (Neon serverless)
- **Connection**: Via DATABASE_URL environment variable
- **Backup**: Automatic via Replit PostgreSQL service

### Deployment Type
- **Platform**: Replit Autoscale Deployment
- **Scaling**: Automatic based on traffic
- **Cost**: $1 base + usage-based (estimated $3-8/month)

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV=production`

### Pre-Deployment Checklist
- [ ] All 13 map integrations working
- [ ] Country detection (195+ countries) verified
- [ ] OTP email system functional
- [ ] Rate limiting active (5 pins/hour, 15/day per IP)
- [ ] Database migrations applied
- [ ] Analytics tracking operational

### Post-Deployment Verification
- [ ] Health check endpoints responding
- [ ] Database connectivity confirmed
- [ ] Map redirects working for all services
- [ ] Statistics dashboard updating
- [ ] User pin creation and editing functional

### Rollback Plan
1. Access Replit Deployments dashboard
2. Select previous deployment version
3. Click "Redeploy" to rollback
4. Verify functionality restored

### Monitoring
- **Replit Analytics**: Built-in deployment metrics
- **Custom Analytics**: `/api/stats` endpoint
- **Database Health**: Connection status monitoring
- **Error Logging**: Console and deployment logs

## Emergency Contacts
- Primary: User (project owner)
- Platform: Replit Support for infrastructure issues

Last Updated: August 15, 2025