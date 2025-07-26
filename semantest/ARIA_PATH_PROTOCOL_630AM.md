# Aria Path Protocol - 6:30 AM

## Working Directory Protocol

### Current Location
- Base: `/home/chous/work`
- Use relative paths from here

### ✅ Correct Usage
```bash
# Access projects
./semantest/
./tmux-orchestrator/

# Communication
./tmux-orchestrator/send-claude-message.sh target "message"

# File operations
cd ./semantest/
git add ./path/to/file
```

### ❌ Avoid
```bash
# Don't use absolute paths
/home/chous/work/semantest/
/home/chous/work/tmux-orchestrator/
```

### Protocol Status
- Understanding: ✅ Complete
- Compliance: ✅ Will use relative paths
- Location awareness: ✅ Active

As System Architect, I'll use relative paths for all operations!