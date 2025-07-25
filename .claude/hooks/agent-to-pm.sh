#!/usr/bin/env bash
# Send agent responses to PM for coordination
# Uses relative paths so it works from any directory

# Get environment from Claude Code
SESSION_NAME="${CLAUDE_SESSION:-semantest}"
WINDOW_INDEX="${CLAUDE_WINDOW:-}"
AGENT_NAME="${CLAUDE_AGENT_NAME:-Agent}"
RESPONSE="${CLAUDE_RESPONSE:-}"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# Find tmux orchestrator relative to project
TMUX_ORCHESTRATOR="$CLAUDE_PROJECT_DIR/../tmux-orchestrator"

# PM is always in window 0
PM_WINDOW="0"

# Skip if this IS the PM
if [[ "$WINDOW_INDEX" == "$PM_WINDOW" ]]; then
    exit 0
fi

# Skip if no response content
if [[ -z "$RESPONSE" ]]; then
    exit 0
fi

# Skip if this is the Scribe (window 4)
if [[ "$WINDOW_INDEX" == "4" ]]; then
    exit 0
fi

# Determine agent role
case "$WINDOW_INDEX" in
    "1") ROLE="Backend" ;;
    "2") ROLE="Extension" ;;
    "3") ROLE="QA" ;;
    "5") ROLE="DevOps" ;;
    *) ROLE="Agent" ;;
esac

# Create message for PM
PM_MESSAGE="[$TIMESTAMP] Update from $AGENT_NAME ($ROLE):
$RESPONSE"

# Send to PM
"$TMUX_ORCHESTRATOR/send-claude-message.sh" "${SESSION_NAME}:${PM_WINDOW}" "$PM_MESSAGE" 2>> /tmp/pm-communication.log || {
    echo "[$TIMESTAMP] ERROR: Failed to send to PM" >> /tmp/pm-communication.log
}

# Log for debugging
echo "[$TIMESTAMP] Sent update from $AGENT_NAME to PM" >> /tmp/pm-communication.log