#!/bin/bash
# Upload discovery script to VPS

echo "📤 Uploading discovery script to VPS..."
scp infrastructure_audit/vps_discovery_step3.sh root@155.94.144.191:/tmp/
echo "✅ Upload complete"