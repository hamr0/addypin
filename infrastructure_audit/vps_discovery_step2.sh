#!/bin/bash

# Phase 2: VPS Discovery - Step 2: Inspect Running Containers
# Run this script on VPS, results will be saved to /tmp/infrastructure_audit/

echo "=== VPS Discovery Phase 2 - Step 2: Container Inspection Starting ==="

# Ensure output directory exists
mkdir -p /tmp/infrastructure_audit/

echo "Step 1: Inspecting production container (addypin)..."
# Inspect production container
docker inspect addypin > /tmp/infrastructure_audit/docker_inspect_prod.json

echo "Step 2: Inspecting staging container (addypin-staging)..."
# Inspect staging container  
docker inspect addypin-staging > /tmp/infrastructure_audit/docker_inspect_staging.json

echo "Step 3: Getting production container logs..."
# Get production container logs
docker logs addypin > /tmp/infrastructure_audit/docker_logs_prod.txt

echo "Step 4: Getting staging container logs..."
# Get staging container logs
docker logs addypin-staging > /tmp/infrastructure_audit/docker_logs_staging.txt

echo "=== Container Inspection Complete ==="
echo "Results saved to /tmp/infrastructure_audit/"
echo "Files created:"
ls -la /tmp/infrastructure_audit/docker_*.{json,txt}