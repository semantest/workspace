# Extension Developer Brief - REQ-001

Welcome Extension Developer! You have been assigned to implement the extension layer of our health check system.

## Your Tasks:

### Task 6: Create extension health module (Priority: HIGH)
- **Component**: Extension popup.js
- **Estimated Hours**: 2
- **Current Status**: Backend health checks complete, server APIs ready
- **Your Work**:
  - [ ] Check for ChatGPT tabs using Chrome tabs API
  - [ ] Report tab status (open/closed, active/inactive)
  - [ ] Visual health indicator in popup
  - [ ] Documentation updated

### Task 7: Implement addon health check (Priority: HIGH)
- **Component**: chatgpt.com addon
- **Estimated Hours**: 2
- **Your Work**:
  - [ ] Detect login status on ChatGPT
  - [ ] Monitor session validity
  - [ ] Report status to extension
  - [ ] Handle edge cases (logged out, session expired)

## Context:
- We're implementing a layered health check system
- Server Layer (COMPLETE): Checks browser executable
- Extension Layer (YOUR WORK): Checks ChatGPT tabs
- Addon Layer (YOUR WORK): Checks login status
- Each layer only knows about itself - separation of concerns!

## Architecture:
```
Browser Health (Backend - DONE)
    ↓
Extension Health (Task 6)
    ↓
Addon Health (Task 7)
```

## Files to Work With:
1. `/home/chous/work/semantest/extension.chrome/popup.js` - Extension logic
2. `/home/chous/work/semantest/chatgpt.com/addon.js` - Addon for ChatGPT site
3. `/home/chous/work/semantest/extension.chrome/manifest.json` - Extension config

## Integration Points:
- Extension polls server `/health` endpoint
- Extension checks for ChatGPT tabs
- Addon communicates with extension via message passing
- Frontend will create UI to display all statuses

## Definition of Done:
- Extension can detect ChatGPT tab presence/absence
- Addon can detect login status on ChatGPT
- Both components report their health status
- Proper error handling and edge cases covered
- Documentation complete

Please coordinate with the Frontend developer who will create the UI for displaying these health statuses.

**IMPORTANT**: Check `/home/chous/work/semantest/requirements/REQ-001/validate.sh` first to ensure all prerequisites are met!