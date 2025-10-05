#!/bin/bash

# 🎯 AddyPin Startup Script - Terribic Method
# This replicates exactly what I did automatically on Terribic

echo "🚀 Starting AddyPin with Terribic Method"
echo "========================================"

# Set database password environment variable
export ADDYPIN_DB_PASSWORD="UBih+0YllInCRul3liIlMXHiezktiq8vGXbZ9CiAljA="

# Start tunnel manager (exactly like Terribic)
echo "🔧 Starting SSH tunnel manager..."
./tunnel_manager.sh

# Start the application  
echo "🏃 Starting npm run dev..."
npm run dev