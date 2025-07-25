#!/usr/bin/env bash
# Send all agent responses to Scribe for journaling
# Uses relative paths so it works from any directory

# Get environment from Claude Code
SESSION_NAME="${CLAUDE_SESSION:-semantest}"
WINDOW_INDEX="${CLAUDE_WINDOW:-}"
AGENT_NAME="${CLAUDE_AGENT_NAME:-Agent}"
RESPONSE="${CLAUDE_RESPONSE:-}"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# Find tmux orchestrator relative to project
TMUX_ORCHESTRATOR="$CLAUDE_PROJECT_DIR/../tmux-orchestrator"

# Find the Scribe window (usually Sam in window 4)
SCRIBE_WINDOW=$(tmux list-windows -t "$SESSION_NAME" -F "#{window_index} #{window_name}" | grep -i "scribe\|sam" | head -1 | cut -d' ' -f1)

# Default to window 4 if not found
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

# Create journal entry
JOURNAL_ENTRY="[JOURNAL] $TIMESTAMP - $AGENT_NAME ($ROLE):"

# Truncate very long responses
if [[ ${#RESPONSE} -gt 800 ]]; then
    RESPONSE_PREVIEW="${RESPONSE:0:400}
[... truncated ...]
${RESPONSE: -200}"
else
    RESPONSE_PREVIEW="$RESPONSE"
fi

# Format the entry
FULL_ENTRY="$JOURNAL_ENTRY
$RESPONSE_PREVIEW
---"

# Send to Scribe
"$TMUX_ORCHESTRATOR/send-claude-message.sh" "${SESSION_NAME}:${SCRIBE_WINDOW}" "$FULL_ENTRY" 2>> /tmp/scribe-hooks.log || {
    echo "[$TIMESTAMP] ERROR: Failed to send to Scribe" >> /tmp/scribe-hooks.log
}

# Also log to backup file
echo "$FULL_ENTRY" >> /tmp/semantest-journal-backup.log