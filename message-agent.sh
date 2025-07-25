#!/usr/bin/env bash
# Message Agent - Send messages to agents by ID or role

set -euo pipefail

ORCHESTRATOR_HOME="${TMUX_ORCHESTRATOR_FOLDER:-/home/chous/work/tmux-orchestrator}"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Usage
if [[ $# -lt 2 ]]; then
    echo "Usage: $0 <agent_id_or_role> <message>"
    echo "Examples:"
    echo "  $0 PM 'What is the status?'"
    echo "  $0 frontend-dev 'Please update the UI'"
    echo "  $0 architect 'Review this design'"
    exit 1
fi

AGENT=$1
MESSAGE=$2

# Find agent location
LOCATION=$("$ORCHESTRATOR_HOME/agent-manager.sh" location "$AGENT")

if [[ -z "$LOCATION" ]]; then
    echo -e "${RED}❌ Agent not found: $AGENT${NC}"
    echo "Available agents:"
    "$ORCHESTRATOR_HOME/agent-manager.sh" list
    exit 1
fi

# Send message using existing infrastructure
"$ORCHESTRATOR_HOME/send-claude-message.sh" "$LOCATION" "$MESSAGE"

echo -e "${GREEN}✅ Message sent to $AGENT${NC}"