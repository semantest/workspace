# REQ-004: Design - Agent Access Architecture Implementation

**ID**: REQ-004-DESIGN  
**Date**: 2025-07-25  
**Status**: URGENT  
**Author**: System Architect  
**Critical**: Unblocks 57+ hours of communication failures

## 1. Executive Summary

Implement workspace-based architecture to solve the fundamental constraint where Claude agents cannot access parent directories. This design enables true multi-agent orchestration at scale.

## 2. Current State Analysis

### The Broken State
```
Agent launched in: /home/chous/work/semantest/
Trying to access: ../tmux-orchestrator/message-agent.sh
Result: FAILS - Cannot access parent directory
Impact: 57+ hours of failed communication attempts
```

### Failed Workarounds Attempted
1. Relative paths: `../tmux-orchestrator/` → FAILED
2. Absolute paths in messages → FAILED (agents can't execute)
3. Script copying → PARTIAL (but creates maintenance nightmare)

## 3. Workspace Architecture Design

### 3.1 Directory Structure
```
/home/chous/work/ai-workspace/          # New root for all AI development
├── control-plane/                      # Orchestration and monitoring
│   ├── orchestrator/                   # Core orchestration tools
│   │   ├── agent-launcher.sh          # Standardized launcher
│   │   ├── agent-manager.sh           # Lifecycle management
│   │   └── health-monitor.sh          # Health checking
│   ├── messaging/                      # Communication hub
│   │   ├── message-bus.sh             # Central message router
│   │   ├── channels/                   # Named channels
│   │   └── queues/                     # Message queues
│   └── monitoring/                     # Observability
│       ├── dashboard.sh                # Status dashboard
│       └── metrics/                    # Performance metrics
│
├── shared-tools/                       # Shared utilities
│   ├── common/                         # Common scripts
│   ├── security/                       # Security tools
│   └── testing/                        # Test utilities
│
├── projects/                           # All projects
│   ├── semantest/                      # Existing project
│   ├── project-2/                      # Future project
│   └── README.md                       # Project registry
│
├── agents/                             # Agent work areas
│   ├── alice-backend-semantest/        # Agent workspace
│   │   ├── .agent-config              # Agent configuration
│   │   ├── context/                    # Agent memory
│   │   └── workspace/                  # Working files
│   └── bob-frontend-semantest/         # Another agent
│
└── communication/                      # Inter-agent communication
    ├── broadcast/                      # Broadcast channels
    ├── direct/                         # Direct messaging
    └── logs/                           # Communication logs
```

### 3.2 Agent Launch Architecture

```bash
# New standardized launch command
cd /home/chous/work/ai-workspace
./control-plane/orchestrator/agent-launcher.sh \
  --name alice \
  --role backend \
  --project semantest \
  --personality cautious \
  --workspace ./agents/alice-backend-semantest
```

### 3.3 Communication Architecture

#### Message Bus Design
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Agent Alice   │────▶│   Message Bus   │────▶│    Agent Bob    │
│ semantest/backend│     │  File-based     │     │ project2/frontend│
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                         │
         └───────────────────────┴─────────────────────────┘
                        Can all access:
                    /ai-workspace/communication/
```

#### Message Format
```json
{
  "id": "msg-1234567890",
  "from": "alice-backend-semantest",
  "to": "bob-frontend-project2",
  "channel": "architecture-review",
  "timestamp": "2025-07-25T12:00:00Z",
  "type": "request",
  "payload": {
    "action": "review-design",
    "data": { ... }
  }
}
```

## 4. Implementation Components

### 4.1 Workspace Initializer
```bash
#!/bin/bash
# init-workspace.sh - Initialize AI workspace structure

WORKSPACE_ROOT="/home/chous/work/ai-workspace"

# Create directory structure
mkdir -p $WORKSPACE_ROOT/{control-plane,shared-tools,projects,agents,communication}
mkdir -p $WORKSPACE_ROOT/control-plane/{orchestrator,messaging,monitoring}
mkdir -p $WORKSPACE_ROOT/communication/{broadcast,direct,logs}

# Migrate existing tools
mv /home/chous/work/tmux-orchestrator/* $WORKSPACE_ROOT/control-plane/orchestrator/

# Create project links for backward compatibility
ln -s $WORKSPACE_ROOT/projects/semantest /home/chous/work/semantest-workspace
```

### 4.2 Agent Launcher 2.0
```bash
#!/bin/bash
# agent-launcher.sh - Launch agents with proper access

# Parse arguments
NAME=$1
ROLE=$2
PROJECT=$3

# Create agent workspace
AGENT_WORKSPACE="$WORKSPACE_ROOT/agents/$NAME-$ROLE-$PROJECT"
mkdir -p $AGENT_WORKSPACE/{context,workspace}

# Create agent configuration
cat > $AGENT_WORKSPACE/.agent-config << EOF
NAME=$NAME
ROLE=$ROLE
PROJECT=$PROJECT
LAUNCH_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
WORKSPACE=$AGENT_WORKSPACE
PROJECT_PATH=$WORKSPACE_ROOT/projects/$PROJECT
TOOLS_PATH=$WORKSPACE_ROOT/shared-tools
MESSAGE_BUS=$WORKSPACE_ROOT/communication
EOF

# Launch agent from workspace root
cd $WORKSPACE_ROOT
claude --persona $ROLE --project projects/$PROJECT
```

### 4.3 Message Router
```bash
#!/bin/bash
# message-bus.sh - Central message routing

send_message() {
    local from=$1
    local to=$2
    local message=$3
    
    # Create message file
    msg_id="msg-$(date +%s)-$$"
    msg_file="$MESSAGE_BUS/direct/$to/$msg_id.json"
    
    # Write message
    cat > $msg_file << EOF
{
  "id": "$msg_id",
  "from": "$from",
  "to": "$to",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "payload": $message
}
EOF
    
    # Notify recipient (if online)
    notify_agent $to $msg_id
}
```

### 4.4 Migration Wrapper
```bash
#!/bin/bash
# migrate-agent.sh - Migrate existing agent to workspace model

OLD_PROJECT_PATH="/home/chous/work/semantest"
NEW_PROJECT_PATH="$WORKSPACE_ROOT/projects/semantest"

# Copy project files
rsync -av $OLD_PROJECT_PATH/ $NEW_PROJECT_PATH/

# Update agent launch scripts
find $NEW_PROJECT_PATH -name "*.sh" -exec sed -i \
  's|/home/chous/work/tmux-orchestrator|/home/chous/work/ai-workspace/control-plane/orchestrator|g' {} \;

# Create compatibility symlinks
ln -s $WORKSPACE_ROOT/control-plane/orchestrator/message-agent.sh \
      $NEW_PROJECT_PATH/.orchestrator/message-agent.sh
```

## 5. Migration Plan

### Phase 1: Infrastructure (Day 1)
1. Run `init-workspace.sh` to create structure
2. Migrate orchestrator tools
3. Set up message bus
4. Create monitoring dashboard

### Phase 2: Pilot Migration (Day 2-3)
1. Select one agent for pilot
2. Migrate using `migrate-agent.sh`
3. Test communication channels
4. Validate tool access

### Phase 3: Full Migration (Day 4-7)
1. Migrate remaining agents systematically
2. Update all launch procedures
3. Verify inter-agent communication
4. Performance testing at scale

### Phase 4: Cleanup (Week 2)
1. Remove duplicated tools
2. Archive old structures
3. Update documentation
4. Team training

## 6. Validation & Testing

### 6.1 Smoke Tests
```bash
# Test 1: Tool access
agent-exec alice "ls $TOOLS_PATH/common/"  # Should list tools

# Test 2: Inter-agent messaging
agent-exec alice "message-agent.sh bob 'Hello'"  # Should deliver

# Test 3: Project access
agent-exec alice "cd projects/semantest && ls"  # Should work

# Test 4: Broadcast
agent-exec alice "broadcast.sh 'System update'"  # All agents receive
```

### 6.2 Load Tests
- 10 agents messaging simultaneously
- 50 agents accessing shared tools
- 100 messages/second throughput
- Resource monitoring under load

## 7. Rollback Strategy

If issues arise:
1. Agents can still run from old locations temporarily
2. Compatibility symlinks preserve old paths
3. Message bus has offline queuing
4. Gradual migration allows partial rollback

## 8. Long-Term Benefits

1. **Scalability**: Add projects without tool duplication
2. **Maintainability**: Single source of truth for tools
3. **Performance**: Optimized message routing
4. **Flexibility**: Easy to add new capabilities
5. **Observability**: Central monitoring of all agents

## 9. Success Metrics

- **Day 1**: Workspace structure created, tools migrated
- **Day 3**: First successful inter-agent message in new architecture
- **Day 7**: All agents migrated, old structure deprecated
- **Day 14**: 99.9% message delivery success rate
- **Day 30**: 50+ agents operating smoothly

---

**Implementation Priority**: IMMEDIATE - Unblocks all multi-agent collaboration  
**Estimated Effort**: 1 week for full migration  
**Risk Level**: Low (with gradual migration approach)