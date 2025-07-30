# Dynamic Addon Loading - Phase 1 Implementation Plan

## Current Architecture
- Addons are bundled with the extension
- AddonManager loads from local `src/addons/{addon_id}/` directory
- Injection happens via chrome.scripting.executeScript
- Domain matching determines which addon to load

## Phase 1 Goals
1. Remove ChatGPT addon from extension bundle
2. Load addon from REST server (no domain validation)
3. Maintain backward compatibility

## Implementation Steps

### Step 1: Create REST Server Endpoint
- Endpoint: `http://localhost:3004/api/addons/{addon_id}`
- Returns addon manifest and scripts

### Step 2: Modify AddonManager
- Add remote addon loading capability
- Cache loaded addons in memory
- Fallback to local addons if server unavailable

### Step 3: Create Addon Packager
- Bundle addon scripts into single file
- Include manifest metadata
- Generate self-contained addon package

### Step 4: Update Extension
- Remove ChatGPT addon from bundle
- Update manifest.json to exclude addon resources
- Keep core infrastructure (bridge, message bus)

### Step 5: Testing
- Verify dynamic loading works
- Ensure no breaking changes
- Test offline fallback

## Technical Approach
1. Modify `loadManifests()` to fetch from REST server
2. Create `loadRemoteAddon()` method
3. Update `injectAddon()` to handle remote scripts
4. Implement caching strategy

## Benefits
- Smaller extension bundle
- Dynamic addon updates
- No need to republish extension for addon changes
- Foundation for addon marketplace

---

Ready to implement Phase 1!