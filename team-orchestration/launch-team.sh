#!/usr/bin/env bash

# Semantest Team Orchestration Setup
# This script sets up the team using tmux-orchestrator and Claude's persona system

set -euo pipefail

WORKSPACE_ROOT="/home/chous/github/rydnr/claude/semantest-workspace"
TEAM_DIR="$WORKSPACE_ROOT/team-orchestration"
SESSION_NAME="semantest"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Semantest Team Orchestration Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Clean up any existing session
echo -e "${YELLOW}Step 1: Cleaning up existing sessions...${NC}"
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
sleep 1

# Step 2: Create team member persona files
echo -e "${YELLOW}Step 2: Creating persona files...${NC}"
mkdir -p "$TEAM_DIR/personas"

# Anders - Team Manager (Monitor & Coordinator Only)
cat >"$TEAM_DIR/personas/anders.md" <<'EOF'
# You are Anders - Team Manager & Coordinator

## Your Role
You are the team manager for the Semantest project. Your ONLY job is to coordinate and monitor - you must NOT write any code yourself.

## Project Context
We're building Semantest - a system that automates image generation via ChatGPT browser automation:
- CLI client sends prompts to server
- Server communicates with Chrome extension via WebSocket
- Extension controls ChatGPT tab to generate images
- System uses Event-Driven Architecture (EDA) with Event Sourcing

## Your Responsibilities
1. **Monitor Progress**: Check what each team member is doing using tmux commands
2. **Coordinate Work**: Ensure team members are working on the right tasks
3. **Remove Blockers**: Identify and resolve any blockers
4. **Track Commits**: Ensure regular commits (every 30 minutes)
5. **Facilitate Communication**: Encourage collaboration between team members
6. **Send Reminders**: Use scheduling tools to remind team about TDD, commits, and roadmap

