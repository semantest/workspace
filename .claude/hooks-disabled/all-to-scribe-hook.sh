#!/usr/bin/env bash
# Claude Code Hook: Send all agent responses to Scribe for journaling
# This ensures complete project documentation

# Get environment from Claude Code
SESSION_NAME="${CLAUDE_SESSION:-semantest}"
WINDOW_INDEX="${CLAUDE_WINDOW:-}"
AGENT_NAME="${CLAUDE_AGENT_NAME:-Agent}"
RESPONSE="${CLAUDE_RESPONSE:-}"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# Find the Scribe window (usually Sam in window 4)
# First try to find by name pattern
SCRIBE_WINDOW=$(tmux list-windows -t "$SESSION_NAME" -F "#{window_index} #{window_name}" | grep -i "scribe\|sam" | head -1 | cut -d' ' -f1)

# If not found, default to window 4 (typical scribe position)
if [[ -z "$SCRIBE_WINDOW" ]]; then
    SCRIBE_WINDOW="4"
fi

# Skip if this IS the Scribe
if [[ "$WINDOW_INDEX" == "$SCRIBE_WINDOW" ]]; then
    exit 0
fi

# Skip if no response content
if [[ -z "$RESPONSE" ]]; then
    exit 0
fi

# Determine agent role
case "$WINDOW_INDEX" in
    "0") ROLE="PM" ;;
    "1") ROLE="Backend" ;;
    "2") ROLE="Extension" ;;
    "3") ROLE="QA" ;;
    "5") ROLE="DevOps" ;;
    *) ROLE="Agent" ;;
esac

# Create journal entry format
JOURNAL_ENTRY="[JOURNAL] $TIMESTAMP - $AGENT_NAME ($ROLE):"

# Truncate very long responses but keep more context for journal
if [[ ${#RESPONSE} -gt 800 ]]; then
    # For long responses, extract key parts
    # Try to identify if it's code, analysis, or status update
    if echo "$RESPONSE" | grep -q "```"; then
        # Code block - extract first and last parts
        RESPONSE_PREVIEW=$(echo "$RESPONSE" | head -20)
        RESPONSE_PREVIEW="$RESPONSE_PREVIEW
[... code content truncated ...]
$(echo "$RESPONSE" | tail -10)"
    else
        # Regular text - keep beginning and end
        RESPONSE_PREVIEW="${RESPONSE:0:400}
[... truncated ...]
${RESPONSE: -200}"
    fi
else
    RESPONSE_PREVIEW="$RESPONSE"
fi

# Format the journal entry
FULL_ENTRY="$JOURNAL_ENTRY
$RESPONSE_PREVIEW
---"

# Send to Scribe
/home/chous/work/tmux-orchestrator/send-claude-message.sh "${SESSION_NAME}:${SCRIBE_WINDOW}" "$FULL_ENTRY"

# Also log to file for backup
echo "$FULL_ENTRY" >> /tmp/semantest-journal-backup.log

# Log the forwarding action
echo "[$TIMESTAMP] Forwarded $ROLE response to Scribe (window $SCRIBE_WINDOW)" >> /tmp/scribe-hooks.log