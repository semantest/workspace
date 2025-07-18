# Milestone: Domain-Specific Module Architecture

**Duration**: Weeks 3-4  
**Priority**: 🚨 CRITICAL  
**Status**: ⏳ PENDING

## Objective

Restructure the codebase to implement proper domain-driven design with clear module boundaries. Move all domain-specific code out of generic modules.

## Module Structure

```
semantest/
├── core/                        # Shared utilities and base classes
│   ├── events/                 # Base event classes only
│   ├── types/                  # Generic types
│   └── utils/                  # Shared utilities
├── typescript.client/           # Generic client - NO domain events
│   └── src/
│       ├── event-driven-client.ts
│       └── types.ts
├── google.com/                  # Generic Google functionality
│   ├── domain/
│   ├── application/
│   └── infrastructure/
├── images.google.com/           # Google Images specific
│   ├── domain/
│   │   ├── events/            # GoogleImageDownloadRequested, etc.
│   │   ├── entities/
│   │   └── value-objects/
│   ├── application/
│   └── infrastructure/
├── pinterest.com/               # Pinterest functionality
├── instagram.com/               # Instagram functionality
└── extension.chrome/            # Browser extension
```

## Tasks

### Week 3: Architecture Design & Preparation

- [ ] **Task 011**: Audit current code structure
  - Identify all domain-specific code in generic modules
  - Map current dependencies
  - Document migration plan
  - GitHub Issue: #TBD

- [ ] **Task 012**: Design new module structure
  - Define module boundaries
  - Create interface contracts
  - Design event hierarchy
  - GitHub Issue: #TBD

- [ ] **Task 013**: Create `images.google.com` module
  - Set up directory structure
  - Configure TypeScript
  - Set up build process
  - GitHub Issue: #TBD

- [ ] **Task 014**: Create module templates
  - Standard directory structure
  - Base classes and interfaces
  - Configuration templates
  - GitHub Issue: #TBD

### Week 4: Implementation

- [ ] **Task 015**: Move Google Images events
  - Move `GoogleImageDownloadRequested` from typescript.client
  - Move `GoogleImageDownloadCompleted` 
  - Move `GoogleImageDownloadFailed`
  - Update all imports
  - GitHub Issue: #TBD

- [ ] **Task 016**: Move Google Images entities
  - Move download-specific entities
  - Move image-specific value objects
  - Update domain logic
  - GitHub Issue: #TBD

- [ ] **Task 017**: Move Google Images infrastructure
  - Move browser automation code
  - Move download adapters
  - Move storage adapters
  - GitHub Issue: #TBD

- [ ] **Task 018**: Update typescript.client
  - Remove all domain-specific code
  - Keep only generic event infrastructure
  - Update exports
  - GitHub Issue: #TBD

- [ ] **Task 019**: Update imports across codebase
  - Update all import statements
  - Fix circular dependencies
  - Update build configurations
  - GitHub Issue: #TBD

- [ ] **Task 020**: Create integration tests
  - Test cross-module communication
  - Test event flow
  - Test build process
  - GitHub Issue: #TBD

## Domain Event Migration

### Current Location (WRONG):
```typescript
// typescript.client/src/types.ts
export class GoogleImageDownloadRequested extends BaseEvent {
  // This should NOT be here
}
```

### New Location (CORRECT):
```typescript
// images.google.com/domain/events/download-requested.event.ts
export class GoogleImageDownloadRequested extends BaseEvent {
  // Domain-specific event in domain module
}
```

## Acceptance Criteria

- [ ] Zero domain-specific code in typescript.client
- [ ] All Google Images code in images.google.com module
- [ ] Clear module boundaries established
- [ ] All imports updated and working
- [ ] Build process updated for new structure
- [ ] All tests passing
- [ ] Documentation updated

## Architecture Principles

1. **Domain Isolation**: Each website/service gets its own module
2. **Event Locality**: Events live with their domain
3. **Clean Dependencies**: No circular dependencies
4. **Interface Segregation**: Minimal, focused interfaces
5. **Build Independence**: Each module can build independently

## Migration Checklist

For each file being moved:
- [ ] Create new location
- [ ] Copy file with git history
- [ ] Update imports in file
- [ ] Update imports TO file
- [ ] Update barrel exports
- [ ] Update build config
- [ ] Test in isolation
- [ ] Remove old file

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Circular dependencies | High | Dependency analysis tools |
| Breaking imports | High | Automated import updates |
| Build failures | Medium | Incremental migration |
| Lost functionality | High | Comprehensive testing |

## Dependencies

- Rebranding milestone completed
- All team members understand DDD
- Build tools configured for monorepo

## Next Steps

After successful completion, proceed to [03-technical-debt](../03-technical-debt/README.md).

---

Last Updated: January 2025