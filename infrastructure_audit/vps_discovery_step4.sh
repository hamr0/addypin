#!/bin/bash

# Phase 2: VPS Discovery - Step 4: Interrogate PostgreSQL
# Run this script on VPS, results will be saved to /tmp/infrastructure_audit/

echo "=== VPS Discovery Phase 2 - Step 4: PostgreSQL Interrogation Starting ==="

# Ensure output directory exists
mkdir -p /tmp/infrastructure_audit/

echo "Step 1: Finding PostgreSQL configuration files..."
# Find where PostgreSQL config files are located
sudo find / -name postgresql.conf 2>/dev/null > /tmp/infrastructure_audit/postgresql_config_path.txt

echo "Step 2: Listing PostgreSQL databases..."
# List the databases (if can connect)
sudo -u postgres psql -l > /tmp/infrastructure_audit/postgresql_databases.txt 2>&1

echo "=== PostgreSQL Interrogation Complete ==="
echo "Results saved to /tmp/infrastructure_audit/"
echo "Files created:"
ls -la /tmp/infrastructure_audit/postgresql_*.txt