#!/bin/bash

# Test Health Checks - Deployment Validation Script
# This simulates the Replit deployment health check behavior

set -e

PORT=8080
HOST="localhost"
MAX_RETRIES=30
RETRY_DELAY=1

echo "======================================"
echo "HEALTH CHECK VALIDATION TEST"
echo "======================================"
echo ""
echo "This script simulates Replit deployment health checks"
echo "Port: $PORT"
echo "Max retries: $MAX_RETRIES"
echo "Retry delay: ${RETRY_DELAY}s"
echo ""

# Function to check if port is listening
check_port() {
    nc -z $HOST $PORT 2>/dev/null
    return $?
}

# Function to make health check request
health_check() {
    local response
    local http_code
    local start_time
    local end_time
    local duration
    
    start_time=$(date +%s%N)
    response=$(curl -s -w "\n%{http_code}" "http://$HOST:$PORT/" 2>&1)
    http_code=$(echo "$response" | tail -n1)
    end_time=$(date +%s%N)
    duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
    
    echo "Response time: ${duration}ms"
    echo "HTTP Code: $http_code"
    
    if [ "$http_code" = "200" ]; then
        echo "✅ Health check PASSED"
        echo "Response body:"
        echo "$response" | head -n -1 | jq . 2>/dev/null || echo "$response" | head -n -1
        return 0
    else
        echo "❌ Health check FAILED"
        echo "Response:"
        echo "$response" | head -n -1
        return 1
    fi
}

# Main test sequence
echo "Step 1: Starting server..."
echo "--------------------------------------"
npm run start:prod > /tmp/server-test.log 2>&1 &
SERVER_PID=$!
echo "Server started with PID: $SERVER_PID"
echo ""

# Wait for port to be listening
echo "Step 2: Waiting for port to be listening..."
echo "--------------------------------------"
RETRY_COUNT=0
while ! check_port; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "❌ FAILED: Port not listening after ${MAX_RETRIES} retries"
        echo ""
        echo "Server logs:"
        cat /tmp/server-test.log
        kill $SERVER_PID 2>/dev/null || true
        exit 1
    fi
    echo "Retry $RETRY_COUNT/$MAX_RETRIES - Port not ready yet..."
    sleep $RETRY_DELAY
done

PORT_READY_TIME=$RETRY_COUNT
echo "✅ Port is listening (took ${PORT_READY_TIME}s)"
echo ""

# Make health check request
echo "Step 3: Testing health endpoint..."
echo "--------------------------------------"
if health_check; then
    echo ""
    echo "======================================"
    echo "✅ ALL TESTS PASSED!"
    echo "======================================"
    echo ""
    echo "Summary:"
    echo "- Server started successfully"
    echo "- Port ready in ${PORT_READY_TIME}s"
    echo "- Health check responding correctly"
    echo ""
    echo "Server is READY FOR DEPLOYMENT! 🚀"
    echo ""
else
    echo ""
    echo "======================================"
    echo "❌ TESTS FAILED"
    echo "======================================"
    echo ""
    echo "Server logs:"
    tail -50 /tmp/server-test.log
    echo ""
fi

# Cleanup
echo "Stopping server (PID: $SERVER_PID)..."
kill $SERVER_PID 2>/dev/null || true
sleep 2
echo "Done!"
