#!/usr/bin/env bash
# Claude Code Hook: Document blockers in journal
# Ensures important impediments are tracked

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

# Check for blocker keywords
if echo "$RESPONSE" | grep -iE "blocked|blocker|stuck|waiting for|need.*from.*rydnr|cannot.*proceed|gpg.*sign|credentials|permission" > /dev/null; then
    # Extract blocker context
    BLOCKER_CONTEXT=$(echo "$RESPONSE" | grep -ioE '.{0,150}(blocked|blocker|stuck|waiting for|need.*from.*rydnr|cannot.*proceed|gpg.*sign|credentials|permission).{0,150}' | head -1)
    
    # Create journal entry
    JOURNAL_ENTRY="[BLOCKER] $TIMESTAMP - $AGENT_NAME is blocked:
$BLOCKER_CONTEXT
Action needed: Create GitHub issue with [BLOCKER] prefix if this requires rydnr's intervention."
    
    # Send to Scribe
    /home/chous/work/tmux-orchestrator/send-claude-message.sh "${SESSION_NAME}:${SCRIBE_WINDOW}" "$JOURNAL_ENTRY"
    
    # Log blocker
    echo "$JOURNAL_ENTRY" >> /tmp/semantest-blockers.log
fi