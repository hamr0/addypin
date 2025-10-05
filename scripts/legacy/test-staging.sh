#!/bin/bash

echo "=== Testing Staging Environment ==="
echo ""

echo "1. Testing nginx on port 8080:"
curl -I http://addypin.com:8080 2>&1 | head -5

echo ""
echo "2. Testing API health on port 8080:"
curl http://addypin.com:8080/api/health 2>&1 | head -5

echo ""
echo "3. Testing direct backend on port 3001:"
curl http://addypin.com:3001/api/health 2>&1 | head -5

echo ""
echo "4. Testing DNS resolution:"
nslookup addypin.com | grep -A 2 "Answer"

echo ""
echo "5. Testing port connectivity:"
nc -zv addypin.com 8080 2>&1
nc -zv addypin.com 3001 2>&1

echo ""
echo "=== Test Complete ==="