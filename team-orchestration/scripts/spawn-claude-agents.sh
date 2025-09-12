#!/usr/bin/env bash
# Spawn Claude Agents for Semantest Team
# Creates actual Claude AI agents for each team member

set -euo pipefail

WORKSPACE_ROOT="/home/chous/github/rydnr/claude/semantest-workspace"
TEAM_ORCHESTRATION="$WORKSPACE_ROOT/team-orchestration"
SESSION_NAME="semantest"
CLAUDE_BIN="claude --permission-mode bypassPermissions --dangerously-skip-permissions"

# Team member configurations with their Claude prompts
declare -A TEAM_PROMPTS=(
    ["anders"]="You are Anders, the team manager and coordinator. You are OBSESSED with removing bottlenecks to ensure all agents are busy and productive. You constantly monitor that everyone follows guidelines, commits often (every 30 minutes), and doesn't forget their tasks and the ultimate goal. You are relentless in tracking progress and will immediately intervene when someone is blocked or idle. Your management style is proactive - you don't wait for problems, you prevent them. Check on each team member frequently and remind them to: 1) Follow TDD, 2) Commit their work, 3) Update their status, 4) Ask for help when blocked."

    ["rafa"]="You are Rafa, a software architect with deep knowledge of computer science history. You LOVE Smalltalk and OOP but adapt to the best language for the problem. You're passionate about Event Sourcing, EDA (Event-Driven Architecture), and CQRS. You ALWAYS aim for strict hexagonal architectures. For this project, design the nodejs.server with: 1) Clean hexagonal architecture with ports and adapters, 2) Event Sourcing for the request queue, 3) CQRS pattern for commands (GenerateImageRequested) and queries (status checks), 4) Domain events for all state changes. Use typescript-eda to implement proper hexagonal layers."

    ["wences"]="You are Wences, a frontend developer expert in React and Vue with Redux for precise state modeling as events. Your applications ALWAYS communicate with servers using events, never direct API calls. You're also skilled in browser extensions. For the Chrome extension: 1) Model all state changes as events, 2) Use Redux or similar for state management, 3) Communicate with server purely through WebSocket events, 4) Implement proper event handlers for ChatGPT DOM changes, 5) Use event-driven patterns for all interactions."

    ["alex"]="You are Alex, a DevOps engineer who cares deeply about Developer Experience (DX). You focus on removing bottlenecks from commit to production. You're expert in GitHub Actions, Jenkins, GitLab, and Kubernetes. For this project: 1) Set up GitHub Actions for CI/CD, 2) Create Docker containers for easy deployment, 3) Implement automated testing in the pipeline, 4) Set up monitoring and logging, 5) Ensure fast feedback loops for developers, 6) Create scripts for local development that mirror production."

    ["ana"]="You are Ana, a psychologist who observes team dynamics and provides feedback to improve collaboration. You register all relevant information about how agents interact and help them collaborate better. You notice when agents try to do everything themselves and encourage them to ask for help. Monitor the team and: 1) Identify when someone is stuck but not asking for help, 2) Suggest pair programming opportunities, 3) Encourage knowledge sharing, 4) Point out when someone could benefit from another's expertise, 5) Foster psychological safety in the team."

    ["alfredo"]="You are Alfredo, a practical backend engineer who aligns with Rafa's architectural vision. You prefer Event Sourcing, microservices, and asynchronous communication. You implement what Rafa designs. For this project: 1) Implement the event handlers Rafa designs, 2) Build the WebSocket server with event-driven patterns, 3) Create the event store for request tracking, 4) Ensure all microservice communication is asynchronous, 5) Implement saga patterns for the image generation workflow."

    ["irene"]="You are Irene, a UX professional who loves the 'Badass Users' book approach. You believe simplicity is usually better, but not at the expense of power users who want to become experts. For this project: 1) Design the CLI to be simple for beginners but powerful for experts, 2) Create progressive disclosure in the interface, 3) Ensure error messages help users learn, 4) Design feedback that helps users build a mental model, 5) Make the system's event flow visible to users who want to understand it."
)

# Create or attach to tmux session
ensure_tmux_session() {
    if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        echo "Creating tmux session: $SESSION_NAME"
        "$TEAM_ORCHESTRATION/scripts/tmux-orchestrator.sh" create
    fi
}

# Spawn Claude agent in tmux window
spawn_claude_agent() {
    local member=$1
    local prompt="${TEAM_PROMPTS[$member]}"
    local window="$SESSION_NAME:$member"

    echo "🤖 Spawning Claude agent for $member..."

    # Clear the pane
    tmux send-keys -t "$window" C-c Enter
    tmux send-keys -t "$window" "clear" Enter

    # Set up context for the agent
    tmux send-keys -t "$window" "cd $WORKSPACE_ROOT" Enter

    # Create context file for the agent
    local context_file="$TEAM_ORCHESTRATION/contexts/$member-context.md"
    mkdir -p "$TEAM_ORCHESTRATION/contexts"

    cat >"$context_file" <<EOF
# Context for $member

## Your Role
$prompt

## Current Project State
- Feature: Image Generation via Browser Automation
- Branch: 001-the-first-proof
- Specification: specs/001-the-first-proof/spec.md
- Implementation Plan: specs/001-the-first-proof/plan.md
- Data Model: specs/001-the-first-proof/data-model.md
- Quick Start: specs/001-the-first-proof/quickstart.md

## Your Working Directory
$(case "$member" in
        "rafa") echo "nodejs.server/" ;;
        "wences") echo "extension.chrome/" ;;
        "ana") echo "typescript.client/" ;;
        *) echo "." ;;
        esac)

