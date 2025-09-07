#!/usr/bin/env bash
# Team reminder script - runs less frequently with proper Enter keys

SEND_SCRIPT="/home/chous/github/rydnr/claude/semantest-workspace/send_to_team.sh"

# Function to send git reminder (every 30 minutes)
send_git_reminder() {
    bash $SEND_SCRIPT all "📝 Git reminder: Sign commits (-S), commit to MODULE dirs only, small frequent commits!"
}

# Function to send TDD reminder (every 20 minutes)  
send_tdd_reminder() {
    bash $SEND_SCRIPT all "🧪 TDD check: Test first → Code → Refactor. Are your tests passing? ✅"
}

# Main loop with less frequent reminders
case "$1" in
    "git")
        send_git_reminder
        ;;
    "tdd")
        send_tdd_reminder
        ;;
    "once")
        # Single reminders when needed
        send_git_reminder
        sleep 2
        send_tdd_reminder
        ;;
    *)
        echo "Usage: $0 {git|tdd|once}"
        ;;
esac