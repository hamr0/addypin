#!/bin/bash
echo "Testing flag file logic locally..."

# Simulate the EXACT CI/CD variables
health_check_passed=true  # This is what CI/CD sets initially

# Clear flag
rm -f /tmp/verification_ready

# Test our current logic
if [ "$health_check_passed" = true ]; then
    echo "✅ Health check passed!"
    touch /tmp/verification_ready
else
    echo "⚠️ This path shouldn't happen in our case"
fi

# Check if flag works
if [ -f /tmp/verification_ready ]; then
    echo "✅ Flag file method works!"
else
    echo "❌ Flag file method failed!"
fi

rm -f /tmp/verification_ready
