#!/bin/bash

# Phase 2: VPS Discovery - Step 6: Document the Deployment Scripts  
# Run this script on VPS, results will be saved to /tmp/infrastructure_audit/

echo "=== VPS Discovery Phase 2 - Step 6: Deployment Scripts Discovery Starting ==="

# Ensure output directory exists
mkdir -p /tmp/infrastructure_audit/

echo "Step 1: Finding all shell scripts and deployment files..."
# Find any deployment or management scripts
find /home -name "*.sh" -o -name "deploy*" -o -name "*deploy*" -o -name "startup*" -o -name "*startup*" > /tmp/infrastructure_audit/script_locations.txt 2>/dev/null

echo "Step 2: Examining deployment scripts contents (safely)..."
echo "=== Deployment Scripts Contents ===" > /tmp/infrastructure_audit/deployment_scripts_content.txt

# Process each script found
while IFS= read -r script_file; do
    if [ -f "$script_file" ]; then
        echo "" >> /tmp/infrastructure_audit/deployment_scripts_content.txt
        echo "--- File: $script_file ---" >> /tmp/infrastructure_audit/deployment_scripts_content.txt
        echo "File size: $(wc -c < "$script_file") bytes" >> /tmp/infrastructure_audit/deployment_scripts_content.txt
        echo "Permissions: $(ls -la "$script_file" | cut -d' ' -f1)" >> /tmp/infrastructure_audit/deployment_scripts_content.txt
        echo "" >> /tmp/infrastructure_audit/deployment_scripts_content.txt
        
        # Show first 50 lines of script (to avoid massive files but capture key commands)
        head -50 "$script_file" >> /tmp/infrastructure_audit/deployment_scripts_content.txt 2>/dev/null || echo "Could not read script contents" >> /tmp/infrastructure_audit/deployment_scripts_content.txt
        echo "" >> /tmp/infrastructure_audit/deployment_scripts_content.txt
        echo "--- End of $script_file ---" >> /tmp/infrastructure_audit/deployment_scripts_content.txt
    fi
done < /tmp/infrastructure_audit/script_locations.txt

echo "Step 3: Finding any Docker run commands in command history..."
# Look for docker run commands that might reveal deployment method
grep -h "docker run\|docker start\|docker-compose" /root/.bash_history /home/*/.bash_history 2>/dev/null | head -20 > /tmp/infrastructure_audit/docker_history_commands.txt || echo "No docker commands found in history" > /tmp/infrastructure_audit/docker_history_commands.txt

echo "=== Deployment Scripts Discovery Complete ==="
echo "Results saved to /tmp/infrastructure_audit/"
echo "Files created:"
ls -la /tmp/infrastructure_audit/script_*.txt /tmp/infrastructure_audit/deploy*.txt /tmp/infrastructure_audit/docker_history*.txt