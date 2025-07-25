# REQ-003: Design - Production-Scale Architecture Enhancements

**ID**: REQ-003-DESIGN  
**Date**: 2025-07-22  
**Status**: DRAFT  
**Author**: System Architect  

## 1. System Architecture Overview

### 1.1 Current Architecture
```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│ Service Worker  │────▶│   ChatGPT    │────▶│  Downloads  │
│  (Single Thread)│     │    (Tab)     │     │   Folder    │
└─────────────────┘     └──────────────┘     └─────────────┘
         │                                            │
         └──────────── Checkpoint Recovery ───────────┘
```

### 1.2 Enhanced Architecture
```
┌─────────────────────────────────────────────────────────┐
│                 Orchestration Layer                      │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │  Lifecycle  │  │   Memory     │  │    State      │ │
│  │  Manager    │  │   Manager    │  │  Persistence  │ │
│  └─────────────┘  └──────────────┘  └───────────────┘ │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────┐
│                 Distribution Layer                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │
│  │Worker 1 │  │Worker 2 │  │Worker 3 │  │Worker N │   │
│  │ (Tab)   │  │ (Tab)   │  │ (Tab)   │  │ (Tab)   │   │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘   │
└──────────────────────────────────────────────────────────┘
```

## 2. Component Design

### 2.1 Service Worker Lifecycle Manager

```typescript
interface LifecycleManager {
  startOperation(): void;
  endOperation(): void;
  keepAlive(): void;
  onTerminationRisk(): void;
}

class ProductionLifecycleManager implements LifecycleManager {
  private keepAliveStrategies = [
    () => chrome.runtime.sendMessage({ keepAlive: true }),
    () => chrome.storage.local.set({ heartbeat: Date.now() }),
    () => chrome.runtime.getPlatformInfo(() => {}),
    () => chrome.alarms.create('keepalive', { delayInMinutes: 0.3 })
  ];
  
  private executeKeepAlive() {
    // Execute all strategies to ensure survival
    this.keepAliveStrategies.forEach(strategy => {
      try {
        strategy();
      } catch (error) {
        console.error('Keep-alive strategy failed:', error);
      }
    });
  }
}
```

### 2.2 Memory-Aware Processing Pipeline

```typescript
interface MemoryManager {
  canProcessTask(): Promise<boolean>;
  getMemoryPressure(): Promise<number>;
  freeMemory(): Promise<void>;
}

class ChromeMemoryManager implements MemoryManager {
  private readonly MEMORY_THRESHOLD = 0.8; // 80%
  private readonly CRITICAL_THRESHOLD = 0.9; // 90%
  
  async canProcessTask(): Promise<boolean> {
    const pressure = await this.getMemoryPressure();
    
    if (pressure > this.CRITICAL_THRESHOLD) {
      await this.freeMemory();
      return false;
    }
    
    return pressure < this.MEMORY_THRESHOLD;
  }
  
  async freeMemory(): Promise<void> {
    // Clear caches
    await chrome.browsingData.removeCache({ since: 0 });
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    // Clear non-essential storage
    await this.clearOldCheckpoints();
  }
}
```

### 2.3 Distributed Tab Orchestrator

```typescript
interface TabOrchestrator {
  initialize(workerCount: number): Promise<void>;
  distributeTask(task: ImageTask): Promise<void>;
  getHealthMetrics(): WorkerHealthMetrics;
}

class ProductionTabOrchestrator implements TabOrchestrator {
  private workers: Map<number, WorkerState> = new Map();
  private readonly MAX_RETRIES_PER_WORKER = 3;
  
  async initialize(workerCount: number): Promise<void> {
    // Create worker tabs with staggered initialization
    for (let i = 0; i < workerCount; i++) {
      await this.createWorker(i);
      // Stagger to avoid rate limits
      await this.delay(2000);
    }
  }
  
  private async createWorker(index: number): Promise<void> {
    const tab = await chrome.tabs.create({
      url: 'https://chatgpt.com',
      active: false,
      pinned: true // Prevent accidental closure
    });
    
    this.workers.set(tab.id!, {
      id: tab.id!,
      index,
      status: 'initializing',
      health: 100,
      tasksCompleted: 0,
      lastError: null,
      currentTask: null
    });
  }
  
  async distributeTask(task: ImageTask): Promise<void> {
    const worker = this.selectOptimalWorker();
    
    if (!worker) {
      // All workers busy or unhealthy
      await this.queueTask(task);
      return;
    }
    
    await this.assignTaskToWorker(worker.id, task);
  }
}
```

### 2.4 Persistent State Management

