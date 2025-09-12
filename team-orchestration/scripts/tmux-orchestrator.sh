#!/usr/bin/env bash

# TMUX Orchestrator for Semantest Team
# Sets up tmux session with team members and coordination tools

set -euo pipefail

# Configuration
SESSION_NAME="semantest"
WORKSPACE_ROOT="/home/chous/github/rydnr/claude/semantest-workspace"
TEAM_ORCHESTRATION="$WORKSPACE_ROOT/team-orchestration"

# Team members with their assigned focus areas
declare -A TEAM_ROLES=(
    ["anders"]="Coordinator - Monitoring & Task Distribution"
    ["rafa"]="Backend Lead - Server & WebSocket Implementation"
    ["wences"]="Extension Lead - Chrome Extension & Browser Automation"
    ["alex"]="Testing Lead - TDD & Contract Tests"
    ["ana"]="Frontend Lead - CLI & User Interface"
    ["alfredo"]="Integration Lead - System Integration & E2E"
    ["irene"]="DevOps Lead - Infrastructure & Deployment"
    ["alberto"]="Security - code audit"
    ["ma"]="QA - Testing"
    ["emilio"]="Writer - Github Pages site"
)

# Team member traits and specialties (from documentation)
declare -A TEAM_TRAITS=(
    ["anders"]="Strategic thinker, excellent coordinator, keeps team focused"
    ["rafa"]="Architect, deep understanding of different architecture choices for a given context"
    ["wences"]="Browser automation expert, Chrome extension guru, detail-oriented"
    ["alex"]="DevOps, DX focused"
    ["ana"]="Psychologist, monitors team motivation"
    ["alfredo"]="SOLID advocate, loves literate programming, deep technical expertise, problem solver, Node.js specialist"
    ["irene"]="UX, clean designs, attention to details"
    ["alberto"]="Security, creative"
    ["ma"]="Quality advocate, thorough tester"
    ["emilio"]="Accuracy in technical documentation. Creative, attention to narrative in storytelling"
)

# Colors for different team members
declare -A MEMBER_COLORS=(
    ["anders"]="\033[0;35m"  # Purple (coordinator)
    ["rafa"]="\033[0;34m"    # Blue
    ["wences"]="\033[0;32m"  # Green
    ["alex"]="\033[0;31m"    # Red
    ["ana"]="\033[0;36m"     # Cyan
    ["alfredo"]="\033[1;33m" # Yellow
    ["irene"]="\033[0;37m"   # White
    ["alberto"]="\033[0;34m" # Blue
    ["ma"]="\033[0;32m"      # Green
    ["emilio"]="\033[0;31m"  # Red
)

# Create tmux session with team layout
create_session() {
    echo "🚀 Creating TMUX session: $SESSION_NAME"

    # Kill existing session if it exists
    tmux has-session -t "$SESSION_NAME" 2>/dev/null && tmux kill-session -t "$SESSION_NAME"

    # Create new session with Anders (coordinator) window
    tmux new-session -d -s "$SESSION_NAME" -n "anders" -c "$WORKSPACE_ROOT"
    setup_anders_pane

    # Create windows for each team member
    for member in rafa wences alex ana alfredo irene; do
        tmux new-window -t "$SESSION_NAME" -n "$member" -c "$WORKSPACE_ROOT"
        setup_member_pane "$member"
    done

    # Create monitoring window
    tmux new-window -t "$SESSION_NAME" -n "monitor" -c "$TEAM_ORCHESTRATION"
    setup_monitor_window

    # Select Anders window by default
    tmux select-window -t "$SESSION_NAME:anders"

    echo "✅ TMUX session created successfully!"
}

# Setup Anders' coordinator pane
setup_anders_pane() {
    local pane="$SESSION_NAME:anders"

    # Send initial setup commands
    tmux send-keys -t "$pane" "clear" Enter
    tmux send-keys -t "$pane" "echo '╔════════════════════════════════════════════════════════════╗'" Enter
    tmux send-keys -t "$pane" "echo '║           ANDERS - SEMANTEST TEAM COORDINATOR              ║'" Enter
    tmux send-keys -t "$pane" "echo '╠════════════════════════════════════════════════════════════╣'" Enter
    tmux send-keys -t "$pane" "echo '║ Role: ${TEAM_ROLES[anders]}'" Enter
    tmux send-keys -t "$pane" "echo '║ Traits: ${TEAM_TRAITS[anders]}'" Enter
    tmux send-keys -t "$pane" "echo '╚════════════════════════════════════════════════════════════╝'" Enter
    tmux send-keys -t "$pane" "echo ''" Enter
    tmux send-keys -t "$pane" "echo '📋 Current Tasks:'" Enter
    tmux send-keys -t "$pane" "echo '1. Monitor team progress'" Enter
    tmux send-keys -t "$pane" "echo '2. Distribute tasks from specs/001-the-first-proof/tasks.md'" Enter
    tmux send-keys -t "$pane" "echo '3. Unblock team members'" Enter
    tmux send-keys -t "$pane" "echo '4. Ensure TDD compliance'" Enter
    tmux send-keys -t "$pane" "echo ''" Enter
    tmux send-keys -t "$pane" "echo '🎯 Commands:'" Enter
    tmux send-keys -t "$pane" "echo '  ./team-orchestration/scripts/anders-monitor.sh   # Start monitoring'" Enter
    tmux send-keys -t "$pane" "echo '  @team <message>                                   # Broadcast to team'" Enter
    tmux send-keys -t "$pane" "echo '  @<member> <message>                               # Direct message'" Enter
    tmux send-keys -t "$pane" "echo ''" Enter
    tmux send-keys -t "$pane" "# Ready to coordinate the team" Enter
}

