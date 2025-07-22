# Event Naming Refactor - Architecture Improvement

**From**: rydnr  
**Date**: 2025-07-22  
**Priority**: Medium (AFTER basic functionality works)  
**Type**: Technical Debt / Architecture Improvement

## Description

Refactor all event names to follow event sourcing best practices using past tense convention.

## Current vs Proposed

| Current | Proposed | Rationale |
|---------|----------|-----------|
| generateImage | imageGenerationRequested | Events describe what happened |
| downloadImage | imageDownloadRequested | Past tense = immutable fact |
| ImageRequestReceived | ✅ Already correct | Already follows convention |
| ImageDownloaded | ✅ Already correct | Already follows convention |

## Benefits

1. **Clarity**: Events describe what already occurred, not commands
2. **Event Sourcing**: Aligns with industry best practices
3. **Debugging**: Easier to understand event flow in logs
4. **Consistency**: All events follow same naming pattern

## Implementation Notes

- Do NOT implement until basic functionality is confirmed working
- Will require updates to:
  - Event handler registrations
  - Event dispatch calls
  - Documentation
  - Tests

## Example Code Change

```javascript
// Before
socket.emit('generateImage', { prompt, metadata });

// After  
socket.emit('imageGenerationRequested', { prompt, metadata });
```

## Acceptance Criteria

- [ ] All events use past tense naming
- [ ] No breaking changes to existing functionality
- [ ] Documentation updated
- [ ] Tests passing

---
*Smart architecture thinking from rydnr - capturing for future implementation!*