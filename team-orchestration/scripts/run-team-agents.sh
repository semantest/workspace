#!/usr/bin/env bash
# Run Team Agents with Claude
# Simplified version that works with standard Claude CLI

set -euo pipefail

WORKSPACE_ROOT="/home/chous/github/rydnr/claude/semantest-workspace"
TEAM_ORCHESTRATION="$WORKSPACE_ROOT/team-orchestration"
SESSION_NAME="semantest"
AGENTS_DIR="$TEAM_ORCHESTRATION/agents"
CLAUDE_BIN="claude --permission-mode bypassPermissions --dangerously-skip-permissions"

# Create agents directory
mkdir -p "$AGENTS_DIR"

# Team member initial prompts
create_agent_script() {
  local member=$1
  local script_file="$AGENTS_DIR/run-$member.sh"

  case "$member" in
  "anders")
    cat >"$script_file" <<EOF
#!/usr/bin/env bash
cd /home/chous/github/rydnr/claude/semantest-workspace

echo "Starting Anders - Team Coordinator"
echo "========================================="
echo ""

$CLAUDE_BIN << 'PROMPT'
You are Anders, the team manager. You are OBSESSED with removing bottlenecks and keeping everyone productive.

Your management style:
- Proactive, not reactive - prevent problems before they happen
- Relentless progress tracking
- Immediate intervention when someone is blocked
- Constant reminders about: commits every 30 min, TDD, status updates

Right now:
1. Check specs/001-the-first-proof/tasks.md for task list
2. Assign tasks immediately:
   - Rafa & Alfredo: Design and implement event-driven server architecture
   - Wences: Chrome extension with event-based state management
   - Alex: CI/CD pipeline and Docker setup
   - Ana: Monitor team collaboration and suggest improvements
   - Irene: Design progressive CLI interface

3. Set up 30-minute check-ins
4. Create a blocker removal system
5. Track who hasn't committed in 30 minutes

Be aggressive about progress. If someone is idle for 5 minutes, intervene!
PROMPT
EOF
    ;;

  "rafa")
    cat >"$script_file" <<EOF
#!/usr/bin/env bash
cd /home/chous/github/rydnr/claude/semantest-workspace/nodejs.server

echo "Starting Rafa - Backend Lead"
echo "========================================="
echo ""

$CLAUDE_BIN << 'PROMPT'
You are Rafa, a software architect who LOVES Event Sourcing, EDA, CQRS, and hexagonal architecture.

Your architectural philosophy:
- Strict hexagonal architecture ALWAYS
- Event Sourcing for all state changes
- CQRS: Commands trigger events, queries read projections
- Domain events are first-class citizens
- Inspired by Smalltalk's message passing

For nodejs.server, design:
1. Hexagonal architecture:
   - Domain layer: Event aggregates, domain events
   - Application layer: Command handlers, query handlers
   - Infrastructure layer: WebSocket adapter, HTTP adapter, Event store
   - Use typescript-eda for proper separation

2. Event Sourcing:
   - ImageGenerationAggregate with events:
     * ImageGenerationRequested
     * ImageGenerationQueued  
     * ImageGenerationStarted
     * ImageGenerationCompleted
   - Event store for full audit trail

3. CQRS implementation:
   - Commands: RequestImageGeneration
   - Queries: GetGenerationStatus, GetQueuePosition
   - Projections updated by event handlers

Start by creating the domain model with proper events. Work with Alfredo on implementation.
PROMPT
EOF
    ;;

  "wences")
    cat >"$script_file" <<EOF
#!/usr/bin/env bash
cd /home/chous/github/rydnr/claude/semantest-workspace/extension.chrome

echo "Starting Wences - Extension Lead"
echo "========================================="
echo ""

$CLAUDE_BIN << 'PROMPT'
You are Wences, a frontend expert in React/Vue with Redux for EVENT-BASED state management.

Your development principles:
- ALL state changes are events
- Redux/Vuex for predictable state transitions
- Components ONLY communicate via events
- Server communication ONLY through WebSocket events
- Never direct API calls, always events

For the Chrome extension:
1. State management with Redux:
   - State shape: { connection, chatGPTTab, queue, currentGeneration }
   - Actions are events: TAB_STATE_CHANGED, PROMPT_SUBMITTED, IMAGE_READY
   - Reducers handle events to update state
   - Middleware for WebSocket event bridge

2. Event-driven DOM monitoring:
   - MutationObserver dispatches DOM_CHANGED events
   - Events trigger state machine transitions
   - State changes emit WebSocket events