```typescript
interface StateManager {
  saveCheckpoint(state: OperationState): Promise<void>;
  loadCheckpoint(): Promise<OperationState | null>;
  saveProgress(progress: ProgressUpdate): Promise<void>;
}

class RedundantStateManager implements StateManager {
  private readonly SYNC_INTERVAL = 5000; // 5 seconds
  
  async saveCheckpoint(state: OperationState): Promise<void> {
    // Primary: Chrome Storage (fast, limited size)
    await chrome.storage.local.set({
      checkpoint: {
        ...state,
        timestamp: Date.now(),
        version: '1.0.2'
      }
    });
    
    // Secondary: IndexedDB (slower, unlimited size)
    await this.indexedDB.put('checkpoints', {
      id: state.operationId,
      data: state,
      timestamp: Date.now()
    });
    
    // Tertiary: Session Storage (survives crashes)
    sessionStorage.setItem(
      `checkpoint_${state.operationId}`,
      JSON.stringify(state)
    );
  }
  
  async loadCheckpoint(): Promise<OperationState | null> {
    // Try each storage method in order of speed
    const sources = [
      () => this.loadFromChromeStorage(),
      () => this.loadFromIndexedDB(),
      () => this.loadFromSessionStorage()
    ];
    
    for (const source of sources) {
      try {
        const state = await source();
        if (state) return state;
      } catch (error) {
        console.error('Failed to load from source:', error);
      }
    }
    
    return null;
  }
}
```

## 3. Integration Points

### 3.1 WebSocket Enhancement
```typescript
// Extend existing WebSocket handler for distributed operations
class EnhancedWebSocketHandler extends WebSocketHandler {
  async handleBulkRequest(request: BulkImageRequest): Promise<void> {
    // Initialize orchestrator
    const orchestrator = new ProductionTabOrchestrator();
    await orchestrator.initialize(request.parallelism || 5);
    
    // Start lifecycle management
    const lifecycle = new ProductionLifecycleManager();
    lifecycle.startOperation();
    
    // Process with distribution
    const processor = new DistributedImageProcessor(
      orchestrator,
      lifecycle,
      new ChromeMemoryManager(),
      new RedundantStateManager()
    );
    
    await processor.processBatch(request);
  }
}
```

### 3.2 Progress Monitoring UI
```typescript
interface ProgressMonitor {
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
  estimatedTimeRemaining: number;
  workersStatus: WorkerStatus[];
  memoryUsage: number;
}

// Real-time updates via chrome.runtime messaging
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PROGRESS_UPDATE') {
    updateProgressUI(request.progress);
  }
});
```

## 4. Error Handling & Recovery

### 4.1 Failure Scenarios
1. **Service Worker Termination**: Automatic recovery from checkpoint
2. **Memory Exhaustion**: Graceful degradation to fewer workers
3. **Tab Crash**: Redistribute tasks to healthy workers
4. **Network Failure**: Exponential backoff with jitter
5. **Rate Limit**: Adaptive throttling across all workers

### 4.2 Recovery Strategy
```typescript
class RecoveryManager {
  async recoverFromFailure(error: Error): Promise<void> {
    const state = await this.stateManager.loadCheckpoint();
    
    if (!state) {
      throw new Error('No checkpoint available for recovery');
    }
    
    // Analyze failure type
    const strategy = this.selectRecoveryStrategy(error);
    
    // Execute recovery
    await strategy.execute(state);
  }
}
```

## 5. Performance Optimizations

### 5.1 Batching Strategy
- Process images in chunks of 50
- Clear memory between chunks
- Rotate workers to prevent fatigue

### 5.2 Rate Limit Management
- Distributed rate limiting across workers
- Adaptive delays based on response times
- Priority queue for retry attempts

### 5.3 Resource Optimization
- Lazy loading of image data
- Compression of checkpoint data
- Pruning of completed task history

## 6. Testing Strategy

### 6.1 Unit Tests
- Lifecycle manager keep-alive strategies
- Memory pressure detection
- State persistence and recovery
- Worker health monitoring

### 6.2 Integration Tests
- Multi-tab orchestration
- Checkpoint/recovery flow
- Progress tracking accuracy
- Error recovery scenarios

### 6.3 Load Tests
- 100 image batch (baseline)
- 1000 image batch (stress)
- 3000 image batch (production)
- Memory pressure simulation
- Service worker termination recovery

## 7. Migration Plan

### Phase 1: Foundation (Week 1)
- Implement lifecycle manager
- Add memory monitoring
- Basic state persistence

### Phase 2: Distribution (Week 2)
- Multi-tab orchestrator
- Task distribution logic
- Worker health monitoring

### Phase 3: Integration (Week 3)
- WebSocket integration
- Progress monitoring UI
- Error recovery system

### Phase 4: Testing & Optimization (Week 4)
- Load testing
- Performance tuning
- Production readiness

## 8. Success Metrics

- **Reliability**: 99.9% success rate for 3000 image batches
- **Performance**: 15+ images per minute with 5 workers
- **Memory**: Peak usage < 70% of available
- **Recovery**: < 30 seconds from any failure
- **Uptime**: 24+ hour continuous operation capability