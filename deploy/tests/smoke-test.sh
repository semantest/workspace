#!/bin/bash

# Smoke Tests for Semantest WebSocket Server
# Usage: ./smoke-test.sh [environment]

set -euo pipefail

# Configuration
ENVIRONMENT="${1:-staging}"
BASE_URL="${WEBSOCKET_URL:-http://localhost:8080}"
WS_URL="${WS_BASE_URL:-ws://localhost:8080}"
TIMEOUT=10

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Logging functions
pass() { 
    echo -e "${GREEN}✓${NC} $*"
    ((TESTS_PASSED++))
}

fail() { 
    echo -e "${RED}✗${NC} $*" >&2
    ((TESTS_FAILED++))
}

info() { echo -e "${YELLOW}ℹ${NC} $*"; }

# Test health endpoint
test_health_endpoint() {
    info "Testing health endpoint..."
    
    if curl -sf --max-time ${TIMEOUT} "${BASE_URL}/health" > /dev/null; then
        pass "Health endpoint is responding"
    else
        fail "Health endpoint is not responding"
    fi
}

# Test metrics endpoint
test_metrics_endpoint() {
    info "Testing metrics endpoint..."
    
    if curl -sf --max-time ${TIMEOUT} "${BASE_URL}/metrics" | grep -q "websocket_connections"; then
        pass "Metrics endpoint is working"
    else
        fail "Metrics endpoint is not working properly"
    fi
}

# Test WebSocket connection
test_websocket_connection() {
    info "Testing WebSocket connection..."
    
    # Use websocat or wscat if available
    if command -v websocat &> /dev/null; then
        if echo '{"type":"ping"}' | timeout ${TIMEOUT} websocat -1 "${WS_URL}" | grep -q "pong"; then
            pass "WebSocket connection successful"
        else
            fail "WebSocket connection failed"
        fi
    elif command -v wscat &> /dev/null; then
        if echo '{"type":"ping"}' | timeout ${TIMEOUT} wscat -c "${WS_URL}" | grep -q "pong"; then
            pass "WebSocket connection successful"
        else
            fail "WebSocket connection failed"
        fi
    else
        # Fallback to curl upgrade test
        response=$(curl -sf --max-time ${TIMEOUT} \
            -H "Upgrade: websocket" \
            -H "Connection: Upgrade" \
            -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" \
            -H "Sec-WebSocket-Version: 13" \
            -w "%{http_code}" \
            "${BASE_URL}" || echo "000")
        
        if [[ "${response}" == "101" ]] || [[ "${response}" == "426" ]]; then
            pass "WebSocket upgrade headers accepted"
        else
            fail "WebSocket upgrade failed (HTTP ${response})"
        fi
    fi
}

# Test API endpoints
test_api_endpoints() {
    info "Testing API endpoints..."
    
    # Test root endpoint
    if curl -sf --max-time ${TIMEOUT} "${BASE_URL}/" > /dev/null; then
        pass "Root endpoint is accessible"
    else
        fail "Root endpoint is not accessible"
    fi
    
    # Test version endpoint
    if version=$(curl -sf --max-time ${TIMEOUT} "${BASE_URL}/version" | grep -o '"version"'); then
        pass "Version endpoint is working"
    else
        fail "Version endpoint is not working"
    fi
}

# Test authentication (if enabled)
test_authentication() {
    info "Testing authentication..."
    
    # Test without auth (should fail)
    response=$(curl -sf --max-time ${TIMEOUT} \
        -w "%{http_code}" \
        -o /dev/null \
        "${BASE_URL}/api/protected" || echo "000")
    
    if [[ "${response}" == "401" ]] || [[ "${response}" == "403" ]]; then
        pass "Authentication is properly enforced"
    elif [[ "${response}" == "404" ]]; then
        info "Protected endpoints not configured"
    else
        fail "Authentication may not be properly configured (HTTP ${response})"
    fi
}

# Test rate limiting
test_rate_limiting() {
    info "Testing rate limiting..."
    
    # Send multiple requests quickly
    local rate_limited=false
    for i in {1..20}; do
        response=$(curl -sf --max-time 1 -w "%{http_code}" -o /dev/null "${BASE_URL}/health" || echo "000")
        if [[ "${response}" == "429" ]]; then
            rate_limited=true
            break
        fi
    done
    
    if [[ "${rate_limited}" == "true" ]]; then
        pass "Rate limiting is active"
    else
        info "Rate limiting may not be configured"
    fi
}

# Performance check
test_response_time() {
    info "Testing response time..."
    
    # Measure response time
    response_time=$(curl -sf --max-time ${TIMEOUT} \
        -w "%{time_total}" \
        -o /dev/null \
        "${BASE_URL}/health")
    
    # Convert to milliseconds
    response_ms=$(echo "${response_time} * 1000" | bc | cut -d'.' -f1)
    
    if [[ ${response_ms} -lt 100 ]]; then
        pass "Response time is excellent (${response_ms}ms)"
    elif [[ ${response_ms} -lt 500 ]]; then
        pass "Response time is acceptable (${response_ms}ms)"
    else
        fail "Response time is slow (${response_ms}ms)"
    fi
}

# Main test execution
main() {
    echo "======================================"
    echo "Smoke Tests for ${ENVIRONMENT}"
    echo "Target: ${BASE_URL}"
    echo "======================================"
    echo
    
    # Run all tests
    test_health_endpoint
    test_metrics_endpoint
    test_websocket_connection
    test_api_endpoints
    test_authentication
    test_rate_limiting
    test_response_time
    
    # Summary
    echo
    echo "======================================"
    echo "Test Summary:"
    echo "  Passed: ${TESTS_PASSED}"
    echo "  Failed: ${TESTS_FAILED}"
    echo "======================================"
    
    # Exit with appropriate code
    if [[ ${TESTS_FAILED} -gt 0 ]]; then
        exit 1
    else
        exit 0
    fi
}

# Run tests
main "$@"