#!/usr/bin/env bash
# Claude Code Hook: Automatically send agent responses to PM
# This hook runs after each agent response (Stop event)

# Get environment from Claude Code
SESSION_NAME="${CLAUDE_SESSION:-semantest}"
WINDOW_INDEX="${CLAUDE_WINDOW:-}"
AGENT_NAME="${CLAUDE_AGENT_NAME:-Agent}"

# PM is always in window 0
PM_WINDOW="${SESSION_NAME}:0"

# Skip if this IS the PM (window 0)
if [[ "$WINDOW_INDEX" == "0" ]]; then
    exit 0
fi

# Skip if no response content
if [[ -z "$CLAUDE_RESPONSE" ]]; then
    exit 0
fi

# Extract agent window info
AGENT_WINDOW="${SESSION_NAME}:${WINDOW_INDEX}"

# Truncate long responses
RESPONSE_PREVIEW="$CLAUDE_RESPONSE"
if [[ ${#RESPONSE_PREVIEW} -gt 300 ]]; then
    RESPONSE_PREVIEW="${RESPONSE_PREVIEW:0:297}..."
fi

# Send to PM with context
/home/chous/work/tmux-orchestrator/send-claude-message.sh "$PM_WINDOW" \
    "[AUTO-HOOK] Response from $AGENT_NAME (Window $WINDOW_INDEX): $RESPONSE_PREVIEW"

# Log for debugging
echo "[$(date)] Forwarded response from $AGENT_WINDOW to PM" >> /tmp/agent-hooks.log