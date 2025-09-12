#!/bin/bash

# Production Validation Runner for ChatGPT Image Generation System
# This script runs the complete validation suite in the correct order

set -e  # Exit on any error

echo "🚀 ChatGPT Image Generation - Production Validation Suite"
echo "=========================================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_DIR="./tests"
LOG_DIR="./logs"
RESULTS_DIR="./test-results"

# Ensure directories exist
mkdir -p "$LOG_DIR"
mkdir -p "$RESULTS_DIR"
mkdir -p "$TEST_DIR/data"
mkdir -p "$TEST_DIR/images"

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if server is running
check_server() {
    local port=$1
    local name=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        print_status $GREEN "✅ $name (port $port) is running"
        return 0
    else
        print_status $RED "❌ $name (port $port) is not running"
        return 1
    fi
}

# Function to start server if not running
start_server_if_needed() {
    local port=$1
    local name=$2
    local start_command=$3
    
    if ! check_server $port "$name"; then
        print_status $YELLOW "🔄 Starting $name..."
        eval $start_command &
        sleep 3
        
        if check_server $port "$name"; then
            print_status $GREEN "✅ $name started successfully"
        else
            print_status $RED "❌ Failed to start $name"
            exit 1
        fi
    fi
}

# Step 1: Prerequisites Check
echo "📋 Step 1: Prerequisites Check"
echo "==============================="

# Check Node.js version
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    print_status $GREEN "✅ Node.js installed: $NODE_VERSION"
else
    print_status $RED "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Check required files
