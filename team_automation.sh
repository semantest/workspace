#!/usr/bin/env bash
# Automated team management - forces progress

SESSION="chatgpt-dev-team"

# Function to force Enter on all windows
force_enter_all() {
    for i in 0 1 2 3 4 5; do
        tmux send-keys -t $SESSION:$i C-m
    done
    echo "$(date '+%H:%M:%S') - Forced Enter on all windows"
}

# Function to send reminders
send_reminders() {
    # Wences - PRIMARY BOTTLENECK
    tmux send-keys -t $SESSION:2 "REMINDER: Implement ChatGPT idle detection NOW! Check textarea state!" C-m
    
    # Fran - WebSocket
    tmux send-keys -t $SESSION:3 "REMINDER: WebSocket server at ws://localhost:8081/ws - implement NOW!" C-m
    
    # Elena - CLI
    tmux send-keys -t $SESSION:4 "REMINDER: CLI must send domain:'chatgpt.com' in events!" C-m
    
    echo "$(date '+%H:%M:%S') - Sent work reminders"
}

# Function to check for commits
check_progress() {
    echo "$(date '+%H:%M:%S') - Checking for actual progress..."
    
    # Check for new commits
    cd /home/chous/github/rydnr/claude/semantest-workspace/extension.chrome
    EXTENSION_COMMITS=$(git log --oneline --since="1 hour ago" 2>/dev/null | wc -l)
    
    cd /home/chous/github/rydnr/claude/semantest-workspace/nodejs.server  
    SERVER_COMMITS=$(git log --oneline --since="1 hour ago" 2>/dev/null | wc -l)
    
    cd /home/chous/github/rydnr/claude/semantest-workspace/typescript.client
    CLIENT_COMMITS=$(git log --oneline --since="1 hour ago" 2>/dev/null | wc -l)
    
    echo "Recent commits - Extension: $EXTENSION_COMMITS, Server: $SERVER_COMMITS, Client: $CLIENT_COMMITS"
    
    if [ "$EXTENSION_COMMITS" -eq 0 ] && [ "$SERVER_COMMITS" -eq 0 ] && [ "$CLIENT_COMMITS" -eq 0 ]; then
        echo "⚠️ NO PROGRESS DETECTED - Sending urgent reminders!"
        send_reminders
    fi
}

# Main loop
case "$1" in
    "start")
        echo "Starting automated team management..."
        while true; do
            force_enter_all
            sleep 10
            check_progress
            sleep 50  # Check every minute
        done
        ;;
    "once")
        force_enter_all
        check_progress
        send_reminders
        ;;
    "cron")
        # For cron job - single execution
        force_enter_all
        check_progress
        ;;
    *)
        echo "Usage: $0 {start|once|cron}"
        ;;
esac