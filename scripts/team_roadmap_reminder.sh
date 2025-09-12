#!/usr/bin/env bash
# Team roadmap and TDD reminder script
# Runs periodically to ensure team stays on track

SESSION="chatgpt-dev-team"
LOG_FILE="/tmp/team_roadmap_reminder.log"
WORKSPACE="/home/chous/github/rydnr/claude/semantest-workspace"

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

# Function to send message to window
send_to_window() {
    local window=$1
    local message=$2
    tmux send-keys -t $SESSION:$window "$message" C-m
    sleep 0.5
}

# Roadmap reminder for each team member
remind_roadmap() {
    log_message "Sending roadmap reminders..."
    
    # Current roadmap status
    local roadmap_status="📋 ROADMAP STATUS: Phase 2 ✅ | Phase 3 ✅ | Phase 4 (WebSocket→Extension) 🔄 | Phase 5 (Integration) ⏳"
    
    # Send to all team members
    for i in 0 1 2 3 4 5; do
        send_to_window $i "$roadmap_status"
    done
    
    # Specific tasks based on current phase
    send_to_window 0 "Rafa: Review SESSION_ROADMAP.md. Current blocker: Extension WebSocket connection. Ask Anders for help if stuck!"
    send_to_window 1 "Ana: Check ROADMAP.md progress. Document any blockers in journal.org"
    send_to_window 2 "Wences: Phase 4 - Connect extension to ws://localhost:8081 for event reception"
    send_to_window 3 "Fran: Keep WebSocket server stable. Help Wences with connection if needed"
    send_to_window 4 "Elena: CLI is ready. Stand by for integration testing"
    send_to_window 5 "Carlos: Prepare for Phase 5 integration once WebSocket connection works"
}

# TDD emoji reminder
remind_tdd_commits() {
    log_message "Sending TDD commit reminders..."
    
    local tdd_message="🧪 TDD REMINDER: Write test first (🔴 Red) → Make it pass (✅ Green) → Clean up (🔄 Refactor)!"
    local commit_message="💾 COMMIT OFTEN: Use TDD emojis in commits! Examples: '🔴 Add failing test for WebSocket' or '✅ Fix WebSocket connection'"
    
    # Send to all windows
    for i in 0 1 2 3 4 5; do
        send_to_window $i "$tdd_message"
        send_to_window $i "$commit_message"
    done
    
    # Specific TDD tasks
    send_to_window 2 "Wences: 🔴 Write test for WebSocket connection → ✅ Implement → 💾 Commit with emoji!"
    send_to_window 3 "Fran: 🧪 Test WebSocket message handling → 💾 Commit your tests!"
    send_to_window 4 "Elena: 🧪 Keep testing CLI edge cases → 💾 Commit improvements!"
}

# Ask for new tasks if blocked
check_for_blockers() {
    log_message "Checking for blockers and task requests..."
    
    local help_message="🤔 STUCK? Ask Anders for help: 'Anders, I need help with [specific issue]' or 'Anders, what should I work on next?'"
    
    # Send help reminder to all
    for i in 0 1 2 3 4 5; do
        send_to_window $i "$help_message"
    done
    
    # Check specific progress
    send_to_window 0 "Rafa: If team is blocked, ask Anders for architectural guidance!"
    send_to_window 2 "Wences: If WebSocket connection fails, ask Anders for debugging help!"
    send_to_window 5 "Carlos: Review integration checklist, ask Anders if unclear!"
}

# Main execution
main() {
    log_message "=== Team Roadmap & TDD Reminder Cycle ==="
    
    # Step 1: Roadmap reminder
    remind_roadmap
    sleep 3
    
    # Step 2: TDD and commit reminder
    remind_tdd_commits
    sleep 3
    
    # Step 3: Check for blockers
    check_for_blockers
    
    log_message "=== Reminder cycle complete ==="
    echo "" >> $LOG_FILE
}

# Run main function
main