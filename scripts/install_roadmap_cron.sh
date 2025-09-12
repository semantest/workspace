#!/usr/bin/env bash
# Install cron job for roadmap and TDD reminders

WORKSPACE="/home/chous/github/rydnr/claude/semantest-workspace"
CRON_FILE="/tmp/semantest_roadmap_cron"

# Create cron entry that runs every 10 minutes
cat > $CRON_FILE << EOF
# Semantest Team Roadmap & TDD Reminders
# Run roadmap reminder every 10 minutes
*/10 * * * * $WORKSPACE/team_roadmap_reminder.sh >> /tmp/team_roadmap_reminder.log 2>&1

# Quick TDD reminder every 15 minutes (offset)
*/15 * * * * tmux send-keys -t chatgpt-dev-team:0 "🧪 TDD Check: Red→Green→Refactor! Commit with emojis!" C-m

# Roadmap check every 20 minutes
*/20 * * * * tmux send-keys -t chatgpt-dev-team:1 "📋 Ana: Update roadmap progress in journal.org" C-m
EOF

echo "Roadmap reminder cron entries created in $CRON_FILE"
echo ""
echo "To install, run:"
echo "  crontab -l > /tmp/current_cron && cat $CRON_FILE >> /tmp/current_cron && crontab /tmp/current_cron"
echo ""
echo "To verify installation:"
echo "  crontab -l | grep roadmap"
echo ""
echo "To monitor logs:"
echo "  tail -f /tmp/team_roadmap_reminder.log"