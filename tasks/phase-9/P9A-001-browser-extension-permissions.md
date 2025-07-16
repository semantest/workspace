# Task: Remove <all_urls> Browser Extension Permission

**ID**: P9A-001  
**Phase**: 9A - Critical Security Fixes  
**Priority**: CRITICAL  
**Effort**: 80-100 hours  
**Status**: pending

## Description
Remove the overly broad `<all_urls>` permission from the Chrome extension and implement a domain-specific permission model.

## Dependencies
- None (can start immediately)

## Acceptance Criteria
- [ ] Remove `<all_urls>` from manifest.json
- [ ] Implement domain-specific permission model
- [ ] Create permission request UI for new domains
- [ ] Migrate existing users without breaking functionality
- [ ] All automated tests pass
- [ ] Security audit confirms no broad permissions

## Technical Details

### Current Issue
```json
// extension.chrome/manifest.json
"host_permissions": ["<all_urls>"]  // SECURITY RISK
```

### Target Implementation
```json
"host_permissions": [
  "https://*.google.com/*",
  "https://*.chatgpt.com/*",
  "https://*.wikipedia.org/*"
],
"optional_host_permissions": [
  "https://*/*"  // User must explicitly grant
]
```

### Implementation Steps
1. Create permission management module
2. Implement dynamic permission requests
3. Update content script injection logic
4. Create migration strategy for existing users
5. Update all domain implementations
6. Add permission status UI indicators

### Files to Modify
- `extension.chrome/manifest.json`
- `extension.chrome/src/background/permission-manager.ts` (new)
- `extension.chrome/src/background/main.ts`
- `extension.chrome/src/content/injection-manager.ts`
- All domain-specific implementations

### Testing Requirements
- Unit tests for permission manager
- Integration tests for each domain
- Migration testing with mock user data
- Security scanning for permission leaks