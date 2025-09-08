#!/bin/bash

# Phase 2: VPS Discovery & Interrogation - Step 1: Map the Landscape
# Run this script on VPS, results will be saved to /tmp/infrastructure_audit/

echo "=== VPS Discovery Phase 2 - Step 1 Starting ==="
echo "Creating output directory..."

# Create output directory on VPS
mkdir -p /tmp/infrastructure_audit/

echo "Step 1: Mapping network ports (80, 443, 3000, 5000, 5432)..."
# 1. See all running processes and ports
sudo netstat -tulpn | grep -E ":(80|443|3000|5000|5432)" > /tmp/infrastructure_audit/vps_network_ports.txt

echo "Step 2: Listing Docker containers and port mappings..."
# 2. See all running Docker containers and their port mappings  
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}" > /tmp/infrastructure_audit/docker_containers.txt

echo "Step 3: Finding Docker configuration files..."
# 3. Find all Docker-related files on the system
find /home -name "*docker*" -o -name "*.yml" -o -name "*.yaml" > /tmp/infrastructure_audit/docker_config_locations.txt

echo "=== Discovery Step 1 Complete ==="
echo "Results saved to /tmp/infrastructure_audit/"
echo "Files created:"
ls -la /tmp/infrastructure_audit/