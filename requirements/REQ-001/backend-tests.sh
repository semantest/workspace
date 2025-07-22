#!/bin/bash

# Backend Health Check Test Suite
# REQ-001: Layered Health Check System

echo "========================================"
echo "Backend Health Check Test Suite"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Helper function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    echo -n "Running $test_name... "
    
    result=$(eval "$test_command" 2>&1)
    
    if [[ "$result" == *"$expected_result"* ]]; then
        echo -e "${GREEN}PASSED${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}FAILED${NC}"
        echo "  Expected: $expected_result"
        echo "  Got: $result"
        ((FAILED++))
        return 1
    fi
}

# Test 1: Basic health check
echo "Test Suite: TC-001 - Browser Executable Detection"
echo "------------------------------------------------"

run_test "1.1: Health endpoint returns 200" \
    "curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/health" \
    "200"

run_test "1.2: Response is valid JSON" \
    "curl -s http://localhost:8080/health | jq -e . > /dev/null && echo 'valid'" \
    "valid"

run_test "1.3: Component field is 'server'" \
    "curl -s http://localhost:8080/health | jq -r .component" \
    "server"

run_test "1.4: Healthy status is boolean" \
    "curl -s http://localhost:8080/health | jq -r '.healthy | type'" \
    "boolean"

run_test "1.5: Browser path is provided when healthy" \
    "curl -s http://localhost:8080/health | jq -r '.message' | grep -q 'Browser available at:' && echo 'found'" \
    "found"

echo ""

# Test 2: Response time performance
echo "Test Suite: Performance Checks"
echo "------------------------------"

response_time=$(curl -s -w "%{time_total}" -o /dev/null http://localhost:8080/health)
response_ms=$(echo "$response_time * 1000" | bc)
echo "Response time: ${response_ms}ms"

if (( $(echo "$response_ms < 500" | bc -l) )); then
    echo -e "Performance test: ${GREEN}PASSED${NC} (< 500ms requirement)"
    ((PASSED++))
else
    echo -e "Performance test: ${RED}FAILED${NC} (>= 500ms)"
    ((FAILED++))
fi

echo ""

# Test 3: Error handling
echo "Test Suite: Error Handling"
echo "--------------------------"

run_test "3.1: Invalid endpoint returns 404" \
    "curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/invalid" \
    "404"

run_test "3.2: Invalid method returns 404" \
    "curl -s -X POST -o /dev/null -w '%{http_code}' http://localhost:8080/health" \
    "404"

echo ""

# Test 4: Concurrent requests
echo "Test Suite: Concurrent Request Handling"
echo "---------------------------------------"

echo -n "Sending 10 concurrent requests... "
for i in {1..10}; do
    curl -s http://localhost:8080/health > /dev/null &
done
wait

# Check if server is still responding
if curl -s http://localhost:8080/health | jq -e . > /dev/null; then
    echo -e "${GREEN}PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}FAILED${NC}"
    ((FAILED++))
fi

echo ""

# Summary
echo "========================================"
echo "Test Summary"
echo "========================================"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo -e "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi