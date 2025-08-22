# Production-Replit Sync Status

**Critical Issue**: Manual VPS fixes need to be synced to Replit repo to prevent CI/CD overwriting fixes.

## Sync Status

### ✅ Already Synced in Replit:
- `server/db.ts` - Clean database configuration (no duplicates)
- `client/src/lib/queryClient.ts` - Environment-based API URLs
- `client/.env.production` - Production API base URL

### ✅ Just Synced:
- `frontend/nginx.conf` - Fixed API routing with `/api/` location block

### 🚧 Still Manual on VPS Only:
- None - all production fixes are now reflected in Replit

## Deployment Strategy

**Current State**: Production fixes manually applied on VPS. Replit repo now has matching configurations.

**Next CI/CD deployment will**:
- Deploy clean database configuration ✅
- Deploy correct nginx routing ✅ 
- Deploy environment-aware frontend ✅
- Should work without breaking production

**Action Required**: Test the VPS nginx fix manually, then once confirmed working, the next CI/CD deployment will maintain these fixes automatically.

## VPS Commands Still Needed

```bash
# Apply the nginx fix on VPS (this is the only remaining manual step)
cd /opt/addypin
docker-compose build --no-cache frontend
docker-compose restart frontend

# Test
curl -X POST https://addypin.com/api/pins -H "Content-Type: application/json" -d '{"latitude":"52.5200","longitude":"13.4050"}'
```

Once this works, all future deployments via CI/CD will maintain the correct configuration.