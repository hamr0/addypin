#!/bin/bash
ssh -o StrictHostKeyChecking=no root@155.94.144.191 << 'REMOTE_COMMANDS'
echo "=== CURRENT ADDYPIN LOCATION ==="
find / -name "*addypin*" -type d 2>/dev/null | head -10

echo -e "\n=== RUNNING PROCESSES ==="
ps aux | grep -i addypin | grep -v grep
ps aux | grep -i node | grep -v grep

echo -e "\n=== PM2 STATUS ==="
which pm2 && pm2 list || echo "PM2 not installed"

echo -e "\n=== SYSTEMD SERVICES ==="
systemctl list-units --type=service | grep -i addypin || echo "No addypin systemd services"

echo -e "\n=== DIRECTORY STRUCTURE ==="
ls -la /opt/ 2>/dev/null || echo "/opt/ does not exist"
ls -la /home/ 2>/dev/null | head -5

echo -e "\n=== FIND INDEX.JS ==="
find /opt -name "index.js" 2>/dev/null | head -5
find /home -name "index.js" 2>/dev/null | head -5
find /root -name "index.js" 2>/dev/null | head -5

echo -e "\n=== NGINX STATUS ==="
systemctl status nginx 2>/dev/null | head -3 || echo "Nginx not running"

echo -e "\n=== POSTGRESQL INFO ==="
systemctl status postgresql 2>/dev/null | head -3 || echo "PostgreSQL status unknown"
sudo -u postgres psql -l 2>/dev/null | grep addypin || echo "No addypin database found"

REMOTE_COMMANDS