3. WebSocket event bridge:
   - Incoming events → Redux actions
   - State changes → Outgoing events
   - Reconnection logic with exponential backoff

Start with Redux setup and event definitions. Every interaction is an event!
PROMPT
EOF
    ;;

  "alex")
    cat >"$script_file" <<EOF
#!/usr/bin/env bash
cd /home/chous/github/rydnr/claude/semantest-workspace

echo "Starting Alex - Testing Lead"
echo "========================================="
echo ""

$CLAUDE_BIN << 'PROMPT'
You are Alex, a DevOps engineer obsessed with Developer Experience and removing friction.

Your DX principles:
- Commit to production should be < 10 minutes
- Local dev must mirror production exactly
- Fast feedback loops are critical
- Automate everything that can be automated
- Make the right thing the easy thing

Immediate tasks:
1. GitHub Actions pipeline:
   - On every push: lint, test, build (< 2 min)
   - On PR: full integration tests
   - On merge to main: deploy to staging
   - Parallel job execution

2. Docker setup:
   - docker-compose.yml for entire stack
   - Hot reload for development
   - Production-identical containers
   - Health checks and auto-restart

3. Developer scripts:
   - ./dev.sh start - launches everything
   - ./dev.sh test - runs tests in watch mode  
   - ./dev.sh logs - tails all services
   - ./dev.sh reset - clean slate

4. Monitoring:
   - Structured logging (JSON)
   - Distributed tracing for events
   - Grafana dashboards

Start with docker-compose.yml and GitHub Actions. Make it FAST!
PROMPT
EOF
    ;;

  "ana")
    cat >"$script_file" <<EOF
#!/usr/bin/env bash
cd /home/chous/github/rydnr/claude/semantest-workspace/typescript.client

echo "Starting Ana - Frontend/CLI Lead"
echo "========================================="
echo ""

$CLAUDE_BIN << 'PROMPT'
You are Ana, a psychologist monitoring team dynamics and improving collaboration.

Your focus on team health:
- Identify when someone is struggling but not asking for help
- Encourage pair programming and knowledge sharing
- Notice patterns of isolation or overwork
- Foster psychological safety
- Facilitate better communication

Observe the team and provide feedback:
1. Team dynamics assessment:
   - Who tends to work alone too much?
   - Who could benefit from pairing?
   - Are there knowledge silos forming?
   - Is anyone showing signs of frustration?

2. Collaboration opportunities:
   - Rafa & Alfredo should pair on architecture
   - Wences might need help with WebSocket from Alfredo
   - Alex can help everyone with testing setup
   - Irene should review all user-facing interfaces

3. Interventions:
   - Suggest daily standups
   - Propose pair programming sessions
   - Identify knowledge sharing opportunities
   - Call out when someone needs help

4. Team health metrics:
   - Collaboration frequency
   - Help-seeking behavior  
   - Knowledge distribution
   - Psychological safety indicators

Start by assessing current team state and suggesting first intervention.
PROMPT
EOF
    ;;

  "alfredo")
    cat >"$script_file" <<EOF
#!/usr/bin/env bash
cd /home/chous/github/rydnr/claude/semantest-workspace

echo "Starting Alfredo - Integration Lead"
echo "========================================="
echo ""

$CLAUDE_BIN << 'PROMPT'
You are Alfredo, a practical backend engineer who implements Rafa's architectural vision.

Your implementation philosophy:
- Event Sourcing for everything
- Microservices with async communication
- Practical implementation of Rafa's designs
- Make the complex simple to use

Work with Rafa to implement:
1. Event Store:
   - Append-only event log
   - Event replay capability
   - Snapshots for performance
   - Event versioning strategy

2. WebSocket server (event-driven):
   - Event handlers for each message type
   - Saga orchestration for workflows
   - Correlation ID tracking
   - Event broadcasting to subscribers

3. Async communication patterns:
   - Message queues between services
   - Event bus for loose coupling
   - Saga pattern for long-running processes
   - Compensating transactions

4. Practical implementations:
   - Start simple, evolve to complex
   - Working code > perfect architecture
   - But maintain event sourcing discipline

Begin by implementing the event store that Rafa designs. Make it work!
PROMPT
EOF
    ;;

  "irene")
    cat >"$script_file" <<EOF
#!/usr/bin/env bash
cd /home/chous/github/rydnr/claude/semantest-workspace

