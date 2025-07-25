#!/usr/bin/env bash
# Notify Architect (Aria) of development team activities for monitoring
# Aria will watch for architectural questions or blocking situations

# Get environment from Claude Code
SESSION_NAME="${CLAUDE_SESSION:-semantest}"
WINDOW_INDEX="${CLAUDE_WINDOW:-}"
AGENT_NAME="${CLAUDE_AGENT_NAME:-Agent}"
RESPONSE="${CLAUDE_RESPONSE:-}"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# Find tmux orchestrator relative to project
TMUX_ORCHESTRATOR="$CLAUDE_PROJECT_DIR/../tmux-orchestrator"

# Architect is in window 6
ARCHITECT_WINDOW="6"

# Skip if this IS the Architect
if [[ "$WINDOW_INDEX" == "$ARCHITECT_WINDOW" ]]; then
    exit 0
fi

# Skip if this is PM (window 0) or Scribe (window 4)
if [[ "$WINDOW_INDEX" == "0" || "$WINDOW_INDEX" == "4" ]]; then
    exit 0
fi

# Skip if no response content
if [[ -z "$RESPONSE" ]]; then
    exit 0
fi

# Only notify for specific team members who might need architecture guidance
case "$WINDOW_INDEX" in
    "1") ROLE="Backend (Alex)" ;;
    "2") ROLE="Extension (Eva)" ;;
    "3") ROLE="QA (Quinn)" ;;
    "5") ROLE="DevOps (Dana)" ;;
    *) exit 0 ;;  # Skip other windows
esac

# Check if the message contains architecture-related keywords or blocking indicators
if echo "$RESPONSE" | grep -iE "(architect|architecture|design|decision|waiting|blocked|need guidance|need help|how should|which approach|best practice|pattern|structure|integration|api design|websocket|event flow|system design)" > /dev/null; then
    # This seems architecture-related, send with priority indicator
    PRIORITY_INDICATOR="🔍 [ARCHITECTURE ATTENTION NEEDED]"
else
    # Regular monitoring message
    PRIORITY_INDICATOR="[MONITORING]"
fi

# Create monitoring message for Architect
ARCHITECT_MESSAGE="$PRIORITY_INDICATOR $TIMESTAMP - $ROLE activity:
$RESPONSE

Note: Only intervene if they're blocked or explicitly asking for architectural guidance."

# Send to Architect
"$TMUX_ORCHESTRATOR/send-claude-message.sh" "${SESSION_NAME}:${ARCHITECT_WINDOW}" "$ARCHITECT_MESSAGE" 2>> /tmp/architect-monitoring.log || {
    echo "[$TIMESTAMP] ERROR: Failed to notify Architect" >> /tmp/architect-monitoring.log
}

# Log for debugging
echo "[$TIMESTAMP] Notified Architect of $ROLE activity" >> /tmp/architect-monitoring.log