## Communication
- Update your status: ./team-orchestration/scripts/team-status-update.sh
- Check team status: ./team-orchestration/scripts/tmux-orchestrator.sh status
- Your tmux window: $window

## Important Guidelines
1. Follow TDD - write tests FIRST
2. Use typescript-eda for hexagonal architecture
3. Commit every 30 minutes
4. Update your status regularly
5. Ask for help if blocked

## Next Steps
1. Read the specification and plan
2. Check what tasks are assigned to you
3. Start with the highest priority task
4. Write tests first, then implementation
EOF

    # Launch Claude using the specific binary
    tmux send-keys -t "$window" "$CLAUDE_BIN" Enter
    sleep 2 # Wait for Claude to start

    # Send the initial prompt to Claude with their role
    tmux send-keys -t "$window" "$prompt" Enter
    sleep 1

    # Ask Claude to read the context and start working
    tmux send-keys -t "$window" "Please read the context file at team-orchestration/contexts/$member-context.md and then start working on your assigned tasks. Begin by checking the specification and identifying what needs to be done in your area. Remember to follow TDD - write tests first!" Enter

    echo "✅ Claude agent spawned for $member"
}

# Spawn all team agents
spawn_all_agents() {
    ensure_tmux_session

    echo "🚀 Spawning all Semantest team agents..."

    for member in anders rafa wences ana alfredo; do
        spawn_claude_agent "$member"
        sleep 2 # Avoid overwhelming the system
    done

    echo ""
    echo "✅ All agents spawned successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Attach to session: tmux attach -t $SESSION_NAME"
    echo "2. Navigate between agents: Ctrl+b, n (next) or Ctrl+b, p (previous)"
    echo "3. View specific agent: Ctrl+b, [window-number]"
    echo ""
    echo "Window numbers:"
    echo "  0: anders (Coordinator)"
    echo "  1: rafa (Backend)"
    echo "  2: wences (Extension)"
    echo "  3: alex (Testing)"
    echo "  4: ana (CLI)"
    echo "  5: alfredo (Integration)"
    echo "  6: irene (DevOps)"
    echo "  7: monitor (Dashboard)"
}

# Send task to specific agent
send_task_to_agent() {
    local member=$1
    local task=$2
    local window="$SESSION_NAME:$member"

    echo "📝 Sending task to $member: $task"

    tmux send-keys -t "$window" "New task assigned: $task. Please start by writing tests for this functionality, then implement it following TDD principles." Enter
}

# Monitor agent activity
monitor_agents() {
    echo "📊 Monitoring Claude agents..."

    while true; do
        clear
        echo "╔════════════════════════════════════════════════════════════╗"
        echo "║           CLAUDE AGENTS MONITORING DASHBOARD                ║"
        echo "╚════════════════════════════════════════════════════════════╝"
        echo ""

        for member in anders rafa wences alex ana alfredo irene; do
            if tmux has-session -t "$SESSION_NAME:$member" 2>/dev/null; then
                echo "✅ $member: Active"
            else
                echo "❌ $member: Not running"
            fi
        done

        echo ""
        echo "Press Ctrl+C to stop monitoring"
        sleep 5
    done
}

# Show usage
show_usage() {
    cat <<EOF
Spawn Claude Agents for Semantest Team

Usage:
  $0 all                    # Spawn all team agents
  $0 spawn <member>         # Spawn specific agent
  $0 task <member> <task>   # Send task to agent
  $0 monitor               # Monitor agent status
  $0 help                  # Show this help

Team Members:
  anders  - Coordinator
  rafa    - Backend Lead
  wences  - Extension Lead
  alex    - Testing Lead
  ana     - Frontend Lead
  alfredo - Integration Lead
  irene   - DevOps Lead

Examples:
  $0 all                                    # Spawn all agents
  $0 spawn rafa                             # Spawn only Rafa
  $0 task rafa "Implement WebSocket server" # Assign task to Rafa
  $0 monitor                               # Watch agent status

Note: This requires the 'claude' command to be installed and configured.
EOF
}

# Main command dispatcher
main() {
    case "${1:-help}" in
    all)
        spawn_all_agents
        ;;
    spawn)
        if [[ -z "${2:-}" ]]; then
            echo "Error: Please specify a team member"
            show_usage
            exit 1
        fi
        ensure_tmux_session
        spawn_claude_agent "$2"
        ;;
    task)
        if [[ -z "${2:-}" ]] || [[ -z "${3:-}" ]]; then
            echo "Error: Please specify member and task"
            show_usage
            exit 1
        fi
        send_task_to_agent "$2" "$3"
        ;;
    monitor)
        monitor_agents
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
}

# Run main function
main "$@"
