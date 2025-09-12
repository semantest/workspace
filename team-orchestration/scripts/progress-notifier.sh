#!/usr/bin/env bash
# Progress Notification System
# Sends notifications for milestones, blockers, and achievements

set -euo pipefail

WORKSPACE_ROOT="/home/chous/github/rydnr/claude/semantest-workspace"
STATUS_DIR="$WORKSPACE_ROOT/team-orchestration/status"
LOGS_DIR="$WORKSPACE_ROOT/team-orchestration/logs"
NOTIFICATION_LOG="$LOGS_DIR/notifications.log"

# Notification types with emojis
declare -A NOTIFICATION_TYPES=(
    ["milestone"]="🎯"
    ["achievement"]="🏆"
    ["warning"]="⚠️"
    ["blocker"]="🚨"
    ["help"]="🆘"
    ["info"]="ℹ️"
    ["success"]="✅"
    ["failure"]="❌"
    ["reminder"]="⏰"
    ["celebration"]="🎉"
)

# Milestones for the project
declare -A PROJECT_MILESTONES=(
    ["10"]="Project kickoff - Team assembled!"
    ["25"]="Foundation complete - Core structure in place"
    ["50"]="Halfway there - Major components implemented"
    ["75"]="Home stretch - Integration phase"
    ["90"]="Almost done - Final testing"
    ["100"]="Project complete - Time to celebrate!"
)

# Send notification to team
send_notification() {
    local type=$1
    local recipient=$2
    local message=$3
    local priority=${4:-normal}
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    local emoji=${NOTIFICATION_TYPES[$type]:-"📢"}

    # Format notification
    local formatted_msg="$emoji [$type] $message"

    # Log notification
    echo "[$timestamp] $recipient: $formatted_msg (priority: $priority)" >>"$NOTIFICATION_LOG"

    # Send to tmux if available
    if [[ "$recipient" == "TEAM" ]]; then
        broadcast_notification "$formatted_msg" "$priority"
    else
        send_to_member "$recipient" "$formatted_msg" "$priority"
    fi

    # Show desktop notification if available
    if command -v notify-send &>/dev/null; then
        notify-send "Semantest Team" "$formatted_msg" -i dialog-information
    fi

    echo "$formatted_msg"
}

# Broadcast to all team members
broadcast_notification() {
    local message=$1
    local priority=$2

    if tmux has-session -t "semantest" 2>/dev/null; then
        for member in anders rafa wences alex ana alfredo irene alberto ma emilio; do
            send_to_member "$member" "$message" "$priority"
        done
    fi
}

# Send to specific team member
send_to_member() {
    local member=$1
    local message=$2
    local priority=$3

    if tmux has-session -t "semantest:$member" 2>/dev/null; then
        # Clear line for high priority
        [[ "$priority" == "high" ]] && tmux send-keys -t "semantest:$member" C-l

        # Send message with color based on priority
        case "$priority" in
        "critical")
            tmux send-keys -t "semantest:$member" "echo -e '\033[1;31m$message\033[0m'" Enter
            ;;
        "high")
            tmux send-keys -t "semantest:$member" "echo -e '\033[0;31m$message\033[0m'" Enter
            ;;
        "normal")
            tmux send-keys -t "semantest:$member" "echo -e '\033[0;33m$message\033[0m'" Enter
            ;;
        "low")
            tmux send-keys -t "semantest:$member" "echo -e '\033[0;36m$message\033[0m'" Enter
            ;;
        esac
    fi
}

# Check for milestone achievements
check_milestones() {
    local overall_progress=$(calculate_overall_progress)

    for milestone in "${!PROJECT_MILESTONES[@]}"; do
        local milestone_file="$STATUS_DIR/.milestone-$milestone"

        if [[ $overall_progress -ge $milestone ]] && [[ ! -f "$milestone_file" ]]; then
            # Milestone reached!
            send_notification "milestone" "TEAM" "${PROJECT_MILESTONES[$milestone]}" "high"
            touch "$milestone_file"

            # Special celebration for 100%
            if [[ $milestone -eq 100 ]]; then
                celebrate_completion
            fi
        fi
    done
}

# Calculate overall project progress
calculate_overall_progress() {
    local total_progress=0
    local member_count=0

    for member in rafa wences alex ana alfredo irene; do
        local status_file="$STATUS_DIR/$member.status"
        if [[ -f "$status_file" ]]; then
            local progress=$(jq -r '.progress // 0' "$status_file" 2>/dev/null)
            total_progress=$((total_progress + progress))
            ((member_count++))
        fi
    done

    if [[ $member_count -gt 0 ]]; then
        echo $((total_progress / member_count))
    else
        echo 0
    fi
}

# Celebrate project completion
celebrate_completion() {
    send_notification "celebration" "TEAM" "🎊 CONGRATULATIONS! Project successfully completed! 🎊" "critical"

    # ASCII art celebration
    if tmux has-session -t "semantest" 2>/dev/null; then
        for member in anders rafa wences alex ana alfredo irene alberto ma emilio; do
            tmux send-keys -t "semantest:$member" "clear" Enter
            tmux send-keys -t "semantest:$member" "cat << 'EOF'" Enter
            tmux send-keys -t "semantest:$member" "╔══════════════════════════════════════════╗" Enter
            tmux send-keys -t "semantest:$member" "║     🎉 PROJECT COMPLETE! 🎉              ║" Enter
            tmux send-keys -t "semantest:$member" "║                                          ║" Enter
            tmux send-keys -t "semantest:$member" "║    Great work, Semantest Team!           ║" Enter
            tmux send-keys -t "semantest:$member" "║                                          ║" Enter
            tmux send-keys -t "semantest:$member" "╚══════════════════════════════════════════╝" Enter
            tmux send-keys -t "semantest:$member" "EOF" Enter
        done
    fi
}

# Monitor for blockers and send help notifications
monitor_blockers() {
    for member in rafa wences alex ana alfredo irene; do
        local status_file="$STATUS_DIR/$member.status"
        if [[ -f "$status_file" ]]; then
            local blocked=$(jq -r '.blocked' "$status_file" 2>/dev/null)
            local needs_help=$(jq -r '.needs_help' "$status_file" 2>/dev/null)
            local blocker_notified="$STATUS_DIR/.blocker-notified-$member"

            if [[ "$blocked" == "true" ]] && [[ ! -f "$blocker_notified" ]]; then
                local reason=$(jq -r '.blocker_reason // "Unknown"' "$status_file" 2>/dev/null)
                send_notification "blocker" "anders" "$member is blocked: $reason" "high"
                touch "$blocker_notified"
            elif [[ "$blocked" == "false" ]] && [[ -f "$blocker_notified" ]]; then
                # Blocker resolved
                send_notification "success" "TEAM" "$member is unblocked and back on track!" "normal"
                rm "$blocker_notified"
            fi

            if [[ "$needs_help" == "true" ]]; then
                local help_notified="$STATUS_DIR/.help-notified-$member"
                if [[ ! -f "$help_notified" ]]; then
                    send_notification "help" "TEAM" "$member needs assistance!" "high"
                    touch "$help_notified"
                fi
            fi
        fi
    done
}

# Send daily summary
send_daily_summary() {
    local hour=$(date +%H)
    local summary_file="$STATUS_DIR/.daily-summary-$(date +%Y%m%d)"

    # Send summary at 10 AM and 4 PM
    if { [[ $hour -eq 10 ]] || [[ $hour -eq 16 ]]; } && [[ ! -f "$summary_file-$hour" ]]; then
        local overall_progress=$(calculate_overall_progress)
        local active_count=0
        local blocked_count=0

        for member in rafa wences alex ana alfredo irene; do
            local status_file="$STATUS_DIR/$member.status"
            if [[ -f "$status_file" ]]; then
                local status=$(jq -r '.status' "$status_file" 2>/dev/null)
                [[ "$status" == "working" ]] && ((active_count++))
                [[ "$status" == "blocked" ]] && ((blocked_count++))
            fi
        done

        local summary="Daily Summary - Progress: ${overall_progress}% | Active: $active_count | Blocked: $blocked_count"
        send_notification "info" "TEAM" "$summary" "normal"

        touch "$summary_file-$hour"
    fi
}

# Monitor individual achievements
check_achievements() {
    for member in rafa wences alex ana alfredo irene; do
        local status_file="$STATUS_DIR/$member.status"
        if [[ -f "$status_file" ]]; then
            local progress=$(jq -r '.progress' "$status_file" 2>/dev/null)
            local status=$(jq -r '.status' "$status_file" 2>/dev/null)
            local achievement_file="$STATUS_DIR/.achievement-$member-$progress"

            # Celebrate individual task completion
            if [[ "$progress" -eq 100 ]] && [[ "$status" == "completed" ]] && [[ ! -f "$achievement_file" ]]; then
                local task=$(jq -r '.current_task' "$status_file" 2>/dev/null)
                send_notification "achievement" "TEAM" "$member completed: $task" "normal"
                touch "$achievement_file"
            fi
        fi
    done
}

# Main monitoring loop
main() {
    echo "Starting progress notification system..."
    mkdir -p "$LOGS_DIR" "$STATUS_DIR"

    # Initial notification
    send_notification "info" "TEAM" "Progress notification system online" "low"

    while true; do
        # Check various notification triggers
        check_milestones
        monitor_blockers
        check_achievements
        send_daily_summary

        # Wait before next check
        sleep 30
    done
}

# Handle manual notifications
manual_notify() {
    local type=${1:-info}
    local recipient=${2:-TEAM}
    local message=${3:-"Test notification"}
    local priority=${4:-normal}

    send_notification "$type" "$recipient" "$message" "$priority"
}

# Show usage
show_usage() {
    cat <<EOF
Progress Notification System

Usage:
  $0                    # Start monitoring loop
  $0 notify <type> <recipient> <message> [priority]
  $0 status            # Show current progress
  $0 help              # Show this help

Notification Types:
  milestone, achievement, warning, blocker, help,
  info, success, failure, reminder, celebration

Recipients:
  TEAM - Broadcast to all
  anders, rafa, wences, alex, ana, alfredo, irene

Priority Levels:
  critical, high, normal, low

Examples:
  $0 notify info TEAM "Stand-up meeting in 5 minutes"
  $0 notify blocker anders "WebSocket connection failing" high
  $0 notify achievement TEAM "First test passing!" normal
EOF
}

# Command dispatcher
if [[ $# -gt 0 ]]; then
    case "$1" in
    notify)
        shift
        manual_notify "$@"
        ;;
    status)
        echo "Overall Progress: $(calculate_overall_progress)%"
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
else
    # Run monitoring loop
    trap 'echo "Notification system stopped"; exit 0' INT TERM
    main
fi
