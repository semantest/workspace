#!/usr/bin/env bash

# Initialize each team member with their persona
# Uses tmux-orchestrator's send-claude-message.sh if available

TEAM_DIR="/home/chous/github/rydnr/claude/semantest-workspace/team-orchestration"
ORCHESTRATOR_DIR="/home/chous/github/rydnr/claude/tmux-orchestrator"
SESSION="semantest"

for agent in anders rafa wences alex ana alfredo irene alberto ma emilio; do
    "$ORCHESTRATOR_DIR/send-claude-message.sh" "$SESSION:$agent" "claude --permission-mode bypassPermissions --dangerously-skip-permissions"
done

echo "⏳ Waiting for Claude instances to be ready..."
echo "   This takes about 15-20 seconds for Claude to fully load..."

# Wait longer for Claude to fully start
sleep 20

# Check if Claude is ready by looking for the welcome message
echo "🔍 Checking if Claude is ready in each window..."
for agent in anders rafa wences alex ana alfredo irene; do
    output=$(tmux capture-pane -t "$SESSION:$agent" -p 2>/dev/null | tail -5)
    if echo "$output" | grep -q "Welcome to Claude" || echo "$output" | grep -q "cwd:"; then
        echo "  ✓ $agent: Claude is ready"
    else
        echo "  ⏳ $agent: Still loading..."
    fi
done

echo ""
echo "⏳ Waiting 5 more seconds to ensure all instances are ready..."
sleep 5

echo ""
echo "📝 Initializing team personas..."

# Function to send persona to agent
init_agent() {
    local agent=$1
    local persona_file="$TEAM_DIR/personas/${agent}.md"
    
    if [ -f "$persona_file" ]; then
        echo "  Initializing $agent..."
        
        # Check if tmux-orchestrator's send-claude-message.sh exists
        if [ -f "$ORCHESTRATOR_DIR/send-claude-message.sh" ]; then
            # Use tmux-orchestrator to send the message
            cat "$persona_file" | "$ORCHESTRATOR_DIR/send-claude-message.sh" "$SESSION:$agent"
        else
            # Fallback to direct tmux commands
            # Load the persona content into tmux buffer
            tmux load-buffer -t "$SESSION:$agent" "$persona_file"
            
            # Paste it to Claude
            tmux paste-buffer -t "$SESSION:$agent"
            
            # Send Enter to submit
            sleep 1
            tmux send-keys -t "$SESSION:$agent" Enter
        fi
        
        echo "  ✓ $agent initialized"
        sleep 3  # Give more time between agents
    else
        echo "  ✗ Persona file not found for $agent"
    fi
}

# Initialize each agent
for agent in anders rafa wences alex ana alfredo irene; do
    init_agent "$agent"
done

echo ""
echo "=========================================="
echo "✅ All team members initialized!"
echo "=========================================="
echo ""
echo "📋 Next steps:"
echo "  • Anders should coordinate the team (no coding!)"
echo "  • Ana should monitor team and update JOURNAL.md"
echo "  • Others should work on their assigned tasks"
echo ""
echo "👀 Attach to session: tmux attach -t semantest"
echo "🔄 Navigate: Ctrl+b, [0-7] to switch between agents"
