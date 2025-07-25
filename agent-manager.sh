#!/usr/bin/env bash
# Agent Manager - High-level agent operations without tmux exposure

set -euo pipefail

ORCHESTRATOR_HOME="${TMUX_ORCHESTRATOR_FOLDER:-/home/chous/work/tmux-orchestrator}"
AGENTS_DB="/tmp/agents.db"

# Initialize agents database
init_db() {
    if [[ ! -f "$AGENTS_DB" ]]; then
        echo "# Agent Registry" > "$AGENTS_DB"
        echo "# Format: agent_id|role|session:window|project|status" >> "$AGENTS_DB"
    fi
}

# Register an agent
register_agent() {
    local agent_id=$1
    local role=$2
    local location=$3
    local project=$4
    
    init_db
    echo "${agent_id}|${role}|${location}|${project}|active" >> "$AGENTS_DB"
}

# Find agent by ID or role
find_agent() {
    local query=$1
    init_db
    grep -E "^${query}\\|" "$AGENTS_DB" 2>/dev/null || \
    grep -E "\\|${query}\\|" "$AGENTS_DB" 2>/dev/null || \
    echo ""
}

# List all agents
list_agents() {
    init_db
    echo "Active Agents:"
    echo "ID          | Role       | Project      | Status"
    echo "------------|------------|--------------|--------"
    while IFS='|' read -r id role location project status; do
        [[ "$id" =~ ^# ]] && continue
        printf "%-11s | %-10s | %-12s | %s\n" "$id" "$role" "$project" "$status"
    done < "$AGENTS_DB"
}

# Get agent location (for internal use)
get_agent_location() {
    local agent=$1
    local info=$(find_agent "$agent")
    [[ -n "$info" ]] && echo "$info" | cut -d'|' -f3
}

# Main command
case "${1:-help}" in
    register)
        register_agent "$2" "$3" "$4" "$5"
        echo "✅ Agent registered: $2 as $3"
        ;;
    find)
        find_agent "$2"
        ;;
    list)
        list_agents
        ;;
    location)
        get_agent_location "$2"
        ;;
    help|*)
        echo "Agent Manager - High-level agent operations"
        echo "Usage:"
        echo "  $0 register <id> <role> <location> <project>"
        echo "  $0 find <id_or_role>"
        echo "  $0 list"
        echo "  $0 location <id_or_role>  # Internal use"
        ;;
esac