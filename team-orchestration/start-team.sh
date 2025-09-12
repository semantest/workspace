#!/usr/bin/env bash

# Main script to launch the Semantest team

TEAM_DIR="/home/chous/github/rydnr/claude/semantest-workspace/team-orchestration"
ORCHESTRATOR_DIR="/home/chous/github/rydnr/claude/tmux-orchestrator"

echo "🚀 Launching Semantest Team..."
echo ""

# Check if tmux is available
if ! command -v tmux &> /dev/null; then
    echo "Error: tmux not found"
    echo "Please install tmux first"
    exit 1
fi

# Check if tmux-orchestrator directory exists
if [ -d "$ORCHESTRATOR_DIR" ]; then
    echo "✓ Found tmux-orchestrator at: $ORCHESTRATOR_DIR"
    echo "  Will use send-claude-message.sh for persona initialization"
else
    echo "⚠ tmux-orchestrator not found at: $ORCHESTRATOR_DIR"
    echo "  Will use fallback method for persona initialization"
fi

# Create tmux session with team members
echo ""
echo "📦 Creating tmux session with team members..."
"$TEAM_DIR/create-tmux-session.sh"

echo ""
echo "⏳ Claude instances are starting up..."
echo "   This process will take about 25-30 seconds total"

# Initialize personas
echo ""
"$TEAM_DIR/init-personas.sh"

echo ""
echo "=========================================="
echo "✅ Semantest Team Successfully Launched!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Attach to session: tmux attach -t semantest"
echo "2. Navigate: Ctrl+b, [0-7] to switch between team members"
echo "3. Monitor Anders (Ctrl+b, 0) - he should be coordinating"
echo "4. Monitor Ana (Ctrl+b, 4) - she should be updating JOURNAL.md"
echo ""
echo "Team members:"
echo "  0: Anders - Manager (coordinates only, no coding)"
echo "  1: Rafa - Architect (event sourcing, hexagonal)"
echo "  2: Wences - Frontend (Chrome extension, Redux)"
echo "  3: Alex - DevOps (CI/CD, Docker)"
echo "  4: Ana - Monitor (watches team, updates journal)"
echo "  5: Alfredo - Backend (implements architecture)"
echo "  6: Irene - UX (CLI design)"
echo "  7: monitor - Dashboard"
