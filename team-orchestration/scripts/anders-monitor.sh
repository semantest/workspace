#!/usr/bin/env bash
# Anders - Team Monitoring Dashboard
# Monitors the Semantest team progress and sends reminders

set -euo pipefail

# Team configuration
TEAM_MEMBERS=("Rafa" "Wences" "Alex" "Ana" "Alfredo" "Irene")
COORDINATOR="Anders"
WORKSPACE_ROOT="/home/chous/github/rydnr/claude/semantest-workspace"
STATUS_DIR="$WORKSPACE_ROOT/team-orchestration/status"
LOGS_DIR="$WORKSPACE_ROOT/team-orchestration/logs"
TMUX_SESSION="semantest"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Initialize status files
initialize_status() {
    echo -e "${BLUE}[Anders]${NC} Initializing team status tracking..."

    for member in "${TEAM_MEMBERS[@]}"; do
        status_file="$STATUS_DIR/$member.status"
        if [[ ! -f "$status_file" ]]; then
            cat >"$status_file" <<EOF
{
  "name": "$member",
  "current_task": "Awaiting assignment",
  "status": "idle",
  "last_update": "$(date -Iseconds)",
  "progress": 0,
  "blocked": false,
  "needs_help": false
}
EOF
        fi
    done

    # Initialize team summary
    cat >"$STATUS_DIR/team-summary.json" <<EOF
{
  "coordinator": "$COORDINATOR",
  "team_size": ${#TEAM_MEMBERS[@]},
  "active_tasks": 0,
  "blocked_tasks": 0,
  "completion_rate": 0,
  "last_check": "$(date -Iseconds)"
}
EOF
}

# Check individual member status
check_member_status() {
    local member=$1
    local status_file="$STATUS_DIR/$member.status"

    if [[ -f "$status_file" ]]; then
        local status=$(jq -r '.status' "$status_file" 2>/dev/null || echo "unknown")
        local task=$(jq -r '.current_task' "$status_file" 2>/dev/null || echo "No task")
        local progress=$(jq -r '.progress' "$status_file" 2>/dev/null || echo "0")
        local blocked=$(jq -r '.blocked' "$status_file" 2>/dev/null || echo "false")

        # Color code based on status
        local color=$GREEN
        local status_icon="✓"

        case "$status" in
        "working")
            color=$CYAN
            status_icon="⚡"
            ;;
        "blocked")
            color=$RED
            status_icon="⚠"
            ;;
        "idle")
            color=$YELLOW
            status_icon="⏳"
            ;;
        "completed")
            color=$GREEN
            status_icon="✅"
            ;;
        esac

        echo -e "${color}${status_icon} $member${NC}: $task (${progress}%)"

        # Check if member needs a reminder
        if [[ "$blocked" == "true" ]]; then
            send_reminder "$member" "blocked"
        elif [[ "$progress" -lt 50 ]] && [[ "$status" == "working" ]]; then
            check_stale_task "$member"
        fi
    else
        echo -e "${RED}❌ $member${NC}: Status unknown"
    fi
}

# Check if task is stale and send reminder
check_stale_task() {
    local member=$1
    local status_file="$STATUS_DIR/$member.status"
    local last_update=$(jq -r '.last_update' "$status_file" 2>/dev/null)

    if [[ -n "$last_update" ]]; then
        local last_timestamp=$(date -d "$last_update" +%s 2>/dev/null || echo 0)
        local current_timestamp=$(date +%s)
        local time_diff=$((current_timestamp - last_timestamp))

        # If no update in 30 minutes, send reminder
        if [[ $time_diff -gt 1800 ]]; then
            send_reminder "$member" "stale"
        fi
    fi
}

# Send reminder to team member
send_reminder() {
    local member=$1
    local reason=$2
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")

    case "$reason" in
    "blocked")
        message="[URGENT] You're blocked! Please share what you need help with."
        ;;
    "stale")
        message="[REMINDER] No progress update in 30+ minutes. Please update your status."
        ;;
    "deadline")
        message="[DEADLINE] Task deadline approaching! Please prioritize completion."
        ;;
    *)
        message="[CHECK-IN] Please provide a status update on your current task."
        ;;
    esac

    # Log the reminder
    echo "[$timestamp] Reminder sent to $member: $message" >>"$LOGS_DIR/reminders.log"

    # Send to tmux pane if exists
    if tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
        tmux send-keys -t "$TMUX_SESSION:$member" C-l
        tmux send-keys -t "$TMUX_SESSION:$member" "# $COORDINATOR: $message" Enter
    fi

    echo -e "${YELLOW}📨 Reminder sent to $member${NC}: $message"
}