REQUIRED_FILES=(
    "start-event-server.js"
    "tests/quick-validation.js"
    "tests/production-validation-suite.js"
    "tests/performance-benchmark.js"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status $GREEN "✅ $file exists"
    else
        print_status $RED "❌ $file not found"
        exit 1
    fi
done

# Check and install dependencies
if [ ! -d "node_modules" ]; then
    print_status $YELLOW "📦 Installing dependencies..."
    npm install
fi

echo ""

# Step 2: Server Health Check
echo "🔧 Step 2: Server Health Check"
echo "==============================="

# Start required servers
start_server_if_needed 8082 "Event Server" "node start-event-server.js"

# Check other servers (might be external)
check_server 8080 "Orchestrator Server" || print_status $YELLOW "⚠️  Orchestrator server not running (tests may mock this)"
check_server 8081 "WebSocket Server" || print_status $YELLOW "⚠️  WebSocket server not running (tests may mock this)"

echo ""

# Step 3: Quick Validation (Smoke Test)
echo "⚡ Step 3: Quick Validation (Smoke Test)"
echo "========================================"

print_status $BLUE "Running quick validation..."
if node tests/quick-validation.js 2>&1 | tee "$LOG_DIR/quick-validation.log"; then
    print_status $GREEN "✅ Quick validation passed"
    QUICK_VALIDATION_PASSED=true
else
    print_status $RED "❌ Quick validation failed"
    QUICK_VALIDATION_PASSED=false
    echo "Check $LOG_DIR/quick-validation.log for details"
fi

echo ""

# Step 4: Full Production Validation
echo "🧪 Step 4: Full Production Validation Suite"
echo "==========================================="

if [ "$QUICK_VALIDATION_PASSED" = true ]; then
    print_status $BLUE "Running comprehensive production validation..."
    
    if timeout 900 node tests/production-validation-suite.js 2>&1 | tee "$LOG_DIR/production-validation.log"; then
        print_status $GREEN "✅ Production validation completed"
        PRODUCTION_VALIDATION_PASSED=true
    else
        print_status $RED "❌ Production validation failed or timed out"
        PRODUCTION_VALIDATION_PASSED=false
        echo "Check $LOG_DIR/production-validation.log for details"
    fi
else
    print_status $YELLOW "⏭️  Skipping production validation (quick validation failed)"
    PRODUCTION_VALIDATION_PASSED=false
fi

echo ""

# Step 5: Performance Benchmarking
echo "📊 Step 5: Performance Benchmarking"
echo "===================================="

if [ "$PRODUCTION_VALIDATION_PASSED" = true ]; then
    print_status $BLUE "Running performance benchmarks..."
    
    if timeout 600 node tests/performance-benchmark.js 2>&1 | tee "$LOG_DIR/performance-benchmark.log"; then
        print_status $GREEN "✅ Performance benchmarking completed"
        PERFORMANCE_BENCHMARK_PASSED=true
    else
        print_status $RED "❌ Performance benchmarking failed or timed out"
        PERFORMANCE_BENCHMARK_PASSED=false
        echo "Check $LOG_DIR/performance-benchmark.log for details"
    fi
else
    print_status $YELLOW "⏭️  Skipping performance benchmarking (validation failed)"
    PERFORMANCE_BENCHMARK_PASSED=false
fi

echo ""

# Step 6: Results Summary
echo "📋 Step 6: Test Results Summary"
echo "==============================="

# Create summary report
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
SUMMARY_FILE="$RESULTS_DIR/validation-summary-$TIMESTAMP.txt"

{
    echo "ChatGPT Image Generation - Production Validation Summary"
    echo "========================================================"
    echo "Date: $(date)"
    echo "Environment: $(uname -s) $(uname -r)"
    echo "Node.js: $NODE_VERSION"
    echo ""
    
    echo "TEST RESULTS:"
    echo "============="
    echo "Quick Validation: $([ "$QUICK_VALIDATION_PASSED" = true ] && echo "✅ PASSED" || echo "❌ FAILED")"
    echo "Production Validation: $([ "$PRODUCTION_VALIDATION_PASSED" = true ] && echo "✅ PASSED" || echo "❌ FAILED")"
    echo "Performance Benchmark: $([ "$PERFORMANCE_BENCHMARK_PASSED" = true ] && echo "✅ PASSED" || echo "❌ FAILED")"
    echo ""
    
    echo "LOG FILES:"
    echo "=========="
    echo "Quick Validation: $LOG_DIR/quick-validation.log"
    echo "Production Validation: $LOG_DIR/production-validation.log"
    echo "Performance Benchmark: $LOG_DIR/performance-benchmark.log"
    echo ""
    
    # Overall assessment
    if [ "$QUICK_VALIDATION_PASSED" = true ] && [ "$PRODUCTION_VALIDATION_PASSED" = true ] && [ "$PERFORMANCE_BENCHMARK_PASSED" = true ]; then
        echo "OVERALL ASSESSMENT: ✅ SYSTEM IS PRODUCTION READY"
        echo ""
        echo "NEXT STEPS:"
        echo "- Deploy to staging environment"
        echo "- Run manual testing procedures (see tests/manual-testing-guide.md)"
        echo "- Conduct user acceptance testing"
        echo "- Plan production deployment"
    elif [ "$QUICK_VALIDATION_PASSED" = true ] && [ "$PRODUCTION_VALIDATION_PASSED" = true ]; then
        echo "OVERALL ASSESSMENT: ⚠️  SYSTEM IS FUNCTIONAL (Performance needs attention)"
        echo ""
        echo "NEXT STEPS:"
        echo "- Investigate performance issues"
        echo "- Optimize slow components"
        echo "- Re-run validation after fixes"
    elif [ "$QUICK_VALIDATION_PASSED" = true ]; then
        echo "OVERALL ASSESSMENT: ⚠️  BASIC FUNCTIONALITY WORKS (Critical issues found)"
        echo ""
        echo "NEXT STEPS:"
        echo "- Review production validation failures"
        echo "- Fix critical issues"
        echo "- Re-run full validation suite"
    else
        echo "OVERALL ASSESSMENT: ❌ SYSTEM HAS MAJOR ISSUES"
        echo ""
        echo "NEXT STEPS:"
        echo "- Check server connectivity"
        echo "- Verify system dependencies"
        echo "- Fix basic functionality issues"
        echo "- Re-run quick validation"
    fi
    
} | tee "$SUMMARY_FILE"

echo ""
echo "📄 Summary report saved: $SUMMARY_FILE"

# Step 7: Cleanup and Next Steps
echo ""
echo "🧹 Step 7: Cleanup and Next Steps"
echo "=================================="

# Copy important results to results directory
if [ -d "tests/data" ]; then
    cp -r tests/data "$RESULTS_DIR/test-data-$TIMESTAMP" 2>/dev/null || true
fi

if [ -d "tests/benchmark-results" ]; then
    cp -r tests/benchmark-results "$RESULTS_DIR/benchmark-results-$TIMESTAMP" 2>/dev/null || true
fi

print_status $GREEN "✅ Test artifacts preserved in $RESULTS_DIR"

echo ""
echo "📚 Additional Resources:"
echo "========================"
echo "• Manual Testing Guide: tests/manual-testing-guide.md"
echo "• Test Documentation: tests/README.md"
echo "• System Architecture: Check existing documentation"
echo ""

# Final exit status
if [ "$QUICK_VALIDATION_PASSED" = true ] && [ "$PRODUCTION_VALIDATION_PASSED" = true ]; then
    print_status $GREEN "🎉 Validation completed successfully!"
    exit 0
else
    print_status $RED "❌ Validation completed with issues"
    echo "Review the logs and summary report for details"
    exit 1
fi