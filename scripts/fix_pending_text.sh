#!/usr/bin/env bash
# Script to detect and fix pending text in tmux windows
# Runs every minute to ensure no messages get stuck

SESSION="chatgpt-dev-team"
LOG_FILE="/tmp/fix_pending_text.log"

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

# Function to check if window has pending text
check_pending_text() {
    local window=$1
    local window_name=$2
    
    # Capture the last few lines of the pane
    local pane_content=$(tmux capture-pane -t $SESSION:$window -p 2>/dev/null | tail -5)
    
    # Check for various prompt patterns that indicate waiting for input
    if echo "$pane_content" | grep -qE "(│ >|> Press up|⏵⏵|╰─+╯)" && \
       ! echo "$pane_content" | grep -qE "(assistant:|user:|\* Tinkering)"; then
        
        # Check if there's actual text after the prompt
        local last_line=$(tmux capture-pane -t $SESSION:$window -p 2>/dev/null | tail -1)
        
        # Look for text that seems incomplete (no terminal markers at the end)
        if [[ -n "$last_line" ]] && [[ ! "$last_line" =~ ^[[:space:]]*$ ]]; then
            log_message "Window $window ($window_name): Found potential pending text: '$last_line'"
            return 0  # Has pending text
        fi
    fi
    
    # Also check for text without any prompt (stuck mid-typing)
    local trimmed=$(echo "$pane_content" | tail -1 | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    if [[ ${#trimmed} -gt 0 ]] && [[ ! "$trimmed" =~ (╭|╰|│|⏵|assistant:|user:|\*) ]]; then
        log_message "Window $window ($window_name): Possible stuck text detected: '$trimmed'"
        return 0  # Likely has pending text
    fi
    
    return 1  # No pending text
}

# Function to send Enter to a window
send_enter() {
    local window=$1
    local window_name=$2
    
    log_message "Sending Enter to Window $window ($window_name)"
    tmux send-keys -t $SESSION:$window C-m 2>/dev/null
    
    # Small delay to let the command process
    sleep 0.5
}

# Main function to check all windows
check_all_windows() {
    local team_names=("Rafa" "Ana" "Wences" "Fran" "Elena" "Carlos")
    local fixed_count=0
    
    log_message "=== Starting pending text check ==="
    
    for i in 0 1 2 3 4 5; do
        if check_pending_text $i "${team_names[$i]}"; then
            send_enter $i "${team_names[$i]}"
            ((fixed_count++))
        fi
    done
    
    if [ $fixed_count -gt 0 ]; then
        log_message "Fixed $fixed_count windows with pending text"
    else
        log_message "No pending text found in any window"
    fi
    
    log_message "=== Check complete ==="
}

# Always send Enter to all windows as a preventive measure
force_enter_all() {
    log_message "Preventive Enter sent to all windows"
    for i in 0 1 2 3 4 5; do
        tmux send-keys -t $SESSION:$i C-m 2>/dev/null
    done
}

# Main execution
main() {
    # First, check for specific pending text
    check_all_windows
    
    # Then, as a safety measure, send Enter to all windows
    # This ensures nothing gets stuck
    force_enter_all
}

# Run main function
main