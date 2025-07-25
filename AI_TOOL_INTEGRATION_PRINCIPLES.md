# AI Tool Integration Design Principles

## Core Principle: Explicit Tool Activation Pattern

### Problem Statement
AI systems like ChatGPT don't reliably infer tool usage from context alone. Implicit expectations lead to unpredictable behavior and failed operations.

### Solution: Three-Phase Tool Activation Pattern

```typescript
interface AIToolActivation {
  // Phase 1: Explicit tool selection
  selectTool(toolId: string): Promise<ToolContext>;
  
  // Phase 2: Confirmation verification
  waitForActivation(context: ToolContext): Promise<boolean>;
  
  // Phase 3: Input provision
  provideInput(input: ToolInput): Promise<ToolResult>;
}
```

## Implementation Pattern

### 1. Tool Registry with Explicit Identifiers

```typescript
const AI_TOOLS = {
  'dall-e': {
    id: 'create-image',
    activationPrompt: 'I want to use the Create image tool',
    confirmationSignals: ['DALL·E', 'image generation', 'create an image']
  },
  'code-interpreter': {
    id: 'python-executor',
    activationPrompt: 'I want to use the Code interpreter tool',
    confirmationSignals: ['Python', 'code execution', 'interpreter']
  },
  'web-browser': {
    id: 'browse-web',
    activationPrompt: 'I want to use the Web browser tool',
    confirmationSignals: ['browser', 'searching', 'web']
  }
};
```

### 2. Activation State Machine

```typescript
enum ToolState {
  IDLE = 'idle',
  ACTIVATING = 'activating',
  ACTIVE = 'active',
  PROCESSING = 'processing',
  COMPLETE = 'complete',
  ERROR = 'error'
}

class AIToolStateMachine {
  private state: ToolState = ToolState.IDLE;
  private currentTool: string | null = null;
  
  async activateTool(toolId: string): Promise<void> {
    this.state = ToolState.ACTIVATING;
    
    // Send explicit activation request
    await this.sendMessage(AI_TOOLS[toolId].activationPrompt);
    
    // Wait for confirmation
    const confirmed = await this.waitForConfirmation(toolId);
    
    if (!confirmed) {
      throw new Error(`Failed to activate tool: ${toolId}`);
    }
    
    this.state = ToolState.ACTIVE;
    this.currentTool = toolId;
  }
  
  private async waitForConfirmation(toolId: string): Promise<boolean> {
    const signals = AI_TOOLS[toolId].confirmationSignals;
    const timeout = 5000; // 5 seconds
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkInterval = setInterval(() => {
        const response = this.getLatestResponse();
        
        if (this.containsConfirmationSignals(response, signals)) {
          clearInterval(checkInterval);
          resolve(true);
        }
        
        if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 100);
    });
  }
}
```

### 3. Addon Integration Pattern

```typescript
// For ChatGPT addon
class ChatGPTImageAddon {
  private toolMachine: AIToolStateMachine;
  
  async requestImage(prompt: string): Promise<ImageResult> {
    try {
      // Phase 1: Explicit activation
      await this.toolMachine.activateTool('dall-e');
      
      // Phase 2: Verify activation
      if (!this.toolMachine.isActive('dall-e')) {
        throw new Error('DALL-E tool not active');
      }
      
      // Phase 3: Send actual prompt
      return await this.toolMachine.sendInput(prompt);
      
    } catch (error) {
      // Fallback or retry logic
      return this.handleActivationFailure(error);
    }
  }
}
```

## Design Principles

### 1. Never Assume Tool Context
**Bad:**
```typescript
// Hoping AI understands from context
sendMessage("Create an image of a sunset");
```

**Good:**
```typescript
// Explicit tool activation
await activateTool('dall-e');
await sendMessage("Create an image of a sunset");
```

### 2. Implement Confirmation Verification
Always verify tool activation before sending the actual request:

```typescript
interface ToolConfirmation {
  checkVisualCues(): boolean;     // UI elements appear
  checkTextualCues(): boolean;     // Response mentions tool
  checkStateChange(): boolean;     // DOM/API state changes
}
```

### 3. Graceful Degradation
When tool activation fails:

```typescript
class ToolActivationStrategy {
  async activate(toolId: string, retries = 3): Promise<boolean> {
    for (let i = 0; i < retries; i++) {
      if (await this.tryActivate(toolId)) {
        return true;
      }
      
      // Exponential backoff
      await this.wait(Math.pow(2, i) * 1000);
    }
    
    // Fallback strategy
    return this.tryAlternativeTool(toolId);
  }
}
```

### 4. Tool-Specific Adapters
Each AI tool should have its own adapter:

```typescript
abstract class AIToolAdapter {
  abstract readonly toolId: string;
  abstract readonly activationMethod: string;
  abstract readonly confirmationPattern: RegExp | string[];
  
  abstract activate(): Promise<boolean>;
  abstract execute<T>(input: any): Promise<T>;
  abstract deactivate(): Promise<void>;
}
```

## Integration with Semantest Architecture

### 1. Addon Manifest Extension
```json
{
  "addon_id": "chatgpt_addon",
  "ai_tools": [
    {
      "id": "dall-e",
      "activation_required": true,
      "activation_method": "explicit_prompt",
      "confirmation_timeout": 5000
    }
  ]
}
```

### 2. Event Flow for Tool Activation
```
1. User triggers action requiring AI tool
   ↓
2. Addon checks if tool activation required
   ↓
3. Send explicit activation request
   ↓
4. Monitor for confirmation signals
   ↓
5. On confirmation, proceed with actual request
   ↓
6. On failure, retry or fallback
```

### 3. WebSocket Events
```typescript
// Tool activation events
ws.emit('ai:tool:activating', { toolId: 'dall-e', addonId: 'chatgpt' });
ws.emit('ai:tool:activated', { toolId: 'dall-e', duration: 1500 });
ws.emit('ai:tool:failed', { toolId: 'dall-e', reason: 'timeout' });
```

## Benefits of This Pattern

1. **Predictability**: Consistent behavior across all AI interactions
2. **Reliability**: Reduced failures from misinterpreted context
3. **Debuggability**: Clear state transitions and failure points
4. **Extensibility**: Easy to add new tools with same pattern
5. **User Experience**: Can show clear progress indicators

## Implementation Checklist

- [ ] Create tool registry with all known AI tools
- [ ] Implement state machine for tool activation
- [ ] Add confirmation detection logic
- [ ] Create tool-specific adapters
- [ ] Add retry and fallback strategies
- [ ] Implement progress indicators in UI
- [ ] Add telemetry for activation success rates
- [ ] Document tool-specific quirks

## Future Considerations

1. **Machine Learning**: Learn optimal activation phrases per tool
2. **Caching**: Remember successful activation patterns
3. **Multi-Tool**: Handle simultaneous tool activations
4. **Version Handling**: Adapt to AI platform changes