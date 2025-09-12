#!/usr/bin/env bash
# Install cron job to fix pending text issues

WORKSPACE="/home/chous/github/rydnr/claude/semantest-workspace"
CRON_FILE="/tmp/semantest_text_fix_cron"

# Create cron entries for text fixing
cat > $CRON_FILE << EOF
# Semantest Team - Fix Pending Text Issues
# Run every minute for critical text fixing
* * * * * $WORKSPACE/fix_pending_text.sh

# Backup: Force Enter every 2 minutes
*/2 * * * * for i in 0 1 2 3 4 5; do tmux send-keys -t chatgpt-dev-team:\$i C-m; done

# Extra safety: Send Enter to all windows every 5 minutes
*/5 * * * * tmux send-keys -t chatgpt-dev-team:0 C-m; tmux send-keys -t chatgpt-dev-team:1 C-m; tmux send-keys -t chatgpt-dev-team:2 C-m; tmux send-keys -t chatgpt-dev-team:3 C-m; tmux send-keys -t chatgpt-dev-team:4 C-m; tmux send-keys -t chatgpt-dev-team:5 C-m
EOF

echo "Text fix cron entries created in $CRON_FILE"
echo ""
echo "To install (adds to existing crontab):"
echo "  crontab -l > /tmp/current_cron 2>/dev/null || touch /tmp/current_cron"
echo "  cat $CRON_FILE >> /tmp/current_cron"
echo "  crontab /tmp/current_cron"
echo ""
echo "To verify installation:"
echo "  crontab -l | grep fix_pending"
echo ""
echo "To monitor logs:"
echo "  tail -f /tmp/fix_pending_text.log"
echo ""
echo "To install NOW (automatic):"
echo "  Press Enter to install or Ctrl+C to cancel"
read -r

# Auto-install
crontab -l > /tmp/current_cron 2>/dev/null || touch /tmp/current_cron
cat $CRON_FILE >> /tmp/current_cron
crontab /tmp/current_cron

echo "✅ Cron jobs installed successfully!"
crontab -l | grep -E "(fix_pending|C-m)"