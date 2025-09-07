#!/usr/bin/env bash
# Setup cron jobs for team automation

WORKSPACE="/home/chous/github/rydnr/claude/semantest-workspace"

# Create cron entries
cat << EOF > /tmp/semantest_cron
# Semantest Team Automation
# Force Enter every 2 minutes
*/2 * * * * $WORKSPACE/team_automation.sh cron >> /tmp/team_automation.log 2>&1

# Send work reminders every 15 minutes
*/15 * * * * tmux send-keys -t chatgpt-dev-team:2 "WORK CHECK: Is idle detection done?" C-m
*/15 * * * * tmux send-keys -t chatgpt-dev-team:3 "WORK CHECK: Is WebSocket ready?" C-m
*/15 * * * * tmux send-keys -t chatgpt-dev-team:4 "WORK CHECK: Is CLI sending events?" C-m

# Force commits every 30 minutes
*/30 * * * * tmux send-keys -t chatgpt-dev-team:2 "Time to commit your work! git add . && git commit -S -m 'wip: progress'" C-m
*/30 * * * * tmux send-keys -t chatgpt-dev-team:3 "Time to commit your work! git add . && git commit -S -m 'wip: progress'" C-m
*/30 * * * * tmux send-keys -t chatgpt-dev-team:4 "Time to commit your work! git add . && git commit -S -m 'wip: progress'" C-m
EOF

echo "Cron jobs to add (run: crontab -e and add these lines):"
cat /tmp/semantest_cron
echo ""
echo "Or run: crontab /tmp/semantest_cron to install automatically"