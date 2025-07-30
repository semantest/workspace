# 📋 Team Instructions During Orchestrator Standby

**Effective**: Wed Jul 30 01:17:00 AM CEST 2025  
**Mode**: STANDBY - Orchestrator monitoring via GitHub Issues

## ✅ Quick Reference

### Check for Messages:
```bash
# See orchestrator messages
gh issue list --repo semantest/semantest --state open --label orchestrator-message

# See all blockers
gh issue list --repo semantest/semantest --state open --label "[BLOCKER]"

# See team updates
gh issue list --repo semantest/semantest --state open --label team-update
```

### Report to Orchestrator:
```bash
# Create issue for orchestrator
gh issue create --repo semantest/semantest \
  --title "[Team Update] Your update here" \
  --label "needs-orchestrator,team-update" \
  --body "Your message here"
```

## 👥 Current Assignments

### Dana 🔧
- **CRITICAL**: Fix GitHub workflows (Issue #1)
- **Action**: Complete emergency PR ASAP
- **Report**: Update Issue #1 when merged

### Eva 🎨 + Team
- **ACTIVE**: Mob programming driver
- **Next Rotation**: Eva → Quinn
- **Report**: Update Issue #19 after session

### Alex 🔌
- **PENDING**: API contract with Eva
- **Action**: Start Issue #20 after mob session
- **Report**: Create draft in issue comments

### Quinn 🧪
- **NEXT**: Take over mob driving from Eva
- **THEN**: Baseline test coverage (Issue #5)
- **Report**: Add coverage % to Issue #5

### Sam 📚
- **TODO**: Begin user journey docs (Issue #14)
- **Action**: Start documentation outline
- **Report**: Update Issue #14 progress

### Aria 🏗️
- **STANDBY**: Awaiting security review scheduling
- **Action**: Review Dana's workflow fixes
- **Report**: Comment on security implications

## 📌 Important Reminders

1. **Continue Working**: Standby doesn't mean stop!
2. **Update Issues**: Keep your assigned issues current
3. **GPG Commits**: Always use `git commit -S`
4. **Check Every Hour**: Look for orchestrator messages
5. **Tag Blockers**: Use `[BLOCKER]` for critical issues

## 🚨 If You're Blocked

1. Create issue with `[BLOCKER]` in title
2. Add labels: `critical`, `orchestrator-message`
3. Tag @rydnr in the body
4. Wait up to 15 minutes for response

---

*Work continues! The orchestrator is watching from the cloud.* 👁️☁️