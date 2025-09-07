#!/usr/bin/env bash
# Helper script to send messages to team members with guaranteed Enter key

# Function to send message to a specific window
send_to_window() {
    local window=$1
    local message=$2
    tmux send-keys -t chatgpt-dev-team:$window "$message" C-m
}

# Function to send message to all windows
send_to_all() {
    local message=$1
    for window in 0 1 2 3 4 5; do
        send_to_window $window "$message"
    done
}

# Function to spawn a team member with Enter
spawn_member() {
    local window=$1
    local prompt=$2
    tmux send-keys -t chatgpt-dev-team:$window "claude '$prompt'" C-m
}

# Main script logic
case "$1" in
    "window")
        send_to_window "$2" "$3"
        ;;
    "all")
        send_to_all "$2"
        ;;
    "spawn")
        spawn_member "$2" "$3"
        ;;
    *)
        echo "Usage: $0 {window|all|spawn} [window_number] [message]"
        echo "  window <num> <msg> - Send to specific window"
        echo "  all <msg>          - Send to all windows"
        echo "  spawn <num> <msg>  - Spawn claude in window"
        exit 1
        ;;
esac