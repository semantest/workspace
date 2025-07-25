#!/usr/bin/env bash
# Detect and forward blocker messages to PM
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

# Detect blocker patterns (case insensitive)
if echo "$RESPONSE" | grep -iE "(blocked|blocker|stuck|waiting for|need help|cannot proceed|unable to|permission denied|access denied|error:|failed to)" > /dev/null; then
    
    # Determine agent role
    case "$WINDOW_INDEX" in
        "1") ROLE="Backend" ;;
        "2") ROLE="Extension" ;;
        "3") ROLE="QA" ;;
        "4") ROLE="Scribe" ;;
        "5") ROLE="DevOps" ;;
        *) ROLE="Agent" ;;
    esac
    
    # Create urgent message for PM
    BLOCKER_MESSAGE="🚨 [BLOCKER DETECTED] from $AGENT_NAME ($ROLE) at $TIMESTAMP:

$RESPONSE

ACTION REQUIRED: Please check if this needs escalation to rydnr via GitHub issue with [BLOCKER] prefix."
    
    # Send to PM immediately
    "$TMUX_ORCHESTRATOR/send-claude-message.sh" "${SESSION_NAME}:${PM_WINDOW}" "$BLOCKER_MESSAGE" 2>> /tmp/blocker-detection.log || {
        echo "[$TIMESTAMP] ERROR: Failed to send blocker to PM" >> /tmp/blocker-detection.log
    }
    
    # Log blocker detection
    echo "[$TIMESTAMP] BLOCKER detected from $AGENT_NAME: $RESPONSE" >> /tmp/blocker-detection.log
fi