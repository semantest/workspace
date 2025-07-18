# Milestone: WebBuddy → Semantest Rebranding

**Duration**: Weeks 1-2  
**Priority**: 🚨 CRITICAL  
**Status**: 🚧 IN PROGRESS

## Objective

Complete global replacement of all "WebBuddy", "web-buddy", and "buddy" references with "Semantest" or "semantest" throughout the entire codebase.

## Tasks

### Week 1: Analysis and Preparation

- [ ] **Task 001**: Scan entire codebase for all variations of "buddy" references
  - File count: TBD
  - Locations: Code, comments, documentation, configs
  - GitHub Issue: #TBD

- [ ] **Task 002**: Create comprehensive replacement mapping
  - `WebBuddy` → `Semantest`
  - `web-buddy` → `semantest`
  - `@web-buddy/` → `@semantest/`
  - `webBuddy` → `semantest`
  - `WEB_BUDDY` → `SEMANTEST`
  - GitHub Issue: #TBD

- [ ] **Task 003**: Develop automated migration script
  - Language: TypeScript/Node.js
  - Features: Dry run, selective replacement, rollback
  - GitHub Issue: #TBD

- [ ] **Task 004**: Create backup of current state
  - Full repository backup
  - Database snapshots if applicable
  - GitHub Issue: #TBD

### Week 2: Implementation

- [ ] **Task 005**: Execute migration script on codebase
  - Run in dry-run mode first
  - Review changes
  - Execute actual replacement
  - GitHub Issue: #TBD

- [ ] **Task 006**: Update package.json files
  - Package names
  - Dependencies
  - Scripts
  - GitHub Issue: #TBD

- [ ] **Task 007**: Update configuration files
  - `.env` files
  - CI/CD configs
  - Docker configs
  - Extension manifests
  - GitHub Issue: #TBD

- [ ] **Task 008**: Update documentation
  - README files
  - API documentation
  - User guides
  - Code comments
  - GitHub Issue: #TBD

- [ ] **Task 009**: Update external references
  - GitHub repository name
  - NPM package names
  - Chrome Web Store listing
  - Domain names if applicable
  - GitHub Issue: #TBD

- [ ] **Task 010**: Run comprehensive test suite
  - Unit tests
  - Integration tests
  - E2E tests
  - Manual testing
  - GitHub Issue: #TBD

## Acceptance Criteria

- [ ] Zero occurrences of "buddy" in any form (except historical references)
- [ ] All tests passing
- [ ] Documentation updated
- [ ] No functional changes - only naming
- [ ] Migration guide created for users

## Files to Update (Partial List)

```
Key files requiring updates:
- package.json (all modules)
- tsconfig.json files
- Extension manifest.json
- All *.ts and *.js files
- All *.md documentation
- Docker and CI/CD configs
- Environment variable names
```

## Migration Script Example

```typescript
// migration-script.ts
const replacements = [
  { from: /WebBuddy/g, to: 'Semantest' },
  { from: /web-buddy/g, to: 'semantest' },
  { from: /webBuddy/g, to: 'semantest' },
  { from: /@web-buddy\//g, to: '@semantest/' },
  { from: /WEB_BUDDY/g, to: 'SEMANTEST' },
  // Add more patterns as discovered
];
```

## Rollback Plan

1. Git reset to backed-up commit
2. Restore package.json files from backup
3. Re-publish previous NPM packages if needed
4. Communicate rollback to users

## Communication Plan

1. **Internal**: Notify all team members via tmux
2. **External**: 
   - Blog post announcement
   - GitHub release notes
   - NPM deprecation notices
   - Email to registered users

## Dependencies

- Backup completed before starting
- All team members aware of timeline
- External services (NPM, Chrome Store) ready for updates

## Next Steps

After successful completion, proceed to [02-architecture](../02-architecture/README.md).

---

Last Updated: January 2025