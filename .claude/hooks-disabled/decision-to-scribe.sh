#!/usr/bin/env bash
# Claude Code Hook: Document technical decisions in journal
# Captures important architectural and implementation choices

# Get environment from Claude Code
SESSION_NAME="${CLAUDE_SESSION:-semantest}"
WINDOW_INDEX="${CLAUDE_WINDOW:-}"
AGENT_NAME="${CLAUDE_AGENT_NAME:-Agent}"
RESPONSE="${CLAUDE_RESPONSE:-}"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# Find Scribe window
SCRIBE_WINDOW=$(tmux list-windows -t "$SESSION_NAME" -F "#{window_index} #{window_name}" | grep -i "scribe\|sam" | head -1 | cut -d' ' -f1)
if [[ -z "$SCRIBE_WINDOW" ]]; then
    SCRIBE_WINDOW="4"
fi

# Skip if this IS the Scribe
if [[ "$WINDOW_INDEX" == "$SCRIBE_WINDOW" ]]; then
    exit 0
fi

# Check for decision keywords
if echo "$RESPONSE" | grep -iE "decided|decision|chose|will use|going with|approach|architecture|design|implement.*using|solution" > /dev/null; then
    # Extract decision context
    DECISION_CONTEXT=$(echo "$RESPONSE" | grep -ioE '.{0,200}(decided|decision|chose|will use|going with|approach|architecture|design|implement.*using|solution).{0,200}' | head -1)
    
    # Only document if it seems like a significant decision
    if echo "$DECISION_CONTEXT" | grep -iE "lambda|aws|pulumi|websocket|event|api|framework|library|pattern" > /dev/null; then
        # Create journal entry
        JOURNAL_ENTRY="[DECISION] $TIMESTAMP - $AGENT_NAME:
$DECISION_CONTEXT"
        
        # Send to Scribe
        /home/chous/work/tmux-orchestrator/send-claude-message.sh "${SESSION_NAME}:${SCRIBE_WINDOW}" "$JOURNAL_ENTRY"
        
        # Log decision
        echo "$JOURNAL_ENTRY" >> /tmp/semantest-decisions.log
    fi
fi