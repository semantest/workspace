#!/usr/bin/env bash

# Team Member Status Update Script
# Allows team members to update their status and progress

set -euo pipefail

WORKSPACE_ROOT="/home/chous/github/rydnr/claude/semantest-workspace"
STATUS_DIR="$WORKSPACE_ROOT/team-orchestration/status"
LOGS_DIR="$WORKSPACE_ROOT/team-orchestration/logs"

# Update member status
update_status() {
    local member=$1
    local status=$2
    local task="${3:-}"
    local progress="${4:-0}"
    local blocked="${5:-false}"
    local blocker_reason="${6:-}"
    local needs_help="${7:-false}"

    local status_file="$STATUS_DIR/$member.status"
    local timestamp=$(date -Iseconds)

    # Create status update
    cat >"$status_file" <<EOF
{
  "name": "$member",
  "current_task": "$task",
  "status": "$status",
  "last_update": "$timestamp",
  "progress": $progress,
  "blocked": $blocked,
  "blocker_reason": "$blocker_reason",
  "needs_help": $needs_help,
  "task_start_time": $(date +%s)
}
EOF

    # Log the update
    echo "[$timestamp] $member: Status=$status, Task=$task, Progress=$progress%" >>"$LOGS_DIR/status-updates.log"

    # Notify if blocked or needs help
    if [[ "$blocked" == "true" ]] || [[ "$needs_help" == "true" ]]; then
        notify_anders "$member" "$task" "$blocker_reason"
    fi

    echo "✅ Status updated for $member"
}

# Notify Anders of issues
notify_anders() {
    local member=$1
    local task=$2
    local reason=$3

    local alert_msg="🚨 $member needs assistance with: $task"
    [[ -n "$reason" ]] && alert_msg="$alert_msg (Reason: $reason)"

    echo "$alert_msg" >>"$STATUS_DIR/anders-alerts.log"

    # Send to Anders' tmux pane if available
    if tmux has-session -t "semantest" 2>/dev/null; then
        tmux send-keys -t "semantest:anders" "# $alert_msg" Enter
    fi
}

# Interactive status update
interactive_update() {
    local member=${1:-}

    if [[ -z "$member" ]]; then
        echo "Team Members: Rafa, Wences, Alex, Ana, Alfredo, Irene"
        read -p "Enter your name: " member
    fi

    echo "Status Options: idle, working, blocked, completed"
    read -p "Current status: " status

    read -p "Current task (or press Enter to keep current): " task

    if [[ "$status" == "working" ]] || [[ "$status" == "completed" ]]; then
        read -p "Progress (0-100): " progress
    else
        progress=0
    fi

    if [[ "$status" == "blocked" ]]; then
        blocked=true
        read -p "What's blocking you?: " blocker_reason
        needs_help=true
    else
        blocked=false
        blocker_reason=""
        read -p "Do you need help? (y/n): " need_help_input
        [[ "$need_help_input" == "y" ]] && needs_help=true || needs_help=false
    fi

    update_status "$member" "$status" "$task" "$progress" "$blocked" "$blocker_reason" "$needs_help"
}

# Quick status commands
quick_update() {
    case "$1" in
    start)
        update_status "$2" "working" "$3" "0" "false" "" "false"
        echo "🚀 $2 started working on: $3"
        ;;
    progress)
        local current_task=$(jq -r '.current_task' "$STATUS_DIR/$2.status" 2>/dev/null)
        update_status "$2" "working" "$current_task" "$3" "false" "" "false"
        echo "📊 $2 progress updated to $3%"
        ;;
    blocked)
        local current_task=$(jq -r '.current_task' "$STATUS_DIR/$2.status" 2>/dev/null)
        update_status "$2" "blocked" "$current_task" "0" "true" "${3:-unknown}" "true"
        echo "⚠️  $2 is blocked!"
        ;;
    complete)
        local current_task=$(jq -r '.current_task' "$STATUS_DIR/$2.status" 2>/dev/null)
        update_status "$2" "completed" "$current_task" "100" "false" "" "false"
        echo "✅ $2 completed task!"
        ;;
    help)
        local current_task=$(jq -r '.current_task' "$STATUS_DIR/$2.status" 2>/dev/null)
        local progress=$(jq -r '.progress' "$STATUS_DIR/$2.status" 2>/dev/null)
        update_status "$2" "working" "$current_task" "$progress" "false" "" "true"
        echo "🆘 Help request sent for $2"
        ;;
    *)
        echo "Unknown command: $1"
        echo "Usage: $0 [start|progress|blocked|complete|help] <member> [args]"
        exit 1
        ;;
    esac
}

# Main entry point
main() {
    mkdir -p "$STATUS_DIR" "$LOGS_DIR"

    if [[ $# -eq 0 ]]; then
        # Interactive mode
        interactive_update
    elif [[ $# -eq 1 ]]; then
        # Interactive mode with member name
        interactive_update "$1"
    else
        # Quick update mode
        quick_update "$@"
    fi
}

# Show usage
show_usage() {
    cat <<EOF
Team Status Update Tool

Usage:
  $0                    # Interactive mode
  $0 <member>          # Interactive mode for specific member
  $0 start <member> <task>    # Start new task
  $0 progress <member> <0-100> # Update progress
  $0 blocked <member> [reason] # Mark as blocked
  $0 complete <member>         # Mark task complete
  $0 help <member>            # Request help

Examples:
  $0 start Rafa "Implement WebSocket connection"
  $0 progress Rafa 50
  $0 blocked Wences "Port 8080 already in use"
  $0 complete Ana
  $0 help Alex

Team Members: Rafa, Wences, Alex, Ana, Alfredo, Irene
EOF
}

# Check for help flag
if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    show_usage
    exit 0
fi

# Run main function
main "$@"
