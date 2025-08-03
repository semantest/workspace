#!/usr/bin/env bash
# Claude Code Hook: Notify PM of important tool usage
# This hook runs after specific tools are used (PostToolUse event)

# Get environment from Claude Code
SESSION_NAME="${CLAUDE_SESSION:-semantest}"
WINDOW_INDEX="${CLAUDE_WINDOW:-}"
AGENT_NAME="${CLAUDE_AGENT_NAME:-Agent}"
TOOL_NAME="${CLAUDE_TOOL_NAME:-}"
TOOL_INPUT="${CLAUDE_TOOL_INPUT:-}"

# PM is always in window 0
PM_WINDOW="${SESSION_NAME}:0"

# Skip if this IS the PM
if [[ "$WINDOW_INDEX" == "0" ]]; then
    exit 0
fi

# Create concise tool usage summary
case "$TOOL_NAME" in
    "Write")
        FILE_PATH=$(echo "$TOOL_INPUT" | jq -r .file_path 2>/dev/null || echo "unknown")
        MESSAGE="[TOOL] $AGENT_NAME created file: $FILE_PATH"
        ;;
    "Edit"|"MultiEdit")
        FILE_PATH=$(echo "$TOOL_INPUT" | jq -r .file_path 2>/dev/null || echo "unknown")
        MESSAGE="[TOOL] $AGENT_NAME edited file: $FILE_PATH"
        ;;
    "Bash")
        COMMAND=$(echo "$TOOL_INPUT" | jq -r .command 2>/dev/null || echo "unknown")
        # Truncate long commands
        if [[ ${#COMMAND} -gt 100 ]]; then
            COMMAND="${COMMAND:0:97}..."
        fi
        MESSAGE="[TOOL] $AGENT_NAME ran command: $COMMAND"
        ;;
    *)
        MESSAGE="[TOOL] $AGENT_NAME used $TOOL_NAME"
        ;;
esac

# Send notification to PM
/home/chous/work/tmux-orchestrator/send-claude-message.sh "$PM_WINDOW" "$MESSAGE"

# Log for debugging
echo "[$(date)] Tool usage: $AGENT_NAME used $TOOL_NAME" >> /tmp/agent-hooks.log