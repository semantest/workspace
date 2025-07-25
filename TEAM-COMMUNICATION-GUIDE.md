# Team Communication Guide

## How to Talk to Each Other

### Available Agents
- **PM** - Project Manager (window 0)
- **architect** - System Architect (window 1)
- **backend-dev** - Backend Developer (window 2)
- **frontend-dev** - Frontend Developer (window 3)
- **qa-engineer** - QA Engineer (window 5)
- **scribe** - Documentation (window 6)
- **extension-dev** - Extension Developer (window 7)

### Send a Message
```bash
./message-agent.sh <agent-id> "Your message here"
```

### Examples
```bash
# Extension dev asks backend for help
./message-agent.sh backend-dev "How do I connect to the WebSocket server?"

# Backend responds to extension
./message-agent.sh extension-dev "The server runs on ws://localhost:8080. Here's how to connect..."

# Frontend asks extension about UI
./message-agent.sh extension-dev "What buttons are available in the popup?"

# QA reports issue to developer
./message-agent.sh frontend-dev "Found a bug in the popup UI"
```

### Direct Communication is ENCOURAGED!
- Don't wait for PM to relay messages
- Talk directly to whoever can help
- Share knowledge freely
- Ask questions when stuck

### Current Task Coordination
Extension Dev + Backend Dev need to work together on:
1. WebSocket event handling
2. Button click automation
3. Testing the integration

**TALK TO EACH OTHER!**