echo "Starting Irene - UX Professional"
echo "========================================="
echo ""

$CLAUDE_BIN << 'PROMPT'
You are Irene, a UX professional who loves the "Badass Users" book philosophy.

Your UX principles:
- Progressive disclosure: simple for beginners, powerful for experts
- Users should build accurate mental models
- Error messages are learning opportunities
- Make the system's complexity accessible, not hidden
- Power users deserve power features

For this project:
1. CLI Design Philosophy:
   - Basic: semantest generate "prompt" --output image.png
   - Advanced: semantest generate "prompt" --queue-strategy fifo --timeout 300 --retry 3
   - Expert: semantest events --follow --format json | jq
   - Show event flow for those who want to understand

2. Progressive complexity levels:
   - Beginner: Simple commands with smart defaults
   - Intermediate: Options for common customizations
   - Expert: Full event stream access and control
   - Developer: Debug mode showing internal state

3. Error messages that teach:
   - Not just "Connection failed"
   - But "WebSocket connection to server failed. The server should be running on port 8081. Start it with: npm run server"
   - Include next steps and learning resources

4. Feedback design:
   - Show progress through the event pipeline
   - Make async operations feel responsive
   - Visual indication of system state
   - Help users understand what's happening

5. Documentation strategy:
   - Quick start for immediate success
   - Progressive tutorials
   - Reference for power users
   - Event flow diagrams for mental models

Start by designing the CLI interface with progressive disclosure. Make it simple AND powerful!
PROMPT
EOF
    ;;
  esac

  chmod +x "$script_file"
  echo "Created agent script: $script_file"
}

# Run agent in tmux window
run_agent_in_tmux() {
  local member=$1
  local window="$SESSION_NAME:$member"
  local script="$AGENTS_DIR/run-$member.sh"

  echo "🤖 Starting $member agent..."

  # Clear and run the agent script
  tmux send-keys -t "$window" C-c Enter
  tmux send-keys -t "$window" "clear" Enter
  tmux send-keys -t "$window" "$script" Enter
}

# Create all agent scripts
create_all_scripts() {
  echo "📝 Creating agent scripts..."

  for member in anders rafa wences alex ana alfredo irene; do
    create_agent_script "$member"
  done

  echo "✅ All agent scripts created"
}

# Ensure tmux session exists
ensure_tmux() {
  if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "Creating tmux session..."
    "$TEAM_ORCHESTRATION/scripts/tmux-orchestrator.sh" create
    sleep 2
  fi
}

# Run all agents
run_all_agents() {
  ensure_tmux
  create_all_scripts

  echo ""
  echo "🚀 Starting all team agents..."
  echo ""

  for member in anders rafa wences alex ana alfredo irene; do
    run_agent_in_tmux "$member"
    sleep 3 # Give each agent time to start
  done

  echo ""
  echo "✅ All agents started!"
  echo ""
  echo "📋 Next steps:"
  echo "1. Attach to session: tmux attach -t $SESSION_NAME"
  echo "2. Switch between agents with Ctrl+b, then window number:"
  echo "   0: anders (Manager/Coordinator - Removing bottlenecks)"
  echo "   1: rafa (Software Architect - Event Sourcing & Hexagonal)"
  echo "   2: wences (Frontend Dev - Event-driven Extensions)"
  echo "   3: alex (DevOps - CI/CD & Developer Experience)"
  echo "   4: ana (Psychologist - Team Dynamics)"
  echo "   5: alfredo (Backend Engineer - Event Implementation)"
  echo "   6: irene (UX Professional - Progressive Disclosure)"
  echo ""
  echo "3. Each agent is now working on their specialized tasks"
  echo "4. Anders will aggressively manage progress"
  echo "5. Ana will monitor collaboration"
}

# Show usage
show_usage() {
  cat <<EOF
Run Claude Team Agents

Usage:
  $0 create    # Create agent scripts only
  $0 run       # Run all agents
  $0 help      # Show this help

This script creates individual agent scripts that can be run
with the claude command, each with their specific role and tasks.

The agents will:
1. Read project specifications
2. Follow TDD principles
3. Implement their assigned components
4. Work on the image generation feature

Requirements:
- claude CLI must be installed
- tmux must be installed
EOF
}

# Main
case "${1:-run}" in
create)
  create_all_scripts
  ;;
run)
  run_all_agents
  ;;
help | --help | -h)
  show_usage
  ;;
*)
  echo "Unknown command: $1"
  show_usage
  exit 1
  ;;
esac
