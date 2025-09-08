#!/bin/bash

# Phase 2: VPS Discovery - Step 3: Interrogate Nginx Configuration
# Run this script on VPS, results will be saved to /tmp/infrastructure_audit/

echo "=== VPS Discovery Phase 2 - Step 3: Nginx Interrogation Starting ==="

# Ensure output directory exists
mkdir -p /tmp/infrastructure_audit/

echo "Step 1: Testing Nginx configuration for syntax errors..."
# Test current Nginx configuration for errors
sudo nginx -t 2> /tmp/infrastructure_audit/nginx_test.txt

echo "Step 2: Dumping full active Nginx configuration..."
# Dump the full, active Nginx configuration
sudo nginx -T > /tmp/infrastructure_audit/nginx_full_config.txt

echo "=== Nginx Interrogation Complete ==="
echo "Results saved to /tmp/infrastructure_audit/"
echo "Files created:"
ls -la /tmp/infrastructure_audit/nginx_*.txt