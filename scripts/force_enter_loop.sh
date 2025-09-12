#!/usr/bin/env bash
# Simple aggressive Enter sender - ensures messages are always sent

SESSION="chatgpt-dev-team"

echo "Starting aggressive Enter sender..."
echo "Sending Enter to all windows every 5 seconds"
echo "Press Ctrl+C to stop"

while true; do
    for i in 0 1 2 3 4 5; do
        tmux send-keys -t $SESSION:$i C-m 2>/dev/null
    done
    echo "$(date '+%H:%M:%S') - Sent Enter to all 6 windows"
    sleep 5
done