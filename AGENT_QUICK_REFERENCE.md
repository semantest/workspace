# Agent Quick Reference Card

## 🔧 CRITICAL: Communication Protocol

**ALWAYS USE:**
```bash
./tmux-orchestrator/send-claude-message.sh semantest:X "Your message"
```

**NEVER USE:**
```bash
tmux send-keys -t semantest:X "message"  # ❌ NO ENTER KEY!
```

## 📋 Team Directory

- **Window 0**: Madison (PM)
- **Window 1**: Alex (Backend)
- **Window 2**: Eva (Extension)
- **Window 3**: Quinn (QA)
- **Window 4**: Sam (Scribe)
- **Window 5**: Dana (DevOps)
- **Window 6**: Aria (Architect)

## 💾 Git Commit Rules

Every 10 minutes:
```bash
git add -A
git commit -m "🚧 Progress: brief description"
git push
```

### TDD Emoji Guide
- 💡 = Idea/planning
- 🧪 = New failing test
- 🍬 = Naive implementation
- 🚧 = Work in progress
- 🚀 = Refactored
- 📝 = Documentation
- 🏅 = Task complete

## 📁 Working Directory

You are in: `/home/chous/work`

Access with:
- `./semantest/` - Project files
- `./tmux-orchestrator/` - Communication tools

## 🚨 When Blocked

1. Tell PM immediately
2. Use keyword "BLOCKED" in message
3. PM will create GitHub issue with [BLOCKER] tag

## ⚡ Common Commands

```bash
# Send message to PM
./tmux-orchestrator/send-claude-message.sh semantest:0 "Status update"

# Send message to peer
./tmux-orchestrator/send-claude-message.sh semantest:2 "Question for Eva"

# Check git status
git status

# Run tests
npm test  # or appropriate test command
```

## 🎯 Remember

1. Hooks automatically forward your messages to PM and Scribe
2. Architect (Aria) monitors for architecture questions
3. Commit every 10 minutes
4. Report blockers immediately
5. Use the messaging script, not tmux send-keys!

---
*Keep this reference handy! Updated regularly by the Orchestrator.*