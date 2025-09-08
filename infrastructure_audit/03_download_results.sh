#!/bin/bash
# Download results from VPS

echo "📥 Downloading results from VPS..."
scp root@155.94.144.191:/tmp/infrastructure_audit/nginx_*.txt ./infrastructure_audit/
echo "✅ Download complete"