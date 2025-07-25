#!/usr/bin/env bash
# Log tool usage to PM for visibility
# Uses relative paths so it works from any directory

# Get environment from Claude Code
SESSION_NAME="${CLAUDE_SESSION:-semantest}"
WINDOW_INDEX="${CLAUDE_WINDOW:-}"
AGENT_NAME="${CLAUDE_AGENT_NAME:-Agent}"
TOOL_NAME="${CLAUDE_TOOL_NAME:-}"
TOOL_INPUT="${CLAUDE_TOOL_INPUT:-}"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# Find tmux orchestrator relative to project
TMUX_ORCHESTRATOR="$CLAUDE_PROJECT_DIR/../tmux-orchestrator"

# PM is always in window 0
PM_WINDOW="0"

# Skip if this IS the PM
if [[ "$WINDOW_INDEX" == "$PM_WINDOW" ]]; then
    exit 0
fi

# Skip if this is the Scribe (window 4)
if [[ "$WINDOW_INDEX" == "4" ]]; then
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
    *)
        ACTIVITY="used $TOOL_NAME"
        ;;
esac

# Determine agent role
case "$WINDOW_INDEX" in
    "1") ROLE="Backend" ;;
    "2") ROLE="Extension" ;;
    "3") ROLE="QA" ;;
    "5") ROLE="DevOps" ;;
    *) ROLE="Agent" ;;
esac

# Create tool usage notification
TOOL_MESSAGE="[TOOL] $TIMESTAMP - $AGENT_NAME ($ROLE) $ACTIVITY"

# Send to PM
"$TMUX_ORCHESTRATOR/send-claude-message.sh" "${SESSION_NAME}:${PM_WINDOW}" "$TOOL_MESSAGE" 2>> /tmp/tool-usage.log || {
    echo "[$TIMESTAMP] ERROR: Failed to send tool usage to PM" >> /tmp/tool-usage.log
}

# Log for debugging
echo "$TOOL_MESSAGE" >> /tmp/tool-usage.log