#!/usr/bin/env bash
# Claude Code Hook: Notify Architect of architectural decisions
# This hook runs when architectural decisions are made

# Get environment from Claude Code
SESSION_NAME="${CLAUDE_SESSION:-semantest}"
WINDOW_INDEX="${CLAUDE_WINDOW:-}"
AGENT_NAME="${CLAUDE_AGENT_NAME:-Agent}"
TOOL_NAME="${CLAUDE_TOOL_NAME:-}"
TOOL_INPUT="${CLAUDE_TOOL_INPUT:-}"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# Find Architect window (Aria is in window 6)
ARCHITECT_WINDOW="${SESSION_NAME}:6"

# Skip if this IS the Architect
if [[ "$WINDOW_INDEX" == "6" ]]; then
    exit 0
fi

# Determine if this is an architectural decision
ARCH_DECISION=false
MESSAGE=""

# Check for architectural patterns in tool usage
case "$TOOL_NAME" in
    "Write")
        FILE_PATH=$(echo "$TOOL_INPUT" | jq -r .file_path 2>/dev/null || echo "unknown")
        # Check if it's a config, schema, or architecture file
        if [[ "$FILE_PATH" == *"config"* ]] || [[ "$FILE_PATH" == *"schema"* ]] || [[ "$FILE_PATH" == *"architecture"* ]]; then
            ARCH_DECISION=true
            MESSAGE="[ARCHITECTURE] $AGENT_NAME created architectural file: $FILE_PATH"
        fi
        ;;
    "Edit"|"MultiEdit")
        FILE_PATH=$(echo "$TOOL_INPUT" | jq -r .file_path 2>/dev/null || echo "unknown")
        # Check for architectural changes
        if [[ "$FILE_PATH" == *"config"* ]] || [[ "$FILE_PATH" == *"schema"* ]] || [[ "$FILE_PATH" == *"api"* ]]; then
            ARCH_DECISION=true
            MESSAGE="[ARCHITECTURE] $AGENT_NAME modified architecture in: $FILE_PATH"
        fi
        ;;
    "Bash")
        COMMAND=$(echo "$TOOL_INPUT" | jq -r .command 2>/dev/null || echo "unknown")
        # Check for dependency or structure changes
        if [[ "$COMMAND" == *"npm install"* ]] || [[ "$COMMAND" == *"pip install"* ]] || [[ "$COMMAND" == *"mkdir"* ]]; then
            ARCH_DECISION=true
            MESSAGE="[ARCHITECTURE] $AGENT_NAME made structural change: $COMMAND"
        fi
        ;;
esac

# Only notify if it's an architectural decision
if [[ "$ARCH_DECISION" == true ]] && [[ -n "$MESSAGE" ]]; then
    /home/chous/work/tmux-orchestrator/send-claude-message.sh "$ARCHITECT_WINDOW" "$MESSAGE"
    echo "[$(date)] Architecture notification: $MESSAGE" >> /tmp/architect-monitoring.log
fi