# Setup individual team member pane
setup_member_pane() {
    local member=$1
    local pane="$SESSION_NAME:$member"
    local color=${MEMBER_COLORS[$member]}

    # Send initial setup commands
    tmux send-keys -t "$pane" "clear" Enter
    tmux send-keys -t "$pane" "echo '╔════════════════════════════════════════════════════════════╗'" Enter
    tmux send-keys -t "$pane" "echo '║           ${member^^} - SEMANTEST TEAM MEMBER               ║'" Enter
    tmux send-keys -t "$pane" "echo '╠════════════════════════════════════════════════════════════╣'" Enter
    tmux send-keys -t "$pane" "echo '║ Role: ${TEAM_ROLES[$member]}'" Enter
    tmux send-keys -t "$pane" "echo '║ Traits: ${TEAM_TRAITS[$member]}'" Enter
    tmux send-keys -t "$pane" "echo '╚════════════════════════════════════════════════════════════╝'" Enter
    tmux send-keys -t "$pane" "echo ''" Enter

    # Add member-specific setup
    case "$member" in
    "rafa")
        tmux send-keys -t "$pane" "cd nodejs.server" Enter
        tmux send-keys -t "$pane" "echo '🔧 Focus: Server implementation & WebSocket handling'" Enter
        tmux send-keys -t "$pane" "echo 'Ready to implement server components...'" Enter
        ;;
    "wences")
        tmux send-keys -t "$pane" "cd extension.chrome" Enter
        tmux send-keys -t "$pane" "echo '🔧 Focus: Chrome extension & browser automation'" Enter
        tmux send-keys -t "$pane" "echo 'Ready to implement extension features...'" Enter
        ;;
    "alex")
        tmux send-keys -t "$pane" "echo '🔧 Focus: Writing tests following TDD'" Enter
        tmux send-keys -t "$pane" "echo 'Ready to write contract and integration tests...'" Enter
        ;;
    "ana")
        tmux send-keys -t "$pane" "cd typescript.client" Enter
        tmux send-keys -t "$pane" "echo '🔧 Focus: CLI implementation & user interface'" Enter
        tmux send-keys -t "$pane" "echo 'Ready to implement CLI commands...'" Enter
        ;;
    "alfredo")
        tmux send-keys -t "$pane" "echo '🔧 Focus: System integration & E2E testing'" Enter
        tmux send-keys -t "$pane" "echo 'Ready to integrate components...'" Enter
        ;;
    "irene")
        tmux send-keys -t "$pane" "echo '🔧 Focus: DevOps, deployment & infrastructure'" Enter
        tmux send-keys -t "$pane" "echo 'Ready to setup infrastructure...'" Enter
        ;;
    esac

    tmux send-keys -t "$pane" "echo ''" Enter
    tmux send-keys -t "$pane" "echo '📝 Status Update Commands:'" Enter
    tmux send-keys -t "$pane" "echo '  status start <task>    # Start working on task'" Enter
    tmux send-keys -t "$pane" "echo '  status progress <0-100> # Update progress'" Enter
    tmux send-keys -t "$pane" "echo '  status blocked <reason> # Report blocker'" Enter
    tmux send-keys -t "$pane" "echo '  status complete        # Mark task complete'" Enter
    tmux send-keys -t "$pane" "echo ''" Enter
    tmux send-keys -t "$pane" "# Awaiting task assignment from Anders..." Enter
}

# Setup monitoring window with split panes
setup_monitor_window() {
    local window="$SESSION_NAME:monitor"

    # Main pane - Dashboard
    tmux send-keys -t "$window.0" "watch -n 5 '$TEAM_ORCHESTRATION/scripts/anders-monitor.sh --dashboard'" Enter

    # Split horizontally for logs
    tmux split-window -t "$window" -v -p 30
    tmux send-keys -t "$window.1" "tail -f $TEAM_ORCHESTRATION/logs/status-updates.log" Enter

    # Split vertically for alerts
    tmux split-window -t "$window.1" -h
    tmux send-keys -t "$window.2" "tail -f $TEAM_ORCHESTRATION/status/anders-alerts.log" Enter
}

