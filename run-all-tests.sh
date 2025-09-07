#!/bin/bash
# 🧪 TDD Test Runner - Verify all modules can test independently
# Author: Rafa - Systems Architect

echo "🏗️ === SEMANTEST TEST SUITE ==="
echo "Running all module tests independently..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall status
ALL_PASS=true

# Function to run tests for a module
run_module_tests() {
    local module=$1
    local name=$2
    
    echo -e "${YELLOW}📦 Testing $name...${NC}"
    
    if [ -d "$module" ]; then
        cd "$module"
        
        # Check if package.json exists
        if [ -f "package.json" ]; then
            # Install dependencies if needed
            if [ ! -d "node_modules" ]; then
                echo "  Installing dependencies..."
                npm install --silent
            fi
            
            # Run tests
            if npm test 2>&1 | grep -q "FAIL"; then
                echo -e "  ${RED}❌ Tests failing (expected in RED phase)${NC}"
            else
                echo -e "  ${GREEN}✅ Tests passing${NC}"
            fi
        else
            echo -e "  ${RED}⚠️  No package.json found${NC}"
            ALL_PASS=false
        fi
        
        cd - > /dev/null
    else
        echo -e "  ${RED}⚠️  Module not found${NC}"
        ALL_PASS=false
    fi
    
    echo ""
}

# Test each module
echo "🔴 RED Phase - All tests should fail initially"
echo "=================================="
echo ""

run_module_tests "nodejs.server" "Node.js WebSocket Server"
run_module_tests "extension.chrome" "Chrome Extension"
run_module_tests "typescript.client" "TypeScript Client"

# Summary
echo "=================================="
if [ "$ALL_PASS" = true ]; then
    echo -e "${GREEN}✅ All modules can run tests independently!${NC}"
else
    echo -e "${RED}⚠️  Some modules need configuration${NC}"
fi

echo ""
echo "🔄 TDD Cycle Reminder:"
echo "  1. RED 🔴 - Write failing test"
echo "  2. GREEN ✅ - Write minimal code to pass"
echo "  3. REFACTOR 🔄 - Improve code quality"
echo ""
echo "Remember: Commit to module directories only!"