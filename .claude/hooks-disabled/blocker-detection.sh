#!/usr/bin/env bash
# Claude Code Hook: Detect blocker messages and ensure PM is notified
# This hook runs after agent responses to check for blockers

# Get environment from Claude Code
SESSION_NAME="${CLAUDE_SESSION:-semantest}"
WINDOW_INDEX="${CLAUDE_WINDOW:-}"
AGENT_NAME="${CLAUDE_AGENT_NAME:-Agent}"
RESPONSE="${CLAUDE_RESPONSE:-}"

# PM is always in window 0
PM_WINDOW="${SESSION_NAME}:0"

# Skip if this IS the PM
if [[ "$WINDOW_INDEX" == "0" ]]; then
    exit 0
fi

# Check for blocker keywords (case insensitive)
if echo "$RESPONSE" | grep -iE "blocked|blocker|stuck|waiting for|need.*from.*rydnr|cannot.*proceed" > /dev/null; then
    # Extract the blocker context (first 200 chars around the keyword)
    BLOCKER_CONTEXT=$(echo "$RESPONSE" | grep -ioE '.{0,100}(blocked|blocker|stuck|waiting for|need.*from.*rydnr|cannot.*proceed).{0,100}' | head -1)
    
    # Send urgent notification to PM
    /home/chous/work/tmux-orchestrator/send-claude-message.sh "$PM_WINDOW" \
        "🚨 [BLOCKER DETECTED] $AGENT_NAME may be blocked: \"$BLOCKER_CONTEXT\""
    
    # Log the blocker
    echo "[$(date)] BLOCKER: $AGENT_NAME - $BLOCKER_CONTEXT" >> /tmp/agent-blockers.log
fi