#!/usr/bin/env bash

# Team broadcast script for Semantest
# Usage: ./team-broadcast.sh "Your message to all team members"

if [ $# -eq 0 ]; then
    echo "Usage: $0 \"Your message to broadcast\""
    echo "Example: $0 \"Team standup in 5 minutes\""
    exit 1
fi

MESSAGE="$1"
ORCHESTRATOR_DIR="/home/chous/work/tmux-orchestrator"

echo "Broadcasting to all Semantest team members..."

# Send to all windows except the sender
CURRENT_WINDOW=$(tmux display-message -p "#{window_index}" 2>/dev/null || echo "-1")

for i in {0..6}; do
    if [ "$i" != "$CURRENT_WINDOW" ]; then
        case $i in
            0) member="PM";;
            1) member="Alex";;
            2) member="Eva";;
            3) member="Quinn";;
            4) member="Sam";;
            5) member="Dana";;
            6) member="Aria";;
        esac
        
        echo "Sending to $member (window $i)..."
        "$ORCHESTRATOR_DIR/send-claude-message.sh" "semantest:$i" "[TEAM BROADCAST] $MESSAGE"
    fi
done

echo "✅ Broadcast complete!"