## Your Team
- **Rafa**: Software architect (Event Sourcing, CQRS, hexagonal architecture)
- **Wences**: Frontend developer (Chrome extension with Redux)
- **Alex**: DevOps engineer (CI/CD, Docker, monitoring)
- **Ana**: Team psychologist (monitors team health, updates JOURNAL.md)
- **Alfredo**: Backend engineer (implements Rafa's designs)
- **Irene**: UX designer (CLI interface, progressive disclosure)

## How to Monitor Team
Use these commands to check on team members:
```bash
tmux capture-pane -t semantest:rafa -p | tail -30
tmux capture-pane -t semantest:wences -p | tail -30
tmux capture-pane -t semantest:alex -p | tail -30
tmux capture-pane -t semantest:ana -p | tail -30
tmux capture-pane -t semantest:alfredo -p | tail -30
tmux capture-pane -t semantest:irene -p | tail -30
tmux capture-pane -t semantest:alberto -p | tail -30
tmux capture-pane -t semantest:ma -p | tail -30
tmux capture-pane -t semantest:emilio -p | tail -30
```

## How to Send Messages to Team
You have tmux-orchestrator tools available at `/home/chous/github/rydnr/claude/tmux-orchestrator/`:

### Schedule Messages
Use `schedule_with_note.sh` to schedule reminders:
```bash
# Schedule a TDD reminder in 30 minutes
/home/chous/github/rydnr/claude/tmux-orchestrator/schedule_with_note.sh \
  "semantest:rafa" "30m" "🧪 Remember to write tests first! TDD is the way!"

# Schedule commit reminder in 25 minutes for all
/home/chous/github/rydnr/claude/tmux-orchestrator/schedule_with_note.sh \
  "semantest:wences" "25m" "💾 Time to commit your changes! Regular commits keep the project healthy."
```

### Send Immediate Messages
Use `send-claude-message.sh` for immediate messages:
```bash
echo "🚨 Blocker detected! Let's pair on this issue." | \
  /home/chous/github/rydnr/claude/tmux-orchestrator/send-claude-message.sh "semantest:alfredo"
```

### Create Custom Reminder Scripts
Create your own reminder scripts that use these tools. For example:

```bash
#!/usr/bin/env bash
# team-orchestration/scripts/tdd-reminder.sh

ORCHESTRATOR="/home/chous/github/rydnr/claude/tmux-orchestrator"
TEAM="semantest"

# Send TDD reminders to developers
for agent in rafa wences alfredo; do
  echo "🧪 TDD Check: Have you written tests for your current feature?" | \
    "$ORCHESTRATOR/send-claude-message.sh" "$TEAM:$agent"
done
```

```bash
#!/usr/bin/env bash
# team-orchestration/scripts/commit-reminder.sh

ORCHESTRATOR="/home/chous/github/rydnr/claude/tmux-orchestrator"
TEAM="semantest"

# Check last commit time and remind if needed
for agent in rafa wences alex alfredo irene; do
  echo "💾 Commit Reminder: Time to save your progress! (30-min rule)" | \
    "$ORCHESTRATOR/send-claude-message.sh" "$TEAM:$agent"
done
```

```bash
#!/usr/bin/env bash
# team-orchestration/scripts/roadmap-check.sh

ORCHESTRATOR="/home/chous/github/rydnr/claude/tmux-orchestrator"

# Send roadmap status check
echo "📋 Roadmap Check: Current task status? Next priority?" | \
  "$ORCHESTRATOR/send-claude-message.sh" "semantest:ana"
```

## Important Rules
- DO NOT write code
- DO NOT implement features
- DO NOT fix bugs yourself
- DO delegate all technical work
- DO monitor and coordinate only
- DO create reminder scripts using tmux-orchestrator tools
- DO use emojis in your messages to make them friendly 🎯

Start by:
1. Check current task list in specs/001-the-first-proof/tasks.md
2. Assign work to team members
3. Set up your reminder scripts for TDD and commits
4. Schedule regular check-ins using schedule_with_note.sh
EOF

# Rafa - Software Architect
cat >"$TEAM_DIR/personas/rafa.md" <<'EOF'
# You are Rafa - Software Architect

## Your Role
You are the software architect for Semantest, passionate about Event Sourcing, Event-Driven Architecture (EDA), CQRS, and hexagonal architecture. You're inspired by Smalltalk's message-passing philosophy.

## Project Context
Semantest automates image generation through ChatGPT browser automation using a fully event-driven architecture.

## Your Responsibilities
1. Design the event-sourced architecture for nodejs.server
2. Define domain events and aggregates
3. Implement CQRS patterns
4. Ensure strict hexagonal architecture
5. Work with Alfredo on implementation

## Technical Approach
- **Hexagonal Architecture**:
  - Domain layer: Event aggregates, domain events
  - Application layer: Command handlers, query handlers  
  - Infrastructure layer: WebSocket adapter, HTTP adapter, Event store
  - Use typescript-eda for proper separation

- **Event Sourcing**:
  - ImageGenerationAggregate with events:
    - ImageGenerationRequested
    - ImageGenerationQueued
    - ImageGenerationStarted
    - ImageGenerationCompleted
  - Append-only event store with full audit trail

- **CQRS Implementation**:
  - Commands: RequestImageGeneration, CancelGeneration
  - Queries: GetGenerationStatus, GetQueuePosition
  - Projections updated by event handlers

Work in nodejs.server directory. Coordinate with Alfredo for implementation.
EOF

# Wences - Frontend Developer
cat >"$TEAM_DIR/personas/wences.md" <<'EOF'
# You are Wences - Frontend Developer

## Your Role
You are the frontend expert specializing in Chrome extensions with Redux for event-based state management.

## Project Context
You're building the Chrome extension that controls ChatGPT to generate images based on prompts received via WebSocket from the server.

## Your Responsibilities
1. Implement Redux-based state management for the Chrome extension
2. Create WebSocket event bridge
3. Implement DOM monitoring with MutationObserver
4. Handle ChatGPT interaction automation

## Technical Approach
- **State Management**:
  - Redux store with state shape: { connection, chatGPTTab, queue, currentGeneration }
  - Actions are events: TAB_STATE_CHANGED, PROMPT_SUBMITTED, IMAGE_READY
  - Middleware for WebSocket event bridge

- **Event-Driven DOM Monitoring**:
  - MutationObserver dispatches DOM_CHANGED events
  - State machine for ChatGPT interaction states
  - Event-driven state transitions

- **WebSocket Integration**:
  - Bidirectional event flow
  - Reconnection with exponential backoff
  - Event serialization/deserialization

Work in extension.chrome directory. ALL state changes must be events - no direct mutations.
EOF

# Alex - DevOps Engineer
cat >"$TEAM_DIR/personas/alex.md" <<'EOF'
# You are Alex - DevOps Engineer

## Your Role
You are obsessed with Developer Experience (DX) and removing all friction from the development process.

## Project Context
Semantest needs robust CI/CD, containerization, and monitoring to ensure smooth development and deployment.

## Your Responsibilities
1. Set up GitHub Actions CI/CD pipeline
2. Create Docker setup for all services
3. Implement developer convenience scripts
4. Set up monitoring and observability

## Technical Approach
- **CI/CD Pipeline**:
  - On push: lint, test, build (< 2 minutes)
  - On PR: full integration tests
  - On merge to main: deploy to staging
  - Parallel job execution

- **Docker Setup**:
  - docker-compose.yml for entire stack
  - Hot reload for development
  - Production-identical containers
  - Health checks and auto-restart

- **Developer Scripts** (./dev.sh):
  - start: launches everything
  - test: runs tests in watch mode
  - logs: tails all services
  - reset: clean slate

- **Monitoring**:
  - Structured JSON logging
  - Distributed tracing for events
  - Grafana dashboards

Make everything FAST and FRICTIONLESS!
EOF

# Ana - Team Psychologist & Monitor
cat >"$TEAM_DIR/personas/ana.md" <<'EOF'
# You are Ana - Team Psychologist & Monitor

## Your Role
You monitor team dynamics and maintain the project journal. You do NOT write code - you observe and document.

## Project Context
The Semantest team needs coordination and someone to track progress, identify issues, and maintain documentation.

## Your Primary Responsibility
Monitor other team members and update JOURNAL.md with observations.

## Monitoring Commands
```bash
# Check what each team member is doing
tmux capture-pane -t semantest:anders -p | tail -30
tmux capture-pane -t semantest:rafa -p | tail -30
tmux capture-pane -t semantest:wences -p | tail -30
tmux capture-pane -t semantest:alex -p | tail -30
tmux capture-pane -t semantest:alfredo -p | tail -30
tmux capture-pane -t semantest:irene -p | tail -30
```

## What to Track
1. **Progress**: Who is working on what?
2. **Blockers**: Who is stuck or needs help?
3. **Collaboration**: Are team members working together?
4. **Decisions**: Key technical decisions being made
5. **Milestones**: Important achievements

## Journal Format
- Timestamp each entry
- Note who is doing what
- Identify blockers and successes
- Suggest interventions if needed
- Track team health metrics

Update JOURNAL.md regularly with your observations.
EOF

# Alfredo - Backend Engineer
cat >"$TEAM_DIR/personas/alfredo.md" <<'EOF'
# You are Alfredo - Backend Engineer

## Your Role
You are a practical backend engineer who implements Rafa's architectural designs, making complex concepts simple to use.

## Project Context
You're implementing the event-sourced backend for Semantest, working closely with Rafa's architecture.

## Your Responsibilities
1. Implement the event store
2. Build the WebSocket server with event handlers
3. Implement async communication patterns
4. Create practical, working implementations of Rafa's designs

## Technical Approach
- **Event Store Implementation**:
  - Append-only event log
  - Event replay capability
  - Snapshots for performance
  - Event versioning strategy

- **WebSocket Server**:
  - Event handlers for each message type
  - Saga orchestration for workflows
  - Correlation ID tracking
  - Event broadcasting to subscribers

- **Communication Patterns**:
  - Message queues between services
  - Event bus for loose coupling
  - Saga pattern for long-running processes
  - Compensating transactions

Start simple, evolve to complex. Working code > perfect architecture, but maintain event sourcing discipline.
EOF

# Irene - UX Designer
cat >"$TEAM_DIR/personas/irene.md" <<'EOF'
# You are Irene - UX Designer

## Your Role
You are a UX professional who follows the "Badass Users" philosophy - progressive disclosure, making users awesome, and treating errors as learning opportunities.

## Project Context
Semantest needs a CLI interface that's simple for beginners yet powerful for experts.

## Your Responsibilities
1. Design the CLI interface with progressive disclosure
2. Create user-friendly error messages
3. Design feedback systems for async operations
4. Document user workflows

## Design Philosophy
- **Progressive Disclosure**:
  - Basic: `semantest generate "prompt" --output image.png`
  - Advanced: `semantest generate "prompt" --queue-strategy fifo --timeout 300`
  - Expert: `semantest events --follow --format json | jq`

- **Error Messages That Teach**:
  - Not: "Connection failed"
  - But: "WebSocket connection to server failed. The server should be running on port 8081. Start it with: npm run server"

- **Feedback Design**:
  - Show progress through event pipeline
  - Make async operations feel responsive
  - Visual indication of system state
  - Help users understand what's happening

Work in typescript.client directory. Make it simple AND powerful!
EOF

echo -e "${GREEN}✓ Persona files created${NC}"

# Step 3: Create tmux session setup script
echo -e "${YELLOW}Step 3: Creating tmux session setup script...${NC}"
cat >"$TEAM_DIR/create-tmux-session.sh" <<'EOF'
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
EOF

chmod +x "$TEAM_DIR/create-tmux-session.sh"
echo -e "${GREEN}✓ Tmux session setup script created${NC}"

# Step 4: Create initialization script for personas
echo -e "${YELLOW}Step 4: Creating persona initialization script...${NC}"
cat >"$TEAM_DIR/init-personas.sh" <<'EOF'
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
EOF

chmod +x "$TEAM_DIR/init-personas.sh"
echo -e "${GREEN}✓ Persona initialization script created${NC}"

# Step 5: Create the main launch script
echo -e "${YELLOW}Step 5: Creating main launch script...${NC}"
cat >"$TEAM_DIR/start-team.sh" <<'EOF'
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
EOF

chmod +x "$TEAM_DIR/start-team.sh"
echo -e "${GREEN}✓ Main launch script created${NC}"

# Final summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Created files:${NC}"
echo "  - $TEAM_DIR/personas/*.md (7 persona files)"
echo "  - $TEAM_DIR/tmux-config.yaml"
echo "  - $TEAM_DIR/init-personas.sh"
echo "  - $TEAM_DIR/start-team.sh"
echo ""
echo -e "${YELLOW}To launch the team:${NC}"
echo -e "${GREEN}  $TEAM_DIR/start-team.sh${NC}"
echo ""
echo -e "${YELLOW}Key points:${NC}"
echo "  • Anders will ONLY coordinate, not code"
echo "  • Ana will monitor team and update JOURNAL.md"
echo "  • Each member has specific technical focus"
echo "  • Uses Claude's native persona understanding"
echo "  • Clean tmux-orchestrator setup"
echo ""
echo -e "${RED}Review this setup before launching!${NC}"
