# Debug Service Configuration

## Commands to run on VPS:

```bash
# Check if the environment override was applied
systemctl show addypin --property=Environment

# Check service logs for specific error details
journalctl -u addypin -n 20 --no-pager

# Check the service file content
systemctl cat addypin

# Test database connection directly
psql -U addypin_user -h localhost -d addypin -c "SELECT COUNT(*) FROM pins;"
```

These will show us:
1. What environment variables the service actually has
2. Specific error messages from the application
3. Complete service configuration
4. If the database connection works at all