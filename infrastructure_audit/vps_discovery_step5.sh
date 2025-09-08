#!/bin/bash

# Phase 2: VPS Discovery - Step 5: Find Configuration Files
# Run this script on VPS, results will be saved to /tmp/infrastructure_audit/

echo "=== VPS Discovery Phase 2 - Step 5: Configuration Files Discovery Starting ==="

# Ensure output directory exists
mkdir -p /tmp/infrastructure_audit/

echo "Step 1: Finding all environment files..."
# Find all environment files and configs
find /home -name ".env*" > /tmp/infrastructure_audit/env_file_locations.txt 2>/dev/null

echo "Step 2: Safely examining environment files (excluding secrets)..."
# Look at non-secret environment variables from found .env files
echo "=== Environment File Contents (Non-Secret Variables Only) ===" > /tmp/infrastructure_audit/env_file_contents_safe.txt

# Process each .env file found
while IFS= read -r env_file; do
    if [ -f "$env_file" ]; then
        echo "" >> /tmp/infrastructure_audit/env_file_contents_safe.txt
        echo "--- File: $env_file ---" >> /tmp/infrastructure_audit/env_file_contents_safe.txt
        # Only show non-secret variables (PORT, NODE, DATA, etc. - exclude API keys, passwords, etc.)
        grep -E "(PORT|NODE_ENV|DATABASE_URL|VITE_)" "$env_file" 2>/dev/null | sed 's/=.*/=***REDACTED***/' >> /tmp/infrastructure_audit/env_file_contents_safe.txt || echo "No readable non-secret vars found" >> /tmp/infrastructure_audit/env_file_contents_safe.txt
    fi
done < /tmp/infrastructure_audit/env_file_locations.txt

echo "=== Configuration Files Discovery Complete ==="
echo "Results saved to /tmp/infrastructure_audit/"
echo "Files created:"
ls -la /tmp/infrastructure_audit/env_file_*.txt