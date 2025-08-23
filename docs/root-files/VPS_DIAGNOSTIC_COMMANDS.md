# VPS Production Diagnostic Commands

Run these commands on your VPS to get the exact error details:

```bash
# 1. Check container status
cd /opt/addypin
docker-compose ps

# 2. Get backend container logs (this will show the exact error)
docker-compose logs backend --tail 50

# 3. Check if backend is actually running
curl -I http://localhost:5000/api/health

# 4. Check the actual database configuration file
cat server/db.ts

# 5. Test database connection directly
docker-compose exec backend node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('DB Error:', err.message);
  else console.log('DB Connected:', res.rows[0]);
  process.exit(0);
});
"

# 6. Check nginx configuration
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf

# 7. Check if API routes are actually defined
docker-compose exec backend find . -name "*.ts" -o -name "*.js" | xargs grep -l "api/pins\|api/otp"
```

Run these and tell me what each command outputs. This will show us exactly what's broken.