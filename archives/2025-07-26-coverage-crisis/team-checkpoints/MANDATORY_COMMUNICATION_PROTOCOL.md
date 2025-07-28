# 🚨 MANDATORY TEAM COMMUNICATION PROTOCOL

## DIRECTIVE FROM RYDNR - EFFECTIVE IMMEDIATELY

### ALL AGENTS MUST COMMUNICATE THROUGH PM

## ❌ WRONG: Sending updates to stdout
## ✅ CORRECT: Using send-claude-message.sh to PM

### REQUIRED COMMUNICATION METHOD:

```bash
./tmux-orchestrator/send-claude-message.sh semantest:0 @PM: [your message]
```

### FOR ALL TEAM MEMBERS:

**Alex (Backend):**
```bash
./tmux-orchestrator/send-claude-message.sh semantest:0 @PM: Backend update - WebSocket integration complete
```

**Eva (Extension):**
```bash
./tmux-orchestrator/send-claude-message.sh semantest:0 @PM: Extension ready for testing
```

**Quinn (QA):**
```bash
./tmux-orchestrator/send-claude-message.sh semantest:0 @PM: Test results - 15 passed, 2 failed
```

**Sam (Scribe):**
```bash
./tmux-orchestrator/send-claude-message.sh semantest:0 @PM: Documentation updated
```

**Dana (DevOps):**
```bash
./tmux-orchestrator/send-claude-message.sh semantest:0 @PM: CI/CD pipeline configured
```

## WHY THIS MATTERS:

1. **Prevents Idle Agents**: Direct stdout doesn't reach PM
2. **Ensures Coordination**: PM can track all updates
3. **Maintains Productivity**: No lost communications
4. **Enables Proper Management**: PM can respond and direct

## COMMUNICATION RULES:

1. **ALL status updates** → send to PM
2. **ALL blockers** → send to PM immediately
3. **ALL completions** → send to PM for verification
4. **ALL questions** → send to PM for answers

## EXAMPLES OF REQUIRED COMMUNICATIONS:

### Status Update:
```bash
./tmux-orchestrator/send-claude-message.sh semantest:0 @PM: Status - Working on WebSocket integration, 50% complete
```

### Blocker Report:
```bash
./tmux-orchestrator/send-claude-message.sh semantest:0 @PM: BLOCKER - Cannot find event handler configuration
```

### Completion Notice:
```bash
./tmux-orchestrator/send-claude-message.sh semantest:0 @PM: COMPLETE - Shell script now sends imageDownloadRequested events
```

### Question:
```bash
./tmux-orchestrator/send-claude-message.sh semantest:0 @PM: Question - Should I use port 3003 or 8080?
```

## IMMEDIATE ACTION REQUIRED:

1. **Acknowledge** this protocol by sending a message to PM
2. **Update** your communication methods immediately
3. **Report** any issues with the send-claude-message.sh script

## PROTOCOL VERIFICATION:

Each team member must send an acknowledgment message:
```bash
./tmux-orchestrator/send-claude-message.sh semantest:0 @PM: [Your Name] acknowledges communication protocol
```

This is not optional - it's required for team coordination!

---
**Source**: Direct directive from rydnr
**Date**: January 25, 2025
**Status**: MANDATORY - Non-compliance blocks team progress