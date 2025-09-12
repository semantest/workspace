#!/usr/bin/env bash

AGENT="${0##*/run-}"
AGENT="${AGENT%%.sh}"
TEAM_DIR="/home/chous/github/rydnr/claude/semantest-workspace/team-orchestration"
ORCHESTRATOR_DIR="/home/chous/github/rydnr/claude/tmux-orchestrator"
SESSION="semantest"

# Map agent names to window numbers
case "$AGENT" in
anders) WINDOW="0" ;;
rafa) WINDOW="1" ;;
wences) WINDOW="2" ;;
alfredo) WINDOW="3" ;;
alex) WINDOW="4" ;;
ana) WINDOW="5" ;;
irene) WINDOW="6" ;;
alberto) WINDOW="7" ;;
emilio) WINDOW="8" ;;
ma) WINDOW="9" ;;
*)
    echo "Unknown agent: $AGENT"
    exit 1
    ;;
esac

# Read the persona file content
MESSAGE=$(cat "${TEAM_DIR}/personas/${AGENT}.md")

# Send the message to the correct window
"$ORCHESTRATOR_DIR/send-claude-message.sh" "$SESSION:$WINDOW" "${MESSAGE}"
