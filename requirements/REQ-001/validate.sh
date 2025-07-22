#!/usr/bin/env bash
# Validate that all required files exist and are approved

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

VALID=true
REQ_DIR="$(dirname "${BASH_SOURCE[0]}")"

echo "🔍 Validating requirement documentation..."

# Check requirement.md
if [ -f "$REQ_DIR/requirement.md" ]; then
    if grep -q "\[x\] Orchestrator Approval" "$REQ_DIR/requirement.md"; then
        echo -e "${GREEN}✅ requirement.md exists and is approved${NC}"
    else
        echo -e "${YELLOW}⚠️  requirement.md exists but needs Orchestrator approval${NC}"
        VALID=false
    fi
else
    echo -e "${RED}❌ requirement.md is missing${NC}"
    VALID=false
fi

# Check design.md
if [ -f "$REQ_DIR/design.md" ]; then
    if grep -q "\[x\] PM Approval" "$REQ_DIR/design.md"; then
        echo -e "${GREEN}✅ design.md exists and is approved${NC}"
    else
        echo -e "${YELLOW}⚠️  design.md exists but needs PM approval${NC}"
        VALID=false
    fi
else
    echo -e "${RED}❌ design.md is missing${NC}"
    VALID=false
fi

# Check task.md
if [ -f "$REQ_DIR/task.md" ]; then
    echo -e "${GREEN}✅ task.md exists${NC}"
else
    echo -e "${RED}❌ task.md is missing${NC}"
    VALID=false
fi

if $VALID; then
    echo -e "\n${GREEN}✅ All documentation is ready for development!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Documentation incomplete. Development cannot proceed.${NC}"
    echo -e "${YELLOW}Agents must refuse to work until all files are approved.${NC}"
    exit 1
fi
