# REQ-004: Agent Access Architecture - Solving Directory Constraints

**ID**: REQ-004  
**Date**: 2025-07-25  
**Status**: CRITICAL  
**Priority**: P0 - FOUNDATION BLOCKER  
**Requester**: System Discovery  
**Discovery**: 57+ hours of communication failures traced to directory access constraint

## Critical Discovery

Claude agents operate under a fundamental security constraint: they can ONLY access their launch directory and subdirectories. They CANNOT access parent directories or sibling directories. This explains:
- Why message-agent.sh failed for 57+ hours
- Why agents couldn't communicate across projects
- Why wake schedulers couldn't reach other agents
- Why orchestration tools remained inaccessible

## Problem Statement

### Current Architecture Failure
```
/home/chous/work/
├── tmux-orchestrator/         # INACCESSIBLE to agents launched in semantest/
│   ├── message-agent.sh       # ❌ "../tmux-orchestrator/message-agent.sh" fails
│   ├── send-claude-message.sh # ❌ Cannot be reached
│   └── spawn-*.sh             # ❌ Orchestration broken
└── semantest/                 # Agent launched here
    └── [can only see this tree] # ✅ Only this directory and below
```

### Impact at Scale (10+ projects, 50+ agents)
1. **Tool Duplication**: 10x copies of every script = maintenance nightmare
2. **Version Drift**: Each project's tools evolve independently  
3. **Communication Breakdown**: No inter-project messaging possible
4. **Orchestration Failure**: Cannot coordinate across projects
5. **Resource Waste**: Gigabytes of duplicated utilities

## Requirements

### Functional Requirements
1. **FR-001**: Agents MUST access shared orchestration tools
2. **FR-002**: Inter-agent communication MUST work across projects
3. **FR-003**: Central orchestrator MUST reach all agents
4. **FR-004**: Agents MUST maintain project file access
5. **FR-005**: Solution MUST scale to 100+ agents across 20+ projects
6. **FR-006**: Migration MUST be zero-downtime for existing agents

### Non-Functional Requirements
1. **NFR-001**: Message routing latency < 100ms at 50 agents
2. **NFR-002**: Tool access overhead < 10ms
3. **NFR-003**: Storage efficiency > 90% (minimal duplication)
4. **NFR-004**: Version consistency across all projects
5. **NFR-005**: Security model maintaining least privilege

## Proposed Solution: Workspace Architecture

### Target Structure
```
/workspace/                    # ← All agents launch from here
├── shared-tools/             # ← Accessible to all agents
│   ├── orchestrator/
│   ├── messaging/
│   └── utilities/
├── projects/                 # ← Project files
│   ├── semantest/
│   ├── project-2/
│   └── project-n/
├── agent-workspaces/         # ← Agent work areas
│   ├── alice-backend/
│   ├── bob-frontend/
│   └── carol-qa/
└── communication/            # ← Message bus
    ├── channels/
    └── queues/
```

### Key Architectural Changes
1. **Inverted Access Model**: Agents reach DOWN into projects, not UP to tools
2. **Centralized Tools**: Single source of truth for all utilities
3. **Message Bus**: File-based pub/sub for inter-agent communication
4. **Workspace Launcher**: Standardized agent initialization

## Success Criteria

1. **Communication**: 100% message delivery between any two agents
2. **Tool Access**: Zero "file not found" errors for orchestration tools
3. **Performance**: Sub-second message routing at 50+ agent scale
4. **Migration**: Existing agents transitioned without data loss
5. **Documentation**: Complete runbooks for the new architecture

## Migration Strategy

### Phase 1: Quick Fix (24 hours)
- Deploy fix-agent-access.sh for critical projects
- Copy essential tools to existing projects
- Document workarounds for active agents

### Phase 2: Workspace Setup (Week 1)
- Create workspace structure
- Migrate shared tools
- Test with pilot agents

### Phase 3: Agent Migration (Week 2)
- Systematic migration of existing agents
- Update launch procedures
- Verify communication channels

### Phase 4: Full Deployment (Week 3)
- Complete migration of all projects
- Remove duplicated tools
- Performance optimization

## Risks

1. **Migration Disruption**: Active agents need careful transition
2. **Learning Curve**: Teams must adapt to new structure
3. **Path Dependencies**: Hardcoded paths in existing scripts
4. **Performance**: Shared directory under heavy I/O load
5. **Backup Strategy**: Need rollback plan if issues arise

## Dependencies

- Fix-agent-access.sh script (exists)
- AGENT-ACCESS-ARCHITECTURE.md documentation (exists)
- Team training on new procedures
- Updated spawn scripts for workspace model

## Long-Term Vision

This architectural change enables:
- **True Multi-Agent Orchestration**: Coordinate 100+ agents seamlessly
- **Project Federation**: Multiple projects working together
- **Tool Evolution**: Centralized updates and improvements
- **Performance Monitoring**: Unified metrics across all agents
- **AI Pair Programming**: Agents collaborating across domains

## Validation Checklist

- [ ] All agents can access shared tools
- [ ] Message-agent.sh works from any agent
- [ ] Wake schedulers reach all agents
- [ ] No tool duplication across projects
- [ ] Performance meets targets at scale
- [ ] Zero-downtime migration achieved

---

**Discovered After**: 57+ hours of "file not found" errors  
**Root Cause**: Fundamental Claude security model  
**Solution Confidence**: 95% (validated by fix-agent-access.sh)