# Display team dashboard
display_dashboard() {
    clear
    echo -e "${PURPLE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║${NC}  ${BLUE}SEMANTEST TEAM DASHBOARD${NC} - Coordinator: ${CYAN}$COORDINATOR${NC}  ${PURPLE}║${NC}"
    echo -e "${PURPLE}╠════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${PURPLE}║${NC} Feature: ${GREEN}Image Generation via Browser Automation${NC}         ${PURPLE}║${NC}"
    echo -e "${PURPLE}║${NC} Branch:  ${GREEN}001-the-first-proof${NC}                             ${PURPLE}║${NC}"
    echo -e "${PURPLE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}📊 Team Status Overview:${NC}"
    echo "────────────────────────────────────────────────────────────"

    local active_count=0
    local blocked_count=0

    for member in "${TEAM_MEMBERS[@]}"; do
        check_member_status "$member"

        # Count active and blocked
        local status_file="$STATUS_DIR/$member.status"
        if [[ -f "$status_file" ]]; then
            local status=$(jq -r '.status' "$status_file" 2>/dev/null)
            [[ "$status" == "working" ]] && ((active_count++))
            [[ "$status" == "blocked" ]] && ((blocked_count++))
        fi
    done

    echo "────────────────────────────────────────────────────────────"
    echo -e "${BLUE}📈 Statistics:${NC}"
    echo -e "  Active Tasks: ${GREEN}$active_count${NC} | Blocked: ${RED}$blocked_count${NC} | Idle: ${YELLOW}$((${#TEAM_MEMBERS[@]} - active_count - blocked_count))${NC}"

    # Show current focus tasks
    echo ""
    echo -e "${BLUE}🎯 Current Focus Areas:${NC}"
    echo "  1. Browser Extension: WebSocket connection establishment"
    echo "  2. Server: Event handling and queue management"
    echo "  3. CLI: Command interface implementation"
    echo "  4. Testing: TDD contract tests"

    # Update team summary
    update_team_summary $active_count $blocked_count
}

# Update team summary file
update_team_summary() {
    local active=$1
    local blocked=$2
    local completion_rate=$(calculate_completion_rate)

    cat >"$STATUS_DIR/team-summary.json" <<EOF
{
  "coordinator": "$COORDINATOR",
  "team_size": ${#TEAM_MEMBERS[@]},
  "active_tasks": $active,
  "blocked_tasks": $blocked,
  "completion_rate": $completion_rate,
  "last_check": "$(date -Iseconds)"
}
EOF
}

# Calculate overall completion rate
calculate_completion_rate() {
    local total_progress=0
    local member_count=0

    for member in "${TEAM_MEMBERS[@]}"; do
        local status_file="$STATUS_DIR/$member.status"
        if [[ -f "$status_file" ]]; then
            local progress=$(jq -r '.progress' "$status_file" 2>/dev/null || echo "0")
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

# Broadcast message to all team members
broadcast_message() {
    local message=$1
    local timestamp=$(date "+%H:%M:%S")

    echo -e "\n${PURPLE}📢 [Anders Broadcasting at $timestamp]:${NC} $message\n"

    if tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
        for member in "${TEAM_MEMBERS[@]}"; do
            tmux send-keys -t "$TMUX_SESSION:$member" C-l
            tmux send-keys -t "$TMUX_SESSION:$member" "# 📢 ANDERS: $message" Enter
        done
    fi

    # Log broadcast
    echo "[$timestamp] Broadcast: $message" >>"$LOGS_DIR/broadcasts.log"
}

# Main monitoring loop
main() {
    echo -e "${BLUE}[Anders]${NC} Starting team monitoring system..."

    # Initialize status tracking
    initialize_status

    # Check interval (seconds)
    CHECK_INTERVAL=${CHECK_INTERVAL:-60}

    # Monitoring loop
    while true; do
        display_dashboard

        # Check for critical situations
        local blocked_count=$(grep -l '"blocked": true' "$STATUS_DIR"/*.status 2>/dev/null | wc -l)
        if [[ $blocked_count -gt 2 ]]; then
            broadcast_message "⚠️ Multiple team members blocked! Initiating team sync..."
        fi

        # Periodic team check-in (every 30 minutes)
        if [[ $(($(date +%s) % 1800)) -lt $CHECK_INTERVAL ]]; then
            broadcast_message "🔄 30-minute check-in: Please update your task status!"
        fi

        echo -e "\n${CYAN}⏰ Next check in $CHECK_INTERVAL seconds...${NC}"
        echo -e "${CYAN}Press Ctrl+C to stop monitoring${NC}"

        sleep $CHECK_INTERVAL
    done
}

# Handle script termination
trap 'echo -e "\n${BLUE}[Anders]${NC} Monitoring stopped. Team continues working..."; exit 0' INT TERM

# Run main function
main "$@"
