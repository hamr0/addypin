#!/bin/bash
VPS_IP="155.94.144.191"
# Use Terribic method exactly
ssh -i ~/.ssh/addypin_replit -o StrictHostKeyChecking=no -N -L 5432:localhost:5432 root@$VPS_IP &
echo $! > tunnel.pid
