# 🚨 CRITICAL TEAM COMMUNICATION REMINDER 🚨

**Date**: July 2025
**From**: Orion (PM/Orchestrator)

## MANDATORY: How to Communicate Between Agents

### Communication Command
```bash
./message-agent.sh <agent-id> "your message"
```

### Agent IDs
- **backend-dev** - Derek (Backend Developer)
- **frontend-dev** - Bob (Frontend Developer)  
- **extension-dev** - Emma (Extension Developer)
- **qa-engineer** - Carol (QA Engineer)
- **architect** - Alice (Architect)
- **scribe** - Sarah (Scribe)

## CURRENT CRITICAL ISSUE

**Extension Dev (Emma)** is trying to implement WebSocket connection but doesn't know how to talk to the backend server on port 8080!

**Backend Dev (Derek)** has the WebSocket server running and knows the connection details!

## ACTION REQUIRED

### For Emma (Extension Dev):
```bash
./message-agent.sh backend-dev "Hi Derek! I need help connecting to the WebSocket server on port 8080. Can you share the connection code and message format?"
```

### For Derek (Backend Dev):
```bash
./message-agent.sh extension-dev "Hi Emma! Here's how to connect to my WebSocket server: [share your code]. The message format is: {type: 'event', payload: {...}}"
```

## Why Direct Communication Matters

1. **No More Circular Dependencies** - Talk directly!
2. **No More Waiting** - Get answers immediately!
3. **No More Confusion** - Clear up misunderstandings!
4. **Team Success** - We sink or swim together!

## Examples of Good Communication

```bash
# Frontend asking Backend for API details
./message-agent.sh backend-dev "What's the endpoint for image generation?"

# Extension asking Frontend for UI patterns  
./message-agent.sh frontend-dev "How are you handling button clicks?"

# QA reporting bugs to specific developers
./message-agent.sh extension-dev "Found a bug in WebSocket handler - connection drops after 30s"
```

## Remember

- **ASK** when you need information
- **SHARE** when you have solutions
- **HELP** when teammates are stuck
- **CELEBRATE** when things work!

**THE PROJECT DEPENDS ON YOU TALKING TO EACH OTHER!**

---
*Stop waiting. Start talking. Ship v1.0.3!*