# Send message to team member or broadcast
send_message() {
    local target=$1
    shift
    local message="$*"

    if [[ "$target" == "@team" ]]; then
        # Broadcast to all
        for member in anders rafa wences alex ana alfredo irene; do
            tmux send-keys -t "$SESSION_NAME:$member" "# 📢 TEAM: $message" Enter
        done
        echo "📢 Broadcasted: $message"
    else
        # Send to specific member
        local member=${target#@}
        if tmux has-session -t "$SESSION_NAME:$member" 2>/dev/null; then
            tmux send-keys -t "$SESSION_NAME:$member" "# 💬 Message: $message" Enter
            echo "💬 Sent to $member: $message"
        else
            echo "❌ Member $member not found"
        fi
    fi
}

# Attach to session
attach_session() {
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        echo "📎 Attaching to $SESSION_NAME session..."
        tmux attach-session -t "$SESSION_NAME"
    else
        echo "❌ Session $SESSION_NAME not found. Create it first with: $0 create"
    fi
}

# Start all monitoring services
start_services() {
    echo "🚀 Starting monitoring services..."

    # Start Anders monitor in background
    nohup "$TEAM_ORCHESTRATION/scripts/anders-monitor.sh" >"$TEAM_ORCHESTRATION/logs/anders-monitor.log" 2>&1 &
    echo $! >"$TEAM_ORCHESTRATION/.anders-monitor.pid"

    # Start task reminder service
    nohup "$TEAM_ORCHESTRATION/scripts/task-reminder.sh" >"$TEAM_ORCHESTRATION/logs/task-reminder.log" 2>&1 &
    echo $! >"$TEAM_ORCHESTRATION/.task-reminder.pid"

    echo "✅ Services started"
}

# Stop all monitoring services
stop_services() {
    echo "🛑 Stopping monitoring services..."

    for pidfile in "$TEAM_ORCHESTRATION"/.*.pid; do
        if [[ -f "$pidfile" ]]; then
            kill "$(cat "$pidfile")" 2>/dev/null || true
            rm "$pidfile"
        fi
    done

    echo "✅ Services stopped"
}

# Show usage
show_usage() {
    cat <<EOF
TMUX Orchestrator for Semantest Team

Usage:
  $0 create              # Create tmux session with team layout
  $0 attach              # Attach to existing session
  $0 start               # Start monitoring services
  $0 stop                # Stop monitoring services
  $0 send <target> <msg> # Send message (@team or @member)
  $0 status              # Show team status
  $0 help                # Show this help

Examples:
  $0 create                    # Setup team session
  $0 send @team "Stand-up in 5 minutes"
  $0 send @rafa "Please check WebSocket connection"
  $0 attach                    # Join the session

Team Members:
  anders - Coordinator
  rafa   - Backend Lead
  wences - Extension Lead
  alex   - Testing Lead
  ana    - Frontend Lead
  alfredo - Integration Lead
  irene  - DevOps Lead

Navigation in TMUX:
  Ctrl+b, n     - Next window
  Ctrl+b, p     - Previous window
  Ctrl+b, 0-8   - Switch to window by number
  Ctrl+b, d     - Detach from session
  Ctrl+b, ?     - Show all keybindings
EOF
}

# Show team status
show_status() {
    echo "📊 Team Status Overview"
    echo "═══════════════════════════════════════════"

    for member in anders rafa wences alex ana alfredo irene; do
        local status_file="$TEAM_ORCHESTRATION/status/$member.status"
        if [[ -f "$status_file" ]]; then
            local status=$(jq -r '.status' "$status_file" 2>/dev/null || echo "unknown")
            local task=$(jq -r '.current_task' "$status_file" 2>/dev/null || echo "none")
            local progress=$(jq -r '.progress' "$status_file" 2>/dev/null || echo "0")

            printf "%-10s: %-10s | %3d%% | %s\n" "$member" "$status" "$progress" "$task"
        else
            printf "%-10s: no status file\n" "$member"
        fi
    done
}

# Main command dispatcher
main() {
    case "${1:-help}" in
    create)
        create_session
        start_services
        echo ""
        echo "💡 Next steps:"
        echo "  1. Attach to session: $0 attach"
        echo "  2. Navigate with Ctrl+b, n/p or Ctrl+b, [0-8]"
        echo "  3. Anders should distribute tasks from tasks.md"
        ;;
    attach)
        attach_session
        ;;
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    send)
        shift
        send_message "$@"
        ;;
    status)
        show_status
        ;;
    help | --help | -h)
        show_usage
        ;;
    *)
        echo "Unknown command: $1"
        show_usage
        exit 1
        ;;
    esac
}

# Ensure required directories exist
mkdir -p "$TEAM_ORCHESTRATION"/{scripts,logs,status}

# Run main function
main "$@"
