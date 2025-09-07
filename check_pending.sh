#!/usr/bin/env bash
# Script to check for pending/unsent text in tmux windows

SESSION="chatgpt-dev-team"
TEAM_MEMBERS=("Rafa" "Ana" "Wences" "Fran" "Elena" "Carlos")

check_for_pending() {
    echo "=== Checking for pending text in all windows ==="
    echo ""
    
    for i in 0 1 2 3 4 5; do
        # Capture the last few lines of the pane
        last_lines=$(tmux capture-pane -t $SESSION:$i -p | tail -5)
        
        # Check if there's text after the prompt (> symbol) that looks incomplete
        # Look for patterns that suggest unsent commands
        if echo "$last_lines" | grep -E "^[^>]*\|.*[^│]$" | grep -v "^$" > /dev/null; then
            echo "⚠️  Window $i (${TEAM_MEMBERS[$i]}): May have UNSENT text"
            echo "Last line: $(tmux capture-pane -t $SESSION:$i -p | tail -1)"
            echo "---"
        fi
        
        # Also check for common signs of incomplete commands
        if echo "$last_lines" | grep -E "(claude '|echo '|bash |npm |git )" | grep -v "│" > /dev/null; then
            echo "⚠️  Window $i (${TEAM_MEMBERS[$i]}): Detected incomplete command"
            echo "Content: $(echo "$last_lines" | grep -E "(claude '|echo '|bash |npm |git )" | tail -1)"
            echo "---"
        fi
    done
}

# Function to send Enter to windows with pending text
fix_pending() {
    echo "Sending Enter to all windows to clear pending text..."
    for i in 0 1 2 3 4 5; do
        tmux send-keys -t $SESSION:$i C-m
        echo "✓ Sent Enter to Window $i (${TEAM_MEMBERS[$i]})"
    done
}

# Main logic
case "$1" in
    "check")
        check_for_pending
        ;;
    "fix")
        fix_pending
        ;;
    "monitor")
        # Continuous monitoring every 30 seconds
        while true; do
            clear
            echo "$(date '+%H:%M:%S') - Monitoring for pending text..."
            echo "========================================="
            check_for_pending
            echo ""
            echo "Next check in 30 seconds... (Ctrl+C to stop)"
            sleep 30
        done
        ;;
    *)
        echo "Usage: $0 {check|fix|monitor}"
        echo "  check   - Check once for pending text"
        echo "  fix     - Send Enter to all windows"
        echo "  monitor - Continuous monitoring every 30s"
        ;;
esac