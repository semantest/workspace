#!/usr/bin/env bash
# Comprehensive team management script for cron
# Runs every few minutes to ensure team progress

SESSION="chatgpt-dev-team"
LOG_FILE="/tmp/team_cron_manager.log"
WORKSPACE="/home/chous/github/rydnr/claude/semantest-workspace"

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

# Function to send message with guaranteed Enter
send_to_window() {
    local window=$1
    local message=$2
    tmux send-keys -t $SESSION:$window "$message" C-m
    sleep 0.5  # Small delay to ensure message is sent
}

# Step A: Check and fix pending text
fix_pending_text() {
    log_message "Checking for pending text..."
    
    for i in 0 1 2 3 4 5; do
        # Check if window has text after prompt but no recent activity
        local last_line=$(tmux capture-pane -t $SESSION:$i -p 2>/dev/null | tail -1)
        
        # Send Enter to all windows to ensure no stuck text
        tmux send-keys -t $SESSION:$i C-m 2>/dev/null
    done
    
    log_message "Sent Enter to all windows"
}

# Step B: TDD Emoji Reminder
remind_tdd() {
    log_message "Sending TDD reminders..."
    
    local tdd_message="🧪 TDD Reminder: Red 🔴 (write failing test) → Green ✅ (make it pass) → Refactor 🔄 (clean up)! Use these emojis in commits!"
    
    for i in 0 1 2 3 4 5; do
        send_to_window $i "$tdd_message"
    done
}

# Step C: Ana's monitoring reminder
remind_ana_monitoring() {
    log_message "Reminding Ana to monitor and update journal..."
    
    send_to_window 1 "Ana: UPDATE journal.org NOW! Check all windows:"
    send_to_window 1 "- Window 0: Rafa (Tech Lead) - tmux capture-pane -t chatgpt-dev-team:0 -p | tail -20"
    send_to_window 1 "- Window 2: Wences (Browser) - Check if he tested in real browser!"
    send_to_window 1 "- Window 3: Fran (Server) - WebSocket progress?"
    send_to_window 1 "- Window 4: Elena (CLI) - Event sending ready?"
    send_to_window 1 "- Window 5: Carlos (Integration) - Any blockers?"
    send_to_window 1 "Write findings to journal.org: echo '* $(date)' >> journal.org"
}

# Step D: Specific roadmap focus for each member
assign_specific_tasks() {
    log_message "Assigning specific roadmap tasks to each member..."
    
    # Rafa - Tech Lead (Window 0)
    send_to_window 0 "Rafa: FOCUS - Ensure Wences tests in browser! Phase 2 is blocking everything. Check WENCES_DOD.md compliance!"
    
    # Ana - Monitor (Window 1)
    send_to_window 1 "Ana: MONITOR - Track Phase 2 completion. Document in journal.org. Is Wences testing in real browser?"
    
    # Wences - Browser (Window 2) - CRITICAL PATH
    send_to_window 2 "🚨 Wences: PHASE 2 CRITICAL - Test idle detector in REAL BROWSER NOW!"
    send_to_window 2 "1. Build extension: cd extension.chrome && npm run build"
    send_to_window 2 "2. Load in Chrome PID 1224560 at chrome://extensions"
    send_to_window 2 "3. Navigate to chatgpt.com"
    send_to_window 2 "4. Test MutationObserver detects idle/busy"
    send_to_window 2 "5. Take screenshots as PROOF!"
    send_to_window 2 "THIS IS BLOCKING THE ENTIRE TEAM!"
    
    # Fran - Server (Window 3)
    send_to_window 3 "Fran: PHASE 3 - WebSocket server at ws://localhost:8081/ws"
    send_to_window 3 "Create nodejs.server/src/websocket-server.js with:"
    send_to_window 3 "- WebSocket.Server on port 8081"
    send_to_window 3 "- Handle 'connection' events"
    send_to_window 3 "- Route events by domain field"
    send_to_window 3 "Test with: wscat -c ws://localhost:8081/ws"
    
    # Elena - CLI (Window 4)
    send_to_window 4 "Elena: PHASE 4 PREP - CLI must send events with domain!"
    send_to_window 4 "Create typescript.client/src/cli.ts with:"
    send_to_window 4 "- Send ImageGenerationRequestedEvent"
    send_to_window 4 "- Include domain: 'chatgpt.com' in payload"
    send_to_window 4 "- Args: --prompt 'text' --output /path/to/image.png"
    send_to_window 4 "Test with: node cli.js --domain chatgpt.com --prompt 'test'"
    
    # Carlos - Integration (Window 5)
    send_to_window 5 "Carlos: INTEGRATION - Coordinate Phase transitions!"
    send_to_window 5 "- Phase 2 (Wences): Browser testing - IN PROGRESS"
    send_to_window 5 "- Phase 3 (Fran): WebSocket ready? Check port 8081"
    send_to_window 5 "- Phase 4 (Elena): CLI sending domain field?"
    send_to_window 5 "- Document blockers and help team!"
}

# Function to check for actual progress
check_progress() {
    log_message "Checking for actual code changes..."
    
    # Check for new files or commits
    local has_progress=false
    
    # Check extension.chrome
    if [ -f "$WORKSPACE/extension.chrome/src/chatgpt-detector.js" ] || \
       [ -f "$WORKSPACE/extension.chrome/src/idle-detector.js" ]; then
        log_message "✅ Wences has created detector file"
        has_progress=true
    else
        log_message "❌ Wences hasn't created detector file yet"
    fi
    
    # Check nodejs.server
    if [ -f "$WORKSPACE/nodejs.server/src/websocket-server.js" ]; then
        log_message "✅ Fran has created WebSocket server"
        has_progress=true
    else
        log_message "❌ Fran hasn't created WebSocket server yet"
    fi
    
    # Check typescript.client
    if [ -f "$WORKSPACE/typescript.client/src/cli.ts" ] || \
       [ -f "$WORKSPACE/typescript.client/src/cli.js" ]; then
        log_message "✅ Elena has created CLI"
        has_progress=true
    else
        log_message "❌ Elena hasn't created CLI yet"
    fi
    
    if [ "$has_progress" = false ]; then
        log_message "⚠️ NO PROGRESS DETECTED - Sending urgent reminders!"
        send_to_window 0 "🚨 NO PROGRESS! Team needs to CREATE FILES NOW!"
        send_to_window 2 "🚨 Wences: CREATE detector file and TEST IN BROWSER!"
        send_to_window 3 "🚨 Fran: CREATE websocket-server.js NOW!"
        send_to_window 4 "🚨 Elena: CREATE cli.ts NOW!"
    fi
}

# Main execution
main() {
    log_message "=== Starting team cron management cycle ==="
    
    # Step A: Fix pending text
    fix_pending_text
    sleep 2
    
    # Step B: TDD reminder
    remind_tdd
    sleep 2
    
    # Step C: Ana monitoring
    remind_ana_monitoring
    sleep 2
    
    # Step D: Specific tasks
    assign_specific_tasks
    sleep 2
    
    # Check progress
    check_progress
    
    log_message "=== Cron cycle complete ==="
    echo "" >> $LOG_FILE
}

# Run main function
main