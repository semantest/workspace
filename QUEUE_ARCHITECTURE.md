# Image Download Queue Architecture

## Overview
A robust, scalable queue management system for handling image downloads with retry logic, priority handling, and failover capabilities.

## Queue Design Pattern: Priority Queue with Rate Limiting

### Core Components

```typescript
interface QueueItem {
  id: string;
  priority: 'high' | 'normal' | 'low';
  payload: ImageDownloadRequest;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  lastAttemptAt?: number;
  error?: Error;
}

class DownloadQueueManager {
  private queues: {
    high: QueueItem[];
    normal: QueueItem[];
    low: QueueItem[];
  };
  
  private processing: Map<string, QueueItem> = new Map();
  private readonly MAX_CONCURRENT = 5;
  private readonly RATE_LIMIT = 10; // requests per second
  
  async enqueue(request: ImageDownloadRequest, priority = 'normal') {
    const item: QueueItem = {
      id: generateId(),
      priority,
      payload: request,
      attempts: 0,
      maxAttempts: 3,
      status: 'pending',
      createdAt: Date.now()
    };
    
    this.queues[priority].push(item);
    this.emit('queue:item:added', item);
    
    // Trigger processing
    this.processNext();
    
    return item.id;
  }
}
```

### Processing Strategy

```typescript
class QueueProcessor {
  private rateLimiter: RateLimiter;
  private downloadService: DownloadService;
  
  async processNext() {
    if (this.processing.size >= this.MAX_CONCURRENT) {
      return;
    }
    
    const item = this.getNextItem();
    if (!item || !this.rateLimiter.canProceed()) {
      return;
    }
    
    this.processing.set(item.id, item);
    item.status = 'processing';
    
    try {
      await this.downloadService.download(item.payload);
      item.status = 'completed';
      this.emit('download:completed', item);
    } catch (error) {
      await this.handleError(item, error);
    } finally {
      this.processing.delete(item.id);
      // Process next item
      setTimeout(() => this.processNext(), 100);
    }
  }
  
  private getNextItem(): QueueItem | null {
    // Priority order: high > normal > low
    for (const priority of ['high', 'normal', 'low']) {
      const queue = this.queues[priority];
      if (queue.length > 0) {
        return queue.shift();
      }
    }
    return null;
  }
}
```

### Retry Logic with Exponential Backoff

```typescript
class RetryManager {
  private readonly baseDelay = 1000; // 1 second
  
  async handleError(item: QueueItem, error: Error) {
    item.attempts++;
    item.lastAttemptAt = Date.now();
    item.error = error;
    
    if (item.attempts >= item.maxAttempts) {
      item.status = 'failed';
      this.emit('download:failed', item);
      await this.moveToDeadLetter(item);
      return;
    }
    
    // Calculate backoff delay
    const delay = this.calculateBackoff(item.attempts);
    
    // Re-queue with delay
    setTimeout(() => {
      item.status = 'pending';
      this.queues[item.priority].push(item);
      this.processNext();
    }, delay);
    
    this.emit('download:retry', { item, delay });
  }
  
  private calculateBackoff(attempt: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000; // 0-1s jitter
    return Math.min(exponentialDelay + jitter, 30000); // Max 30s
  }
}
```

### Dead Letter Queue

```typescript
class DeadLetterQueue {
  private items: QueueItem[] = [];
  private readonly MAX_SIZE = 1000;
  
  async add(item: QueueItem) {
    this.items.push({
      ...item,
      movedToDLQAt: Date.now()
    });
    
    // Persist to storage
    await this.persist();
    
    // Cleanup old items
    if (this.items.length > this.MAX_SIZE) {
      this.items = this.items.slice(-this.MAX_SIZE);
    }
  }
  
  async reprocess(itemId: string) {
    const index = this.items.findIndex(item => item.id === itemId);
    if (index !== -1) {
      const item = this.items.splice(index, 1)[0];
      item.attempts = 0; // Reset attempts
      await this.queueManager.enqueue(item.payload, item.priority);
    }
  }
}
```

## Rate Limiting Strategy

```typescript
class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number = Date.now();
  
  constructor(
    private readonly capacity: number = 10,
    private readonly refillRate: number = 10 // tokens per second
  ) {
    this.tokens = capacity;
  }
  
  canProceed(): boolean {
    this.refill();
    
    if (this.tokens >= 1) {
      this.tokens--;
      return true;
    }
    
    return false;
  }
  
  private refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = elapsed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}
```

## Queue Persistence

```typescript
interface QueuePersistence {
  save(queues: QueueState): Promise<void>;
  load(): Promise<QueueState>;
  saveDeadLetter(items: QueueItem[]): Promise<void>;
}

class RedisQueuePersistence implements QueuePersistence {
  async save(queues: QueueState) {
    await redis.set('queue:state', JSON.stringify(queues));
  }
  
  async load(): Promise<QueueState> {
    const data = await redis.get('queue:state');
    return data ? JSON.parse(data) : this.emptyState();
  }
}

// Fallback to file system
class FileQueuePersistence implements QueuePersistence {
  private readonly filePath = './queue-state.json';
  
  async save(queues: QueueState) {
    await fs.writeFile(this.filePath, JSON.stringify(queues));
  }
  
  async load(): Promise<QueueState> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return this.emptyState();
    }
  }
}
```

## Monitoring & Metrics

```typescript
class QueueMetrics {
  private metrics = {
    totalEnqueued: 0,
    totalProcessed: 0,
    totalFailed: 0,
    avgProcessingTime: 0,
    currentQueueSizes: { high: 0, normal: 0, low: 0 }
  };
  
  async getMetrics() {
    return {
      ...this.metrics,
      throughput: this.calculateThroughput(),
      errorRate: this.calculateErrorRate(),
      queueHealth: this.assessHealth()
    };
  }
  
  private assessHealth(): 'healthy' | 'degraded' | 'critical' {
    const errorRate = this.calculateErrorRate();
    const queueDepth = Object.values(this.metrics.currentQueueSizes)
      .reduce((a, b) => a + b, 0);
    
    if (errorRate > 0.5 || queueDepth > 1000) return 'critical';
    if (errorRate > 0.2 || queueDepth > 500) return 'degraded';
    return 'healthy';
  }
}
```

## WebSocket Events for Queue Status

```typescript
// Real-time queue updates
ws.emit('queue:status', {
  pending: { high: 5, normal: 20, low: 10 },
  processing: 3,
  completed: 150,
  failed: 2
});

ws.emit('queue:item:progress', {
  id: 'download-123',
  progress: 45, // percentage
  bytesDownloaded: 450000,
  totalBytes: 1000000
});
```

## Integration with Extension

```typescript
// Extension receives queue updates
addon.on('queue:item:completed', (data) => {
  // Update UI to show download completed
  updateDownloadStatus(data.id, 'completed');
});

addon.on('queue:item:failed', (data) => {
  // Show error with retry option
  showError(data.id, data.error, {
    onRetry: () => addon.emit('queue:retry', { id: data.id })
  });
});
```

## Scalability Considerations

1. **Horizontal Scaling**: Queue can be distributed across multiple workers
2. **Priority Lanes**: Separate processing threads for different priorities
3. **Batch Processing**: Group similar downloads for efficiency
4. **Circuit Breaker**: Prevent cascading failures
5. **Graceful Shutdown**: Complete in-progress items before shutdown

## Configuration

```typescript
const queueConfig = {
  maxConcurrent: 5,
  rateLimit: 10, // per second
  retryAttempts: 3,
  retryBackoff: 'exponential',
  deadLetterQueueSize: 1000,
  persistenceInterval: 5000, // ms
  metricsInterval: 1000 // ms
};
```