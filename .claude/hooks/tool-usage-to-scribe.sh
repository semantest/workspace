#!/usr/bin/env bash
# Claude Code Hook: Document tool usage in journal
# Tracks what agents are actually doing

# Get environment from Claude Code
SESSION_NAME="${CLAUDE_SESSION:-semantest}"
WINDOW_INDEX="${CLAUDE_WINDOW:-}"
AGENT_NAME="${CLAUDE_AGENT_NAME:-Agent}"
TOOL_NAME="${CLAUDE_TOOL_NAME:-}"
TOOL_INPUT="${CLAUDE_TOOL_INPUT:-}"
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

# Create activity summary based on tool
case "$TOOL_NAME" in
    "Write")
        FILE_PATH=$(echo "$TOOL_INPUT" | jq -r .file_path 2>/dev/null || echo "unknown")
        ACTIVITY="created file: $FILE_PATH"
        ;;
    "Edit"|"MultiEdit")
        FILE_PATH=$(echo "$TOOL_INPUT" | jq -r .file_path 2>/dev/null || echo "unknown")
        ACTIVITY="modified file: $FILE_PATH"
        ;;
    "Bash")
        COMMAND=$(echo "$TOOL_INPUT" | jq -r .command 2>/dev/null || echo "unknown")
        if [[ ${#COMMAND} -gt 100 ]]; then
            COMMAND="${COMMAND:0:97}..."
        fi
        ACTIVITY="executed: $COMMAND"
        ;;
    "TodoWrite")
        ACTIVITY="updated task list"
        ;;
    "Read")
        FILE_PATH=$(echo "$TOOL_INPUT" | jq -r .file_path 2>/dev/null || echo "unknown")
        ACTIVITY="reading: $FILE_PATH"
        ;;
    *)
        ACTIVITY="used $TOOL_NAME"
        ;;
esac

# Create journal entry
JOURNAL_ENTRY="[ACTIVITY] $TIMESTAMP - $AGENT_NAME $ACTIVITY"

# Send to Scribe
/home/chous/work/tmux-orchestrator/send-claude-message.sh "${SESSION_NAME}:${SCRIBE_WINDOW}" "$JOURNAL_ENTRY"

# Backup log
echo "$JOURNAL_ENTRY" >> /tmp/semantest-activity.log