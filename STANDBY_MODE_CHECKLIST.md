# ✅ Standby Mode Monitoring Checklist

**Current Time**: Wed Jul 30 01:18:00 AM CEST 2025  
**Next Check**: 01:33 AM CEST  
**Status**: MONITORING ACTIVE  

## 🔍 GitHub Issues Monitoring Commands

Team members should run these commands to check for updates:

### 1️⃣ Check Orchestrator Messages
```bash
gh issue list --repo semantest/semantest --state open --label orchestrator-message
```
**Look for**: Direct messages from rydnr

### 2️⃣ Check Blockers
```bash
gh issue list --repo semantest/semantest --state open --label "[BLOCKER]"
```
**Look for**: Critical issues needing immediate attention

### 3️⃣ Check Team Updates  
```bash
gh issue list --repo semantest/semantest --state open --label team-update
```
**Look for**: Progress reports from team members

### 4️⃣ Check Urgent Items
```bash
gh issue list --repo semantest/semantest --state open --label urgent
```
**Look for**: Time-sensitive requests

## 📊 Current Priorities to Monitor

| Priority | Issue | Assignee | What to Check |
|----------|-------|----------|---------------|
| 🔴 CRITICAL | #1 - Fix Workflows | Dana | Emergency PR status |
| 🟢 ACTIVE | #19 - Mob Session | Team | Rotation updates |
| 🟡 PENDING | #20 - API Contract | Alex/Eva | Start notification |
| 🟡 NEXT | #5 - Test Coverage | Quinn | Baseline results |

## 🎯 Response Protocol

**If you find an `orchestrator-message`:**
1. Read the full issue immediately
2. Follow any specific instructions
3. Update issue with acknowledgment
4. Tag team members if needed

**If you find a `[BLOCKER]`:**
1. Assess if you can help
2. Comment with ETA or assistance offer
3. Tag relevant team members
4. Escalate if critical

## 📝 Team Action Items

- **Dana**: Update Issue #1 when PR is ready/merged
- **Eva**: Note mob rotation in Issue #19
- **Quinn**: Ready to take over mob driving
- **Alex**: Prepare for API contract discussion
- **Sam**: Can start documentation work
- **Aria**: Monitor security implications

## ⏰ Check Schedule

- ✅ 01:18 AM - Current check
- ⏳ 01:33 AM - Next scheduled check
- ⏳ 01:48 AM - Following check
- ⏳ 02:03 AM - Continue every 15 min...

---

**Remember**: The orchestrator is watching GitHub issues. Update your assigned issues with progress!