# Semantest Team - Quick Reference

## Team at a Glance

### Engineering Team
```
🏗️ Rafa (Architect)      → System design & scalability
🎨 Wences (Frontend)      → Microfrontends, ATDD & PWA  
⚙️ Fran (Backend)         → TDD & event-driven architecture
⚡ Alfredo (Performance)   → Deep metrics & optimization
🔍 Siro (Analyzer)        → Debugging & investigation
🛡️ Devesa (Security)      → Threat modeling & compliance
📚 Blanca (Mentor)        → Documentation & teaching
🔧 Víctor (Refactorer)    → Code quality & cleanup
🚀 Álex (DevOps)          → DX & cloud infrastructure
✅ M.A. (QA)              → Testing & quality gates
```

### Business & Management
```
💡 Marielle (Business)    → Innovation & market opportunities
📊 Anders (Manager)       → TOC & bottleneck removal
💰 Chema (Cost)           → Economic & environmental analysis
❤️ Ana (HR)               → Team wellbeing & psychology
```

## Quick Spawn Commands

```bash
# Individual team member
/spawn --persona-architect    # Spawns Rafa
/spawn --persona-frontend     # Spawns Wences
/spawn --persona-backend      # Spawns Alfredo
/spawn --persona-business     # Spawns Marielle
/spawn --persona-manager      # Spawns Anders
/spawn --persona-cost         # Spawns Chema

# Common team combinations
/spawn --swarm --personas architect,backend,qa         # Rafa, Alfredo, M.A.
/spawn --swarm --personas business,cost,architect      # Marielle, Chema, Rafa
/spawn --swarm --personas manager,analyzer,performance # Anders, Siro, Álex
/spawn --swarm --personas refactorer,performance,qa    # Víctor, Álex, M.A.

# Full team (all 12 members)
/spawn --swarm --personas architect,frontend,backend,analyzer,security,mentor,refactorer,performance,qa,business,manager,cost
```

## Who to Call For What

| Need | Call | Command |
|------|------|---------|
| System design | Rafa | `--persona-architect` |
| UI/UX issues | Wences | `--persona-frontend` |
| User experience | Irene | `--persona-ux` |
| API/Backend design | Fran | `--persona-backend` |
| Performance issues | Alfredo | `--persona-performance` |
| Bug investigation | Siro | `--persona-analyzer` |
| Security review | Devesa | `--persona-security` |
| Documentation | Blanca | `--persona-mentor` |
| Code cleanup | Víctor | `--persona-refactorer` |
| DevOps/CI/CD | Álex | `--persona-devops` |
| Testing strategy | M.A. | `--persona-qa` |
| Business value | Marielle | `--persona-business` |
| Team bottlenecks | Anders | `--persona-manager` |
| Cost analysis | Chema | `--persona-cost` |
| Team wellbeing | Ana | `--persona-hr` |

## Team Workflows

### Feature Development
```
Rafa (design) → Wences + Alfredo (implement) → M.A. (test) → Devesa (security check)
```

### Bug Investigation
```
Siro (analyze) → Víctor (fix) → M.A. (verify)
```

### Performance Optimization
```
Álex (profile) → Alfredo (optimize) → M.A. (benchmark)
```

### Code Review
```
Víctor (quality) + Devesa (security) + M.A. (testing)
```

## File Locations
- **Team Roster**: `/semantest-workspace/TEAM_ROSTER.md`
- **Team Config**: `/semantest-workspace/.claude/TEAM_PERSONAS.yml`
- **This Quick Ref**: `/semantest-workspace/TEAM_QUICKREF.md`