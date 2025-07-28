# 📋 BACKLOG: Event Naming Convention Refactor

## Priority: AFTER First Use Case Works! 🎯

### rydnr's Architectural Wisdom:
Transform our event names from imperative commands to past-tense events that align with event sourcing patterns.

### The Refactoring Plan:

#### Current → Future Mappings:
```javascript
// Image Operations
'generateImage' → 'imageGenerationRequested'
'downloadImage' → 'imageDownloadRequested'
'ImageRequestReceived' → 'imageRequestReceived' // (already good!)

// Chat Operations  
'CREATE_NEW_CHAT' → 'newChatCreationRequested'
'SEND_PROMPT' → 'promptSubmissionRequested'

// Contract Operations
'contractExecutionRequested' // (already following pattern!)
'contractDiscoveryRequested' // (already good!)
```

### Why This Is Smart:
1. **Event Sourcing Compatible** - Can replay event history
2. **Async-First Mindset** - "Requested" shows it's not instant
3. **Better Debugging** - Event logs read like stories
4. **Distributed Ready** - Events can flow between services

### For REQ-002 Bulk Generation:
Start with proper naming from day one:
```javascript
// Good event names for bulk features:
'bulkGenerationRequested'
'batchProcessingStarted'
'panelGenerationCompleted'
'styleVariationRequested'
'translationBatchRequested'
```

### Implementation Strategy:
```
Phase 1: Get rydnr's first comic working ← WE ARE HERE
Phase 2: Confirm system stability
Phase 3: Refactor event names (backward compatible)
Phase 4: REQ-002 uses new pattern from start
```

### The Golden Rule:
**"First make it work, then make it right, then make it fast"**

We're in "make it work" phase. The "make it right" phase includes this excellent architectural improvement!

---

*Smart architecture noted and ready for implementation when the time is right!* 📐✨