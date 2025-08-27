#!/bin/bash

echo "🧪 VPS VERIFICATION FLOW DEBUG SCRIPT"
echo "======================================"
echo "Testing the exact same logic that's failing in CI/CD"
echo ""

# Simulate different health check scenarios
test_scenario() {
    local scenario=$1
    local health_check_passed=$2
    
    echo "🎯 SCENARIO $scenario: health_check_passed=$health_check_passed"
    echo "----------------------------------------"
    
    # Reset variables for each test
    VERIFICATION_READY=false
    
    echo "🔍 Initial state: VERIFICATION_READY=$VERIFICATION_READY"
    
    # EXACT LOGIC FROM CI/CD SCRIPT
    if [ "$health_check_passed" = true ]; then
        echo "✅ Health check passed!"
        VERIFICATION_READY=true
        echo "🔧 Set VERIFICATION_READY=true in direct path"
    else
        echo "⚠️ Health check failed - checking basic connectivity..."
        
        # Simulate app responding but health endpoint failing
        if curl -f http://localhost:3000/ >/dev/null 2>&1; then
            echo "⚠️ App responds but health endpoint failing"
            echo "🔍 Continuing deployment - app is running"
            
            echo "⏱️ Extra wait for health endpoint to stabilize..."
            sleep 3  # Shortened for testing
            
            echo "🔄 Retrying health check after wait..."
            if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
                echo "✅ Health check now passed after extra wait!"
                VERIFICATION_READY=true
                echo "🔧 Set VERIFICATION_READY=true in retry path"
            else
                echo "❌ Health check still failing after extended wait"
                echo "🔧 VERIFICATION_READY remains false"
            fi
        else
            echo "❌ Complete deployment failure"
            echo "🔧 VERIFICATION_READY remains false"
        fi
    fi
    
    echo ""
    echo "🔍 DEBUG OUTPUT:"
    echo "  VERIFICATION_READY value: '$VERIFICATION_READY'"
    echo "  String length: ${#VERIFICATION_READY}"
    echo "  Variable type: $(declare -p VERIFICATION_READY 2>/dev/null || echo "not declared")"
    
    # Test the final verification check
    echo ""
    echo "🧪 FINAL VERIFICATION CHECK:"
    if [ "$VERIFICATION_READY" = true ]; then
        echo "✅ Would proceed to Step 5/5 verification"
        verification_result="SUCCESS"
    else
        echo "❌ Would exit with 'Verification not ready'"
        verification_result="FAILURE"
    fi
    
    echo ""
    echo "📊 RESULT: $verification_result"
    echo "=========================================="
    echo ""
    
    return 0
}

# Test different scenarios
echo "Testing 3 scenarios that mirror CI/CD behavior..."
echo ""

# Scenario 1: Health check passes immediately
test_scenario "1" "true"

# Scenario 2: Health check fails, but app is running and retry succeeds
echo "🚀 Starting local server for retry testing..."
if pgrep -f "express" > /dev/null; then
    echo "✅ Express server already running"
else
    echo "⚠️ No express server detected - retry tests will show 'connection refused'"
fi

test_scenario "2" "false"

# Scenario 3: Health check fails, app not running
echo "🛑 Testing with no server (simulating complete failure)..."
test_scenario "3" "false"

echo ""
echo "🎯 ANALYSIS:"
echo "============"
echo "- If Scenario 1 shows SUCCESS: Direct path works"
echo "- If Scenario 2 shows SUCCESS: Retry path works" 
echo "- If Scenario 2 shows FAILURE: Variable scoping is broken"
echo ""
echo "🔍 Next steps based on results:"
echo "- SUCCESS in both: Issue is environment-specific (CI/CD vs VPS)"
echo "- FAILURE in Scenario 2: Variable scoping problem confirmed"
echo "- Check if server is actually running during retry scenario"