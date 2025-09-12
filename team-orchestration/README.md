# Semantest Team Orchestration System

## 🎯 Overview

A comprehensive team coordination system for the Semantest project, featuring Anders as the coordinator managing a team of 6 specialists working on the image generation browser automation feature.

## 👥 Team Members & Roles

| Member | Role | Focus Area | Traits |
|--------|------|------------|--------|
| **Anders** | Coordinator | Monitoring & Task Distribution | Strategic thinker, excellent coordinator, keeps team focused |
| **Rafa** | Backend Lead | Server & WebSocket Implementation | Deep technical expertise, problem solver, Node.js specialist |
| **Wences** | Extension Lead | Chrome Extension & Browser Automation | Browser automation expert, Chrome extension guru, detail-oriented |
| **Alex** | Testing Lead | TDD & Contract Tests | Quality advocate, TDD champion, thorough tester |
| **Ana** | Frontend Lead | CLI & User Interface | User experience focused, CLI design, clear communication |
| **Alfredo** | Integration Lead | System Integration & E2E | Systems integrator, big picture thinker, connector |
| **Irene** | DevOps Lead | Infrastructure & Deployment | Automation specialist, efficiency optimizer, DevOps mindset |

## 🚀 Quick Start

### 1. Create Team Session
```bash
./team-orchestration/scripts/tmux-orchestrator.sh create
```
This creates a tmux session with dedicated windows for each team member and starts monitoring services.

### 2. Attach to Session
```bash
./team-orchestration/scripts/tmux-orchestrator.sh attach
```

### 3. Start Anders Monitoring
```bash
# In Anders' window or separately
./team-orchestration/scripts/anders-monitor.sh
```

## 📁 Directory Structure

```
team-orchestration/
├── scripts/
│   ├── tmux-orchestrator.sh      # Main orchestration script
│   ├── anders-monitor.sh         # Anders' monitoring dashboard
│   ├── task-reminder.sh          # Automated task reminders
│   ├── team-status-update.sh     # Team member status updates
│   └── progress-notifier.sh      # Progress notifications
├── status/                        # Team member status files
├── logs/                         # System logs and alerts
└── README.md                     # This file
```

## 🛠️ Scripts

### tmux-orchestrator.sh
Main orchestration script that sets up the team environment.

**Commands:**
- `create` - Create new team session
- `attach` - Attach to existing session
- `start` - Start monitoring services
- `stop` - Stop monitoring services
- `send <target> <message>` - Send messages
- `status` - Show team status

### anders-monitor.sh
Anders' monitoring dashboard that tracks team progress and sends reminders.

**Features:**
- Real-time team status overview
- Automatic stale task detection
- Blocker notifications
- Progress tracking
- Team statistics

### task-reminder.sh
Automated reminder system with escalating notifications.

**Reminder Levels:**
1. Gentle (30 min) - Friendly check-in
2. Normal (60 min) - Standard reminder
3. Urgent (90 min) - Urgent attention needed
4. Critical (120 min) - Escalates to Anders

### team-status-update.sh
Allows team members to update their status.

**Quick Commands:**
```bash
# Start new task
./team-status-update.sh start Rafa "Implement WebSocket connection"

# Update progress
./team-status-update.sh progress Rafa 50

# Report blocker
./team-status-update.sh blocked Wences "Port 8080 in use"

# Complete task
./team-status-update.sh complete Ana

# Request help
./team-status-update.sh help Alex
```

### progress-notifier.sh
Sends notifications for milestones and achievements.

**Notification Types:**
- 🎯 Milestones (10%, 25%, 50%, 75%, 90%, 100%)
- 🏆 Achievements (task completions)
- 🚨 Blockers (immediate attention)
- 🆘 Help requests
- ℹ️ Information updates

## 📊 Monitoring Features

### Dashboard View
- Real-time team status
- Progress percentages
- Current tasks
- Blocker alerts
- Active/Idle/Blocked counts

### Automatic Reminders
- 30-minute progress checks
- Stale task detection
- Blocker escalation
- Deadline warnings

### Notifications
- Milestone celebrations
- Achievement recognition
- Blocker alerts
- Help request broadcasts
- Daily summaries (10 AM, 4 PM)

## 🎮 TMUX Navigation

| Key Binding | Action |
|-------------|--------|
| `Ctrl+b, n` | Next window |
| `Ctrl+b, p` | Previous window |
| `Ctrl+b, 0-8` | Switch to window by number |
| `Ctrl+b, d` | Detach from session |
| `Ctrl+b, ?` | Show all keybindings |

## 💬 Communication

### Broadcasting to Team
```bash
# From command line
./tmux-orchestrator.sh send @team "Stand-up in 5 minutes"

# From Anders' window
@team Stand-up in 5 minutes
```

### Direct Messages
```bash
# From command line
./tmux-orchestrator.sh send @rafa "Please check WebSocket"

# From any window
@rafa Please check WebSocket
```

## 📈 Task Flow

1. **Anders** distributes tasks from `specs/001-the-first-proof/tasks.md`
2. **Team members** update status when starting tasks
3. **System** monitors progress and sends reminders
4. **Members** report blockers or request help
5. **Anders** coordinates solutions and unblocks team
6. **System** celebrates milestones and completions

## 🔧 Configuration

### Environment Variables
```bash
CHECK_INTERVAL=60        # Monitor check interval (seconds)
REMINDER_INTERVAL=1800   # Team check-in interval (seconds)
```

### Status Files
Each team member has a status file in JSON format:
```json
{
  "name": "Rafa",
  "current_task": "Implement WebSocket connection",
  "status": "working",
  "progress": 50,
  "blocked": false,
  "needs_help": false,
  "last_update": "2025-09-09T15:30:00Z"
}
```

## 🚨 Troubleshooting

### Session Already Exists
```bash
tmux kill-session -t semantest-team
./tmux-orchestrator.sh create
```

### Services Not Starting
```bash
./tmux-orchestrator.sh stop
./tmux-orchestrator.sh start
```

### Check Logs
```bash
tail -f team-orchestration/logs/anders-monitor.log
tail -f team-orchestration/logs/task-reminder.log
tail -f team-orchestration/logs/status-updates.log
```

## 🎯 Project Goals

The team is working on implementing the image generation feature with these key components:

1. **CLI** - Command-line interface for requests
2. **Server** - Node.js with WebSocket support
3. **Extension** - Chrome browser extension
4. **Integration** - End-to-end flow testing

## 📝 Notes

- All scripts are designed to work together
- Status updates are synchronized across all systems
- Reminders escalate automatically based on time
- Anders receives critical alerts immediately
- The system celebrates team achievements

## 🤝 Contributing

To modify team behavior or add features:
1. Edit scripts in `team-orchestration/scripts/`
2. Test in isolated tmux session first
3. Update this README with changes
4. Notify team of updates via broadcast

---

**Current Feature**: Image Generation via Browser Automation  
**Branch**: `001-the-first-proof`  
**Coordinator**: Anders  
**Team Size**: 6 members