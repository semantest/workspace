# 🚨 MANDATORY REQUIREMENT PROCESS 🚨

**EFFECTIVE IMMEDIATELY - ALL AGENTS MUST COMPLY**

## Overview

NO development work shall proceed without three approved documents:
1. `requirement.md` - Owned by PM
2. `design.md` - Owned by Architect  
3. `task.md` - Owned by Developers

## Process Flow

```
1. PM creates requirement → requirement.md
2. Orchestrator reviews → Approves requirement.md
3. Architect creates design → design.md
4. PM reviews → Approves design.md
5. Developers create tasks → task.md
6. Architect reviews → Approves task.md
7. Run validate.sh → Must pass
8. Development begins
```

## File Ownership

### requirement.md (PM Responsibility)
- User stories
- Acceptance criteria
- Business value
- Technical constraints
- Questions for Orchestrator

### design.md (Architect Responsibility)
- Technical approach
- Component architecture
- Integration points
- Testing strategy
- Implementation risks

### task.md (Developer Responsibility)
- Specific implementation tasks
- File changes required
- Test cases
- Estimated effort
- Dependencies

## Validation Requirements

Before ANY work:
```bash
cd /home/chous/work/semantest/requirements/REQ-XXX/
./validate.sh
```

If validation fails, STOP and address missing approvals.

## Current Requirements

### REQ-001: Browser Health Checks
- Location: `/home/chous/work/semantest/requirements/REQ-001/`
- Status: requirement.md READY_FOR_REVIEW
- Next: Awaiting Orchestrator approval
- Work: PAUSED until approved

## Creating New Requirements

```bash
/home/chous/work/tmux-orchestrator/create-requirement.sh "Brief description"
```

This creates:
- New REQ-XXX directory
- Template files
- validate.sh script

## Enforcement

1. **Agents MUST refuse work** without approved docs
2. **validate.sh MUST pass** before coding
3. **No exceptions** to this process
4. **Report violations** to PM immediately

## Quick Reference

### For PM:
1. Create requirement.md
2. Get Orchestrator approval
3. Review and approve design.md

### For Architect:
1. Wait for approved requirement.md
2. Create design.md
3. Get PM approval
4. Review and approve task.md

### For Developers:
1. Wait for approved design.md
2. Create task.md
3. Get Architect approval
4. Run validate.sh
5. Begin implementation

## Compliance Checklist

Before starting ANY work:
- [ ] requirement.md exists and is approved
- [ ] design.md exists and is approved
- [ ] task.md exists
- [ ] validate.sh passes
- [ ] You understand your role's responsibilities

## Consequences of Non-Compliance

- Work will be rejected
- Rework will be required
- Process training mandatory
- Potential removal from project

---

**THIS IS NOT OPTIONAL. COMPLIANCE IS MANDATORY.**

Questions? Ask PM or Orchestrator immediately.