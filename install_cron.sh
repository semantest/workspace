#!/usr/bin/env bash
# Install cron job for team management

WORKSPACE="/home/chous/github/rydnr/claude/semantest-workspace"
CRON_FILE="/tmp/semantest_team_cron"

# Create cron entry that runs every 3 minutes
cat > $CRON_FILE << EOF
# Semantest Team Management - Comprehensive automation
# Run team manager every 3 minutes
*/3 * * * * $WORKSPACE/team_cron_manager.sh >> /tmp/team_cron_manager.log 2>&1

# Backup: Force Enter every 2 minutes (offset from main script)
*/2 * * * * for i in 0 1 2 3 4 5; do tmux send-keys -t chatgpt-dev-team:\$i C-m; done

# Quick progress check every 5 minutes
*/5 * * * * tmux send-keys -t chatgpt-dev-team:2 "Wences: Have you tested in the browser yet? Show proof!" C-m
*/5 * * * * tmux send-keys -t chatgpt-dev-team:1 "Ana: Update journal.org with current status!" C-m
EOF

echo "Cron entries created in $CRON_FILE"
echo ""
echo "To install, run ONE of these commands:"
echo ""
echo "Option 1 - Add to existing crontab:"
echo "  crontab -l > /tmp/current_cron && cat $CRON_FILE >> /tmp/current_cron && crontab /tmp/current_cron"
echo ""
echo "Option 2 - Replace entire crontab (WARNING: removes existing entries):"
echo "  crontab $CRON_FILE"
echo ""
echo "To verify installation:"
echo "  crontab -l"
echo ""
echo "To monitor logs:"
echo "  tail -f /tmp/team_cron_manager.log"