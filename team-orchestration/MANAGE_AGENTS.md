# Managing the AI Agent Team

## Current Status
- **Session Name**: semantest-team
- **Agents**: anders, rafa, wences, alex, ana, alfredo, irene

## Quick Commands

### Attach to the session
```bash
tmux attach -t semantest-team
```

### Navigate between agents
- `Ctrl+b, 0` - Anders (Manager)
- `Ctrl+b, 1` - Rafa (Architect)
- `Ctrl+b, 2` - Wences (Frontend)
- `Ctrl+b, 3` - Alex (DevOps)
- `Ctrl+b, 4` - Ana (Monitor)
- `Ctrl+b, 5` - Alfredo (Backend)
- `Ctrl+b, 6` - Irene (UX)
- `Ctrl+b, n` - Next window
- `Ctrl+b, p` - Previous window

### Initialize individual agents
```bash
# Initialize a specific agent with their personality
./team-orchestration/scripts/initialize-single-agent.sh anders
./team-orchestration/scripts/initialize-single-agent.sh rafa
./team-orchestration/scripts/initialize-single-agent.sh wences
./team-orchestration/scripts/initialize-single-agent.sh alex
./team-orchestration/scripts/initialize-single-agent.sh ana
./team-orchestration/scripts/initialize-single-agent.sh alfredo
./team-orchestration/scripts/initialize-single-agent.sh irene
./team-orchestration/scripts/initialize-single-agent.sh emilio
./team-orchestration/scripts/initialize-single-agent.sh alberto
```

### Check agent status from outside tmux
```bash
# View what an agent is doing
tmux capture-pane -t semantest-team:anders -p | tail -30
tmux capture-pane -t semantest-team:ana -p | tail -30
```

### Restart an agent
```bash
# From within tmux (when attached to the agent's window)
Ctrl+C Ctrl+C  # Kill Claude
clear          # Clear screen
claude --permission-mode bypassPermissions --dangerously-skip-permissions # Restart Claude

# Then initialize with personality using the script
```

## Agent Roles

### Anders (Manager)
- Should coordinate and delegate tasks
- Should NOT write code himself
- Monitors progress and removes blockers

### Ana (Monitor)
- Watches other agents' tmux windows
- Updates JOURNAL.md with observations
- Tracks team health and collaboration

### Rafa (Architect)
- Designs event-sourced architecture
- Creates domain models and events
- Works with hexagonal architecture

### Wences (Frontend)
- Implements Redux-based Chrome extension
- Event-driven state management
- WebSocket communication

### Alex (DevOps)
- Sets up CI/CD pipelines
- Docker configuration
- Developer experience tools

### Alfredo (Backend)
- Implements Rafa's designs
- Event store implementation
- WebSocket server

### Irene (UX)
- Progressive CLI design
- User experience focus
- Documentation

## Troubleshooting

### If agents receive spam messages
1. Check for running reminder scripts:
   ```bash
   ps aux | grep -E "reminder|monitor" | grep -v grep
   ```
2. Kill any interfering scripts:
   ```bash
   pkill -f "task-reminder.sh"
   ```

### If Claude terminates unexpectedly
1. The agent might have received Ctrl+C in the prompt
2. Restart Claude manually and reinitialize

### If prompts aren't received properly
1. Make sure Claude is fully started (wait 5-10 seconds)
2. Use the initialize-single-agent.sh script
3. Or manually paste the prompt when attached to the window

## Manual Agent Initialization

If the script doesn't work, you can manually initialize by:
1. Attach to the session: `tmux attach -t semantest-team`
2. Navigate to the agent's window
3. Type or paste their personality prompt directly
4. Press Enter to submit

The personality prompts are stored in the initialize-single-agent.sh script.
