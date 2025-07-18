#!/bin/bash

# Semantest Migration Validation Script
# Validates the WebBuddy → Semantest migration

echo "🔍 Semantest Migration Validation Script"
echo "========================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Function to run a check
run_check() {
    local check_name="$1"
    local check_command="$2"
    local success_message="$3"
    local failure_message="$4"
    
    echo -n "Checking $check_name... "
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if eval "$check_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        [ -n "$success_message" ] && echo "   $success_message"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "${RED}❌ FAIL${NC}"
        [ -n "$failure_message" ] && echo "   $failure_message"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
    echo ""
}

# Function to run a manual check
manual_check() {
    local check_name="$1"
    local result="$2"
    local message="$3"
    
    echo -n "Checking $check_name... "
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [ "$result" = "pass" ]; then
        echo -e "${GREEN}✅ PASS${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    elif [ "$result" = "fail" ]; then
        echo -e "${RED}❌ FAIL${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    else
        echo -e "${YELLOW}⚠️  WARN${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
    
    [ -n "$message" ] && echo "   $message"
    echo ""
}

echo "🧪 BASIC VALIDATION CHECKS"
echo "=========================="
echo ""

# Check 1: Basic file structure
run_check "Basic file structure" \
    "[ -f package.json ] && [ -d typescript.client ] && [ -d browser ] && [ -d google.com ]" \
    "All main directories and files are present" \
    "Missing critical files or directories"

# Check 2: Git repository status
run_check "Git repository status" \
    "git rev-parse --is-inside-work-tree" \
    "Git repository is properly initialized" \
    "Not in a git repository"

# Check 3: Check for buddy references in critical files
run_check "Buddy references in README" \
    "! grep -i 'web-buddy\|webbuddy' README.md" \
    "README.md has been updated with Semantest branding" \
    "README.md still contains buddy references"

# Check 4: Check package.json files have correct names
run_check "Package.json semantest branding" \
    "grep -q '@semantest' typescript.client/package.json" \
    "Package.json files use @semantest scope" \
    "Package.json files may still use old naming"

# Check 5: Check for git commits
run_check "Git commits present" \
    "git log --oneline -n 5" \
    "Git history shows migration commits" \
    "No git commits found"

echo "📦 PACKAGE VALIDATION"
echo "====================="
echo ""

# Check 6-11: Package.json validation for each module
for module in typescript.client browser google.com nodejs.server extension.chrome chatgpt.com; do
    if [ -f "$module/package.json" ]; then
        run_check "$module package.json" \
            "[ -f $module/package.json ] && jq -e .name $module/package.json | grep -q semantest" \
            "Package uses semantest branding" \
            "Package may not use semantest branding"
    else
        manual_check "$module package.json" "fail" "Package.json file not found"
    fi
done

echo "📚 DOCUMENTATION VALIDATION"
echo "=========================="
echo ""

# Check 12: Documentation files
run_check "Documentation files present" \
    "[ -f QUICK_START.md ] && [ -f CONTRIBUTING.md ] && [ -f docs/README.org ]" \
    "Core documentation files are present" \
    "Missing documentation files"

# Check 13: Migration logs
run_check "Migration logs present" \
    "[ -f scripts/MIGRATION_LOG.md ] && [ -f scripts/DOCUMENTATION_UPDATE_LOG.md ]" \
    "Migration documentation is complete" \
    "Missing migration logs"

echo "🏗️ BUILD VALIDATION"
echo "==================="
echo ""

# Check 14: TypeScript configuration
run_check "TypeScript configuration" \
    "[ -f tsconfig.json ] && [ -f typescript.client/tsconfig.json ]" \
    "TypeScript configuration files are present" \
    "Missing TypeScript configuration"

# Check 15: Node.js compatibility
run_check "Node.js version" \
    "node --version | grep -E 'v1[89]|v[2-9][0-9]'" \
    "Node.js version is compatible" \
    "Node.js version may be incompatible"

echo "🔒 SECURITY VALIDATION"
echo "======================"
echo ""

# Check 16: No hardcoded credentials
run_check "No hardcoded credentials" \
    "! grep -r -i 'password\|secret\|key.*=' . --include='*.ts' --include='*.js' --include='*.json' --exclude-dir=node_modules | grep -v 'example\|test'" \
    "No hardcoded credentials found" \
    "Potential hardcoded credentials found"

# Check 17: Security logs
run_check "Security review logs" \
    "ls scripts/security-review-task-*.md | wc -l | grep -q '[1-9]'" \
    "Security review logs are present" \
    "Missing security review logs"

echo "🌐 EXTERNAL REFERENCES"
echo "======================"
echo ""

# Check 18: External references updated
run_check "External references updated" \
    "[ -f scripts/EXTERNAL_REFERENCES_UPDATE_LOG.md ]" \
    "External references log is present" \
    "Missing external references log"

# Check 19: Repository URLs
run_check "Repository URLs updated" \
    "grep -q 'github.com/semantest' typescript.client/package.json" \
    "Repository URLs use semantest organization" \
    "Repository URLs may not be updated"

echo ""
echo "📊 VALIDATION SUMMARY"
echo "===================="
echo ""

# Calculate percentage
PASS_PERCENTAGE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))

echo "Total Checks: $TOTAL_CHECKS"
echo -e "Passed: ${GREEN}$PASSED_CHECKS${NC}"
echo -e "Failed: ${RED}$FAILED_CHECKS${NC}"
echo "Pass Rate: $PASS_PERCENTAGE%"
echo ""

# Determine overall status
if [ $PASS_PERCENTAGE -ge 90 ]; then
    echo -e "Overall Status: ${GREEN}✅ EXCELLENT${NC}"
    echo "Migration is in excellent condition!"
elif [ $PASS_PERCENTAGE -ge 75 ]; then
    echo -e "Overall Status: ${GREEN}✅ GOOD${NC}"
    echo "Migration is in good condition with minor issues."
elif [ $PASS_PERCENTAGE -ge 50 ]; then
    echo -e "Overall Status: ${YELLOW}⚠️  NEEDS ATTENTION${NC}"
    echo "Migration has some issues that should be addressed."
else
    echo -e "Overall Status: ${RED}❌ CRITICAL${NC}"
    echo "Migration has critical issues that must be fixed."
fi

echo ""
echo "🔍 DETAILED RECOMMENDATIONS"
echo "=========================="
echo ""

if [ $FAILED_CHECKS -gt 0 ]; then
    echo "Issues found that need attention:"
    echo "• Review failed checks above"
    echo "• Fix any missing dependencies"
    echo "• Ensure all package.json files use @semantest scope"
    echo "• Verify all documentation is updated"
    echo "• Check build configuration"
    echo "• Review security validations"
    echo ""
fi

echo "Migration validation complete!"
echo ""

# Exit with appropriate code
if [ $PASS_PERCENTAGE -ge 75 ]; then
    exit 0
else
    exit 1
fi