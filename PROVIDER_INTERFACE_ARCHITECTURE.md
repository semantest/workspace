# Provider Interface Architecture

## Sprint Deliverable - 10:50 AM

### Core Provider Strategy Pattern

```typescript
// Base provider interface for all image generation services
interface ImageProvider {
  name: string;
  priority: number;
  healthCheck(): Promise<boolean>;
  execute(request: ImageGenRequest): Promise<ImageGenJob>;
  getCapabilities(): ProviderCapabilities;
}

// Provider capabilities for smart routing
interface ProviderCapabilities {
  maxResolution: { width: number; height: number };
  supportedFormats: ImageFormat[];
  rateLimit: { requests: number; window: Duration };
  estimatedLatency: Duration;
  costPerImage: number;
}

// Strategy pattern implementation
class ProviderStrategy {
  private providers: Map<string, ImageProvider>;
  private circuitBreakers: Map<string, CircuitBreaker>;
  
  async selectProvider(request: ImageGenRequest): Promise<ImageProvider> {
    // Smart routing based on:
    // 1. Provider health
    // 2. Current rate limits
    // 3. Request requirements
    // 4. Cost optimization
  }
}
```

### Provider Implementations

**DALL-E Provider**:
```typescript
class DallEProvider implements ImageProvider {
  private rateLimiter: RateLimiter;
  
  async execute(request: ImageGenRequest): Promise<ImageGenJob> {
    // Rate limit check
    await this.rateLimiter.acquire();
    
    // API call with retry logic
    return this.withRetry(() => 
      this.client.createImage(request)
    );
  }
}
```

**Stable Diffusion Provider**:
```typescript
class StableDiffusionProvider implements ImageProvider {
  async execute(request: ImageGenRequest): Promise<ImageGenJob> {
    // Queue for GPU processing
    return this.jobQueue.add('generate', request);
  }
}
```

### Circuit Breaker Pattern

```typescript
interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: Duration;
  halfOpenRequests: number;
}

class ProviderCircuitBreaker {
  private state: 'closed' | 'open' | 'half-open';
  private failures: number = 0;
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      throw new Error('Circuit breaker is open');
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

### Rate Limiting Strategy

```typescript
interface RateLimitStrategy {
  type: 'token-bucket' | 'sliding-window' | 'fixed-window';
  capacity: number;
  refillRate: number;
}

class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: Date;
  
  async acquire(tokens: number = 1): Promise<void> {
    await this.refill();
    
    if (this.tokens < tokens) {
      throw new RateLimitExceeded();
    }
    
    this.tokens -= tokens;
  }
}
```

### Integration with BullMQ

```typescript
// Job processor with provider strategy
class ImageGenerationProcessor {
  constructor(
    private strategy: ProviderStrategy,
    private monitoring: MonitoringService
  ) {}
  
  async process(job: Job<ImageGenRequest>): Promise<void> {
    const provider = await this.strategy.selectProvider(job.data);
    
    try {
      const result = await provider.execute(job.data);
      await job.updateProgress(100);
      
      // Emit WebSocket event
      this.events.emit('image.generated', {
        jobId: job.id,
        result
      });
      
    } catch (error) {
      // Fallback to next provider
      await this.handleProviderFailure(job, provider, error);
    }
  }
}
```

### Monitoring & Observability

```typescript
interface ProviderMetrics {
  successRate: number;
  averageLatency: Duration;
  errorRate: number;
  rateLimitHits: number;
  cost: number;
}

class ProviderMonitoring {
  async recordSuccess(provider: string, latency: number): Promise<void> {
    await this.metrics.increment(`provider.${provider}.success`);
    await this.metrics.histogram(`provider.${provider}.latency`, latency);
  }
  
  async getProviderHealth(): Promise<Map<string, ProviderMetrics>> {
    // Aggregate metrics for intelligent routing
  }
}
```

### Security Considerations

1. **API Key Management**:
   - Encrypted storage in environment
   - Key rotation support
   - Per-provider authentication

2. **Request Validation**:
   - Input sanitization
   - Size limits enforcement
   - Content filtering

3. **Response Validation**:
   - Image format verification
   - Size validation
   - NSFW content detection

### Testing Strategy

```typescript
// Mock provider for testing
class MockImageProvider implements ImageProvider {
  async execute(request: ImageGenRequest): Promise<ImageGenJob> {
    return {
      id: 'mock-job-id',
      status: 'completed',
      result: 'mock-image-url'
    };
  }
}

// Integration tests
describe('ProviderStrategy', () => {
  it('should failover to secondary provider', async () => {
    // Test circuit breaker and fallback logic
  });
  
  it('should respect rate limits', async () => {
    // Test rate limiting behavior
  });
});
```

---

**Sprint Status**: Provider interface architecture COMPLETE!  
**Time**: 10:52 AM  
**Ready for**: Alex's implementation & Quinn's tests