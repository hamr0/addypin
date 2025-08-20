# Service Restart Required

After editing the systemd service file, you must reload and restart:

```bash
# Reload systemd configuration
systemctl daemon-reload

# Restart the addypin service
systemctl restart addypin

# Check if it's running properly
systemctl status addypin

# Check logs for any errors
journalctl -u addypin -n 20

# Test the website
curl -I https://addypin.com

# If still not working, check what files exist
ls -la /opt/addypin/app/

# Verify the service file was updated correctly
cat /etc/systemd/system/addypin.service | grep ExecStart
```

The key issue is that systemd needs to be reloaded after editing service files.