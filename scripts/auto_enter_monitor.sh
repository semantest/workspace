#!/usr/bin/env bash
# Auto-monitor and fix unsent messages in agent tabs
# Runs continuously to ensure agents receive their commands

SESSION="chatgpt-dev-team"
TEAM_MEMBERS=("Rafa" "Ana" "Wences" "Fran" "Elena" "Carlos")
CHECK_INTERVAL=10  # Check every 10 seconds
LOG_FILE="/tmp/tmux_monitor.log"

# Function to check if a window has unsent text
has_unsent_text() {
    local window=$1
    local last_lines=$(tmux capture-pane -t $SESSION:$window -p 2>/dev/null | tail -5)
    
    # Check for various signs of unsent text
    if echo "$last_lines" | grep -E "│   [^│]+$" > /dev/null 2>&1; then
        return 0  # Has unsent text
    fi
    
    # Check for commands that look incomplete
    if echo "$last_lines" | grep -E "^(claude |bash |echo |npm |git |#)" | grep -v "│" > /dev/null 2>&1; then
        return 0  # Has unsent text
    fi
    
    # Check if NOT at the prompt
    if ! echo "$last_lines" | grep -q "⏵⏵" 2>/dev/null; then
        # If there's recent text but no prompt, might be unsent
        if echo "$last_lines" | grep -E "[a-zA-Z]" > /dev/null 2>&1; then
            return 0  # Likely has unsent text
        fi
    fi
    
    return 1  # No unsent text detected
}

# Function to send Enter to a specific window
send_enter_to_window() {
    local window=$1
    tmux send-keys -t $SESSION:$window C-m 2>/dev/null
    echo "$(date '+%H:%M:%S') - Sent Enter to Window $window (${TEAM_MEMBERS[$window]})" | tee -a $LOG_FILE
}

# Function to check all windows and fix if needed
check_and_fix_all() {
    local fixed_count=0
    
    for i in 0 1 2 3 4 5; do
        if has_unsent_text $i; then
            echo "$(date '+%H:%M:%S') - ⚠️  Window $i (${TEAM_MEMBERS[$i]}) has unsent text" | tee -a $LOG_FILE
            send_enter_to_window $i
            ((fixed_count++))
        fi
    done
    
    if [ $fixed_count -gt 0 ]; then
        echo "$(date '+%H:%M:%S') - Fixed $fixed_count windows with unsent text" | tee -a $LOG_FILE
    fi
    
    return $fixed_count
}

# Function to run continuous monitoring
monitor_loop() {
    echo "$(date '+%H:%M:%S') - Starting auto-enter monitor for $SESSION" | tee $LOG_FILE
    echo "Checking every $CHECK_INTERVAL seconds for unsent messages..." | tee -a $LOG_FILE
    echo "Press Ctrl+C to stop" | tee -a $LOG_FILE
    echo "---" | tee -a $LOG_FILE
    
    local total_fixes=0
    local check_count=0
    
    while true; do
        ((check_count++))
        
        # Only show output if there's something to fix
        check_and_fix_all
        local fixes=$?
        ((total_fixes += fixes))
        
        # Every 6 checks (1 minute), show a status update
        if [ $((check_count % 6)) -eq 0 ]; then
            echo "$(date '+%H:%M:%S') - Status: $check_count checks, $total_fixes total fixes" | tee -a $LOG_FILE
        fi
        
        sleep $CHECK_INTERVAL
    done
}

# Function to do a single check and report
single_check() {
    echo "=== Checking for unsent messages in all windows ==="
    local has_issues=false
    
    for i in 0 1 2 3 4 5; do
        if has_unsent_text $i; then
            echo "⚠️  Window $i (${TEAM_MEMBERS[$i]}): Has UNSENT text"
            has_issues=true
        else
            echo "✅ Window $i (${TEAM_MEMBERS[$i]}): Clear"
        fi
    done
    
    if [ "$has_issues" = true ]; then
        echo ""
        echo "Run '$0 fix' to send Enter to windows with unsent text"
    else
        echo ""
        echo "All windows are clear!"
    fi
}

# Function to force send Enter to all windows
force_fix_all() {
    echo "Sending Enter to ALL windows..."
    for i in 0 1 2 3 4 5; do
        send_enter_to_window $i
    done
    echo "Done! All windows should now be active."
}

# Main script logic
case "$1" in
    "start"|"monitor")
        monitor_loop
        ;;
    "check")
        single_check
        ;;
    "fix")
        check_and_fix_all
        ;;
    "force")
        force_fix_all
        ;;
    "log")
        tail -f $LOG_FILE
        ;;
    *)
        echo "Usage: $0 {start|check|fix|force|log}"
        echo ""
        echo "  start  - Start continuous monitoring (checks every $CHECK_INTERVAL seconds)"
        echo "  check  - Check once and report status"
        echo "  fix    - Fix windows that have unsent text"
        echo "  force  - Force Enter to ALL windows"
        echo "  log    - View the monitoring log"
        echo ""
        echo "Example: $0 start &  # Run in background"
        ;;
esac