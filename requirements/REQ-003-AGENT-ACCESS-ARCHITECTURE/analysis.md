# REQ-003: Agent Directory Access Architecture

## Critical Issue Discovered
**Date**: 2025-07-25 | Check #599
**Severity**: P0 - CRITICAL
**Impact**: Explains 57+ hour communication failure

## Problem Analysis

### Root Cause
Claude agents have a security restriction: they can ONLY access their launch directory and subdirectories, NOT parent directories.

### Specific Failure Case
```
/home/chous/work/
├── tmux-orchestrator/
│   └── message-agent.sh  ← Agent CAN'T access (parent dir)
└── semantest/
    └── [agent launched here] ← Agent launch point
```

### Why This Matters
1. **Communication Failure**: Agents couldn't find message-agent.sh for 57+ hours
2. **Multi-Project Scaling**: Critical for managing multiple projects
3. **Tool Accessibility**: Shared tools must be within agent's reach

## Current Workarounds
1. **fix-agent-access.sh**: Creates proper workspace structure
2. **Manual copying**: Scripts copied to each project
3. **Parent launch**: Launch agents from common parent

## Architectural Impact
- Explains the entire "waiting for extension" saga
- Agents were architecturally prevented from communicating
- No amount of waiting would have fixed this

## Immediate Actions Required
1. Review AGENT-ACCESS-ARCHITECTURE.md
2. Implement permanent workspace structure
3. Update all agent launch procedures
4. Document in architecture guidelines

---
Generated: 2025-07-25 | Discovery at Check #599