#!/usr/bin/env bash

# Create tmux session with all team members

SESSION="semantest"
WORKSPACE="/home/chous/github/rydnr/claude/semantest-workspace"

echo "Creating tmux session: $SESSION"

# Kill existing session if it exists
tmux kill-session -t "$SESSION" 2>/dev/null || true
sleep 1

# Create new session with first window (anders)
tmux new-session -d -s "$SESSION" -n anders -c "$WORKSPACE"
tmux send-keys -t "$SESSION:anders" "echo 'Anders - Team Manager (Coordinator Only)'" Enter
tmux send-keys -t "$SESSION:anders" "claude --permission-mode bypassPermissions --dangerously-skip-permissions" Enter

# Create window for rafa
tmux new-window -t "$SESSION" -n rafa -c "$WORKSPACE/nodejs.server"
tmux send-keys -t "$SESSION:rafa" "echo 'Rafa - Software Architect'" Enter
tmux send-keys -t "$SESSION:rafa" "claude --permission-mode bypassPermissions --dangerously-skip-permissions" Enter

# Create window for wences
tmux new-window -t "$SESSION" -n wences -c "$WORKSPACE/extension.chrome"
tmux send-keys -t "$SESSION:wences" "echo 'Wences - Frontend Developer'" Enter
tmux send-keys -t "$SESSION:wences" "claude --permission-mode bypassPermissions --dangerously-skip-permissions" Enter

# Create window for alex
tmux new-window -t "$SESSION" -n alex -c "$WORKSPACE"
tmux send-keys -t "$SESSION:alex" "echo 'Alex - DevOps Engineer'" Enter
tmux send-keys -t "$SESSION:alex" "claude --permission-mode bypassPermissions --dangerously-skip-permissions" Enter

# Create window for ana
tmux new-window -t "$SESSION" -n ana -c "$WORKSPACE"
tmux send-keys -t "$SESSION:ana" "echo 'Ana - Team Monitor (Updates JOURNAL.md)'" Enter
tmux send-keys -t "$SESSION:ana" "claude --permission-mode bypassPermissions --dangerously-skip-permissions" Enter

# Create window for alfredo
tmux new-window -t "$SESSION" -n alfredo -c "$WORKSPACE/nodejs.server"
tmux send-keys -t "$SESSION:alfredo" "echo 'Alfredo - Backend Engineer'" Enter
tmux send-keys -t "$SESSION:alfredo" "claude --permission-mode bypassPermissions --dangerously-skip-permissions" Enter

# Create window for irene
tmux new-window -t "$SESSION" -n irene -c "$WORKSPACE/typescript.client"
tmux send-keys -t "$SESSION:irene" "echo 'Irene - UX Designer'" Enter
tmux send-keys -t "$SESSION:irene" "claude --permission-mode bypassPermissions --dangerously-skip-permissions" Enter

# Create window for alberto
tmux new-window -t "$SESSION" -n alberto -c "$WORKSPACE"
tmux send-keys -t "$SESSION:alberto" "echo 'Alberto - Secutiry'" Enter
tmux send-keys -t "$SESSION:alberto" "claude --permission-mode bypassPermissions --dangerously-skip-permissions" Enter

# Create window for ma
tmux new-window -t "$SESSION" -n ma -c "$WORKSPACE"
tmux send-keys -t "$SESSION:ma" "echo 'ma - QA'" Enter
tmux send-keys -t "$SESSION:ma" "claude --permission-mode bypassPermissions --dangerously-skip-permissions" Enter

# Create window for emilio
tmux new-window -t "$SESSION" -n emilio -c "$WORKSPACE"
tmux send-keys -t "$SESSION:emilio" "echo 'Emilio - Writer'" Enter
tmux send-keys -t "$SESSION:emilio" "claude --permission-mode bypassPermissions --dangerously-skip-permissions" Enter

# Create monitoring window
tmux new-window -t "$SESSION" -n monitor -c "$WORKSPACE"
tmux send-keys -t "$SESSION:monitor" "echo 'Monitoring Dashboard'" Enter
tmux send-keys -t "$SESSION:monitor" "watch -n 5 'echo Team Status; tmux list-windows -t semantest'" Enter

echo "✓ Tmux session created with all team members"
echo "⏳ Claude instances are starting up..."
echo "   Wait for init-personas.sh to send the persona instructions"
