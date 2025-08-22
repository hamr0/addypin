# VPS Nginx Debug Commands

The nginx rebuild didn't fix the routing. Run these commands to diagnose:

```bash
cd /opt/addypin

# 1. Check if the new nginx.conf was actually copied into the container
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf

# 2. Check if frontend/nginx.conf exists on VPS and has correct content
cat frontend/nginx.conf

# 3. Check nginx syntax and reload
docker-compose exec frontend nginx -t
docker-compose exec frontend nginx -s reload

# 4. Check what's actually listening on port 80
docker-compose exec frontend netstat -tlnp

# 5. Test backend directly (bypass nginx)
curl -X POST http://localhost:5000/api/pins -H "Content-Type: application/json" -d '{"latitude":"52.5200","longitude":"13.4050"}'

# 6. Check docker-compose.yml nginx setup
grep -A 10 -B 5 "frontend:" docker-compose.yml
```

Run these and paste the output. The issue is either:
- nginx.conf file doesn't exist on VPS  
- Docker build didn't copy the new config
- nginx isn't reloading the configuration properly