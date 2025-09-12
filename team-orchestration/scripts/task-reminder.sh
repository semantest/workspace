#!/usr/bin/env bash

# Task Reminder Automation Script
# Sends automated reminders based on task priority and deadlines

set -euo pipefail

WORKSPACE_ROOT="/home/chous/github/rydnr/claude/semantest-workspace"
STATUS_DIR="$WORKSPACE_ROOT/team-orchestration/status"
LOGS_DIR="$WORKSPACE_ROOT/team-orchestration/logs"
TASKS_FILE="$WORKSPACE_ROOT/specs/001-the-first-proof/tasks.md"

# Reminder configuration
REMINDER_LEVELS=(
    "gentle:30:Hey, just checking in on your progress!"
    "normal:60:Reminder: Please update your task status."
    "urgent:90:URGENT: Task requires immediate attention!"
    "critical:120:CRITICAL: Escalating to coordinator - task severely delayed!"
)

# Priority task list
HIGH_PRIORITY_TASKS=(
    "WebSocket connection establishment"
    "Event handler implementation"
    "Browser extension loading"
    "ChatGPT state detection"
    "Image download handling"
)

# Check task progress and send appropriate reminders
check_task_progress() {
    local member=$1
    local task=$2
    local start_time=$3
    local current_time=$(date +%s)
    local elapsed=$((current_time - start_time))
    local elapsed_minutes=$((elapsed / 60))

    for reminder in "${REMINDER_LEVELS[@]}"; do
        IFS=':' read -r level minutes message <<<"$reminder"

        if [[ $elapsed_minutes -ge $minutes ]]; then
            if ! reminder_already_sent "$member" "$level" "$current_time"; then
                send_task_reminder "$member" "$level" "$message" "$task"
                mark_reminder_sent "$member" "$level" "$current_time"
            fi
        fi
    done
}

# Send task-specific reminder
send_task_reminder() {
    local member=$1
    local level=$2
    local message=$3
    local task=$4
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")

    # Color based on level
    case "$level" in
    "gentle")
        color="\033[0;36m" # Cyan
        emoji="💭"
        ;;
    "normal")
        color="\033[1;33m" # Yellow
        emoji="⏰"
        ;;
    "urgent")
        color="\033[0;31m" # Red
        emoji="🚨"
        ;;
    "critical")
        color="\033[1;31m" # Bold Red
        emoji="🔥"
        # Also notify Anders
        notify_coordinator "$member" "$task"
        ;;
    esac

    # Format reminder message
    local full_message="$emoji [$level] $message\nTask: $task"

    # Log reminder
    echo "[$timestamp] $level reminder to $member: $task" >>"$LOGS_DIR/task-reminders.log"

    # Send to tmux if available
    if tmux has-session -t "semantest" 2>/dev/null; then
        tmux send-keys -t "semantest:$member" C-l
        tmux send-keys -t "semantest:$member" "# $full_message" Enter
    fi

    echo -e "${color}$full_message\033[0m"
}

# Check if reminder was already sent recently
reminder_already_sent() {
    local member=$1
    local level=$2
    local current_time=$3
    local reminder_file="$STATUS_DIR/.reminders/$member-$level"

    if [[ -f "$reminder_file" ]]; then
        local last_sent=$(cat "$reminder_file")
        local time_diff=$((current_time - last_sent))
        # Don't resend same level reminder within 15 minutes
        [[ $time_diff -lt 900 ]] && return 0
    fi

    return 1
}

# Mark reminder as sent
mark_reminder_sent() {
    local member=$1
    local level=$2
    local timestamp=$3

    mkdir -p "$STATUS_DIR/.reminders"
    echo "$timestamp" >"$STATUS_DIR/.reminders/$member-$level"
}

# Notify coordinator about critical delays
notify_coordinator() {
    local member=$1
    local task=$2
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")

    cat >>"$STATUS_DIR/anders-alerts.log" <<EOF
[$timestamp] ALERT: $member is critically delayed on task: $task
Action required: Consider reassignment or provide assistance
EOF

    # Send to Anders' tmux pane
    if tmux has-session -t "semantest" 2>/dev/null; then
        tmux send-keys -t "semantest:anders" C-l
        tmux send-keys -t "semantest:anders" "# 🔥 CRITICAL: $member needs help with: $task" Enter
    fi
}

# Check for blocked tasks and suggest solutions
check_blocked_tasks() {
    local member=$1
    local status_file="$STATUS_DIR/$member.status"

    if [[ -f "$status_file" ]]; then
        local blocked=$(jq -r '.blocked' "$status_file" 2>/dev/null)
        local blocker_reason=$(jq -r '.blocker_reason // "unknown"' "$status_file" 2>/dev/null)

        if [[ "$blocked" == "true" ]]; then
            suggest_solution "$member" "$blocker_reason"
        fi
    fi
}

# Suggest solutions for common blockers
suggest_solution() {
    local member=$1
    local blocker=$2
    local suggestion=""

    case "$blocker" in
    *"WebSocket"*)
        suggestion="Check ports 8080/8081 are free. Try: lsof -i :8080"
        ;;
    *"extension"*)
        suggestion="Reload extension from chrome://extensions/"
        ;;
    *"test"*)
        suggestion="Run: npm test -- --verbose to see detailed errors"
        ;;
    *"dependency"*)
        suggestion="Run: npm install && npm run build"
        ;;
    *)
        suggestion="Ask team for help via @team in tmux"
        ;;
    esac

    if tmux has-session -t "semantest" 2>/dev/null; then
        tmux send-keys -t "semantest:$member" C-l
        tmux send-keys -t "semantest:$member" "# 💡 Suggestion: $suggestion" Enter
    fi
}

# Monitor high-priority tasks
monitor_priority_tasks() {
    echo "Checking high-priority tasks..."

    for task in "${HIGH_PRIORITY_TASKS[@]}"; do
        # Check if any team member is working on this task
        local assigned=false

        for member in Rafa Wences Alex Ana Alfredo Irene; do
            local status_file="$STATUS_DIR/$member.status"
            if [[ -f "$status_file" ]]; then
                local current_task=$(jq -r '.current_task' "$status_file" 2>/dev/null)

                if [[ "$current_task" == *"$task"* ]]; then
                    assigned=true
                    echo "✓ $task assigned to $member"
                    break
                fi
            fi
        done

        if [[ "$assigned" == "false" ]]; then
            echo "⚠️  HIGH PRIORITY UNASSIGNED: $task"
            notify_coordinator "SYSTEM" "High-priority task unassigned: $task"
        fi
    done
}

# Main reminder loop
main() {
    echo "Starting task reminder automation..."

    # Ensure directories exist
    mkdir -p "$STATUS_DIR/.reminders"
    mkdir -p "$LOGS_DIR"

    while true; do
        # Check each team member
        for member in Rafa Wences Alex Ana Alfredo Irene; do
            local status_file="$STATUS_DIR/$member.status"

            if [[ -f "$status_file" ]]; then
                local status=$(jq -r '.status' "$status_file" 2>/dev/null)
                local task=$(jq -r '.current_task' "$status_file" 2>/dev/null)
                local start_time=$(jq -r '.task_start_time // 0' "$status_file" 2>/dev/null)

                if [[ "$status" == "working" ]] && [[ "$start_time" != "0" ]]; then
                    check_task_progress "$member" "$task" "$start_time"
                fi

                check_blocked_tasks "$member"
            fi
        done

        # Monitor high-priority tasks every 5 minutes
        if [[ $(($(date +%s) % 300)) -lt 30 ]]; then
            monitor_priority_tasks
        fi

        sleep 30 # Check every 30 seconds
    done
}

# Handle cleanup
trap 'echo "Task reminder system stopped"; exit 0' INT TERM

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
