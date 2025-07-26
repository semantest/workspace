---
id: best-practices
title: Best Practices
sidebar_label: Best Practices
---

# Semantest Best Practices

This guide outlines best practices for developing, maintaining, and deploying Semantest components. Following these practices ensures code quality, performance, and maintainability.

## Architecture Best Practices

### Domain-Driven Design

```typescript
// Good: Domain-centric structure
semantest/
├── domains/
│   ├── image-download/
│   │   ├── entities/
│   │   ├── value-objects/
│   │   ├── repositories/
│   │   ├── services/
│   │   └── events/
│   └── semantic-analysis/
│       ├── entities/
│       └── services/

// Each domain is self-contained
export class ImageDownloadDomain {
  constructor(
    private repository: ImageRepository,
    private downloadService: DownloadService,
    private eventBus: EventBus
  ) {}

  async execute(command: DownloadImagesCommand): Promise<DownloadResult> {
    // Domain logic here
    const images = await this.repository.findByCriteria(command.criteria);
    const results = await this.downloadService.downloadBatch(images);
    
    await this.eventBus.publish(
      new ImagesDownloadedEvent(results)
    );
    
    return results;
  }
}
```

### Event-Driven Architecture

```typescript
// Define clear event contracts
export interface DomainEvent {
  id: string;
  timestamp: Date;
  aggregateId: string;
  version: number;
}

export class ImageDownloadRequestedEvent implements DomainEvent {
  readonly id = generateEventId();
  readonly timestamp = new Date();
  
  constructor(
    public readonly aggregateId: string,
    public readonly version: number,
    public readonly payload: {
      source: string;
      criteria: ImageCriteria;
      options: DownloadOptions;
    }
  ) {}
}

// Event handlers should be idempotent
@EventHandler(ImageDownloadRequestedEvent)
export class ImageDownloadHandler {
  private processedEvents = new Set<string>();
  
  async handle(event: ImageDownloadRequestedEvent): Promise<void> {
    // Idempotency check
    if (this.processedEvents.has(event.id)) {
      logger.warn('Event already processed', { eventId: event.id });
      return;
    }
    
    try {
      await this.processDownload(event);
      this.processedEvents.add(event.id);
    } catch (error) {
      await this.handleError(error, event);
    }
  }
}
```

### Dependency Injection

```typescript
// Use constructor injection
export class ImageDownloadService {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly storage: StorageService,
    private readonly metrics: MetricsService,
    @Inject('IMAGE_CONFIG') private readonly config: ImageConfig
  ) {}
}

// Container configuration
const container = new Container();

container.bind<HttpClient>(HttpClient).toSelf().inSingletonScope();
container.bind<StorageService>(StorageService).to(S3StorageService);
container.bind<ImageConfig>('IMAGE_CONFIG').toConstantValue({
  maxConcurrent: 5,
  timeout: 30000,
  retryAttempts: 3
});
```

## Code Quality

### TypeScript Best Practices

```typescript
// 1. Use strict type checking
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitThis": true
  }
}

// 2. Prefer interfaces over type aliases
// Good
interface User {
  id: string;
  name: string;
  email: string;
}

// Use type only for unions/intersections
type Status = 'active' | 'inactive' | 'pending';
type UserWithStatus = User & { status: Status };

// 3. Use const assertions for literals
const CONFIG = {
  API_VERSION: 'v1',
  MAX_RETRIES: 3,
  TIMEOUT: 5000
} as const;

// 4. Leverage type inference
// Good - TypeScript infers the type
const numbers = [1, 2, 3, 4, 5];

// Unnecessary
const numbers: number[] = [1, 2, 3, 4, 5];

// 5. Use generics for reusable code
export class Repository<T extends Entity> {
  async findById(id: string): Promise<T | null> {
    // Implementation
  }
  
  async save(entity: T): Promise<T> {
    // Implementation
  }
}
```

### Error Handling

```typescript
// Create domain-specific error types
export class SemantestError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends SemantestError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class NotFoundError extends SemantestError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', 404);
  }
}

// Centralized error handling
export class ErrorHandler {
  handle(error: Error): ErrorResponse {
    if (error instanceof ValidationError) {
      return {
        code: error.code,
        message: error.message,
        details: error.details
      };
    }
    
    if (error instanceof NotFoundError) {
      return {
        code: error.code,
        message: error.message
      };
    }
    
    // Log unexpected errors
    logger.error('Unexpected error', { error });
    
    return {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    };
  }
}

// Use Result type for expected errors
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

export async function downloadImage(
  url: string
): Promise<Result<Buffer, DownloadError>> {
  try {
    const data = await fetch(url);
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: new DownloadError(error.message) 
    };
  }
}
```

### Logging Standards

```typescript
// Structured logging with context
export class ContextLogger {
  constructor(
    private logger: Logger,
    private context: Record<string, any>
  ) {}
  
  info(message: string, meta?: Record<string, any>) {
    this.logger.info(message, {
      ...this.context,
      ...meta,
      timestamp: new Date().toISOString()
    });
  }
  
  error(message: string, error: Error, meta?: Record<string, any>) {
    this.logger.error(message, {
      ...this.context,
      ...meta,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      timestamp: new Date().toISOString()
    });
  }
}

// Usage
const logger = new ContextLogger(winston, {
  service: 'image-download',
  version: '1.0.0',
  environment: process.env.NODE_ENV
});

logger.info('Download started', {
  url: 'https://example.com/image.jpg',
  userId: user.id,
  correlationId: request.id
});
```

## Performance Optimization

### Efficient Resource Usage

```typescript
// 1. Use streaming for large files
import { pipeline } from 'stream/promises';

export async function downloadLargeFile(
  url: string,
  destination: string
): Promise<void> {
  const response = await fetch(url);
  const fileStream = createWriteStream(destination);
  
  await pipeline(
    response.body,
    fileStream
  );
}

// 2. Implement connection pooling
export class HttpClientPool {
  private agents = new Map<string, http.Agent>();
  
  getAgent(url: string): http.Agent {
    const { hostname } = new URL(url);
    
    if (!this.agents.has(hostname)) {
      this.agents.set(hostname, new http.Agent({
        keepAlive: true,
        maxSockets: 10,
        maxFreeSockets: 5,
        timeout: 60000,
        keepAliveMsecs: 30000
      }));
    }
    
    return this.agents.get(hostname)!;
  }
}

// 3. Implement caching strategies
export class CachedImageService {
  constructor(
    private cache: Redis,
    private imageService: ImageService,
    private ttl: number = 3600
  ) {}
  
  async getImage(id: string): Promise<Image | null> {
    // Try cache first
    const cached = await this.cache.get(`image:${id}`);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Fetch from service
    const image = await this.imageService.getImage(id);
    if (image) {
      await this.cache.setex(
        `image:${id}`,
        this.ttl,
        JSON.stringify(image)
      );
    }
    
    return image;
  }
}
```

### Concurrency Control

```typescript
// Implement rate limiting
export class RateLimiter {
  private queue: Array<() => void> = [];
  private running = 0;
  
  constructor(
    private maxConcurrent: number,
    private minInterval: number = 0
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.waitForSlot();
    
    try {
      this.running++;
      const result = await fn();
      
      if (this.minInterval > 0) {
        await sleep(this.minInterval);
      }
      
      return result;
    } finally {
      this.running--;
      this.processQueue();
    }
  }
  
  private waitForSlot(): Promise<void> {
    if (this.running < this.maxConcurrent) {
      return Promise.resolve();
    }
    
    return new Promise(resolve => {
      this.queue.push(resolve);
    });
  }
  
  private processQueue() {
    if (this.queue.length > 0 && this.running < this.maxConcurrent) {
      const next = this.queue.shift();
      next?.();
    }
  }
}

// Usage
const limiter = new RateLimiter(5, 100); // Max 5 concurrent, 100ms between

const results = await Promise.all(
  urls.map(url => limiter.execute(() => downloadImage(url)))
);
```

### Memory Management

```typescript
// 1. Use weak references for caches
export class WeakCache<K extends object, V> {
  private cache = new WeakMap<K, V>();
  
  set(key: K, value: V): void {
    this.cache.set(key, value);
  }
  
  get(key: K): V | undefined {
    return this.cache.get(key);
  }
}

// 2. Implement memory-aware queues
export class MemoryAwareQueue<T> {
  private items: T[] = [];
  private sizeInBytes = 0;
  
  constructor(
    private maxSizeInBytes: number,
    private itemSizeCalculator: (item: T) => number
  ) {}
  
  enqueue(item: T): boolean {
    const itemSize = this.itemSizeCalculator(item);
    
    if (this.sizeInBytes + itemSize > this.maxSizeInBytes) {
      return false; // Queue full
    }
    
    this.items.push(item);
    this.sizeInBytes += itemSize;
    return true;
  }
  
  dequeue(): T | undefined {
    const item = this.items.shift();
    if (item) {
      this.sizeInBytes -= this.itemSizeCalculator(item);
    }
    return item;
  }
}

// 3. Clean up resources properly
export class ResourceManager {
  private resources: Array<() => Promise<void>> = [];
  
  register(cleanup: () => Promise<void>): void {
    this.resources.push(cleanup);
  }
  
  async cleanup(): Promise<void> {
    await Promise.all(
      this.resources.map(fn => fn().catch(console.error))
    );
    this.resources = [];
  }
}
```

## Security Best Practices

### Input Validation

```typescript
// Use validation libraries
import { z } from 'zod';

// Define schemas
const DownloadRequestSchema = z.object({
  source: z.string().url(),
  query: z.string().min(1).max(100),
  count: z.number().int().min(1).max(50).default(10),
  options: z.object({
    quality: z.enum(['low', 'medium', 'high']).default('medium'),
    safeSearch: z.boolean().default(true)
  }).optional()
});

// Validate input
export function validateDownloadRequest(input: unknown) {
  try {
    return DownloadRequestSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid request', error.errors);
    }
    throw error;
  }
}

// Sanitize output
export function sanitizeUrl(url: string): string {
  const parsed = new URL(url);
  
  // Only allow http(s) protocols
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new ValidationError('Invalid protocol');
  }
  
  // Remove credentials
  parsed.username = '';
  parsed.password = '';
  
  return parsed.toString();
}
```

### Authentication & Authorization

```typescript
// Implement proper JWT handling
export class AuthService {
  constructor(
    private jwtSecret: string,
    private tokenExpiry: string = '24h'
  ) {}
  
  async generateToken(user: User): Promise<string> {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        roles: user.roles
      },
      this.jwtSecret,
      {
        expiresIn: this.tokenExpiry,
        issuer: 'semantest',
        audience: 'semantest-api'
      }
    );
  }
  
  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'semantest',
        audience: 'semantest-api'
      }) as TokenPayload;
    } catch (error) {
      throw new UnauthorizedError('Invalid token');
    }
  }
}

// Role-based access control
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.roles?.includes(role)) {
      throw new ForbiddenError(`Role ${role} required`);
    }
    next();
  };
}
```

### Data Protection

```typescript
// Encrypt sensitive data
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  
  constructor(private key: Buffer) {}
  
  encrypt(data: string): EncryptedData {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
  
  decrypt(data: EncryptedData): string {
    const decipher = createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(data.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
    
    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

## Testing Best Practices

### Test Organization

```typescript
// Follow AAA pattern
describe('ImageDownloadService', () => {
  describe('downloadBatch', () => {
    it('should download multiple images concurrently', async () => {
      // Arrange
      const urls = ['url1', 'url2', 'url3'];
      const service = new ImageDownloadService();
      
      // Act
      const results = await service.downloadBatch(urls);
      
      // Assert
      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });
  });
});

// Use test builders
class ImageBuilder {
  private image: Partial<Image> = {
    id: 'default-id',
    url: 'http://example.com/image.jpg',
    width: 1920,
    height: 1080
  };
  
  withUrl(url: string): this {
    this.image.url = url;
    return this;
  }
  
  withDimensions(width: number, height: number): this {
    this.image.width = width;
    this.image.height = height;
    return this;
  }
  
  build(): Image {
    return this.image as Image;
  }
}
```

## Documentation Standards

### Code Documentation

```typescript
/**
 * Downloads images based on semantic search criteria.
 * 
 * This service handles the complete image download workflow including:
 * - Search query processing
 * - Image selection based on quality criteria  
 * - Concurrent downloading with retry logic
 * - Metadata extraction and storage
 * 
 * @example
 * ```typescript
 * const service = new ImageDownloadService();
 * const results = await service.download({
 *   source: 'unsplash.com',
 *   query: 'nature landscapes',
 *   count: 10,
 *   quality: 'high'
 * });
 * ```
 */
export class ImageDownloadService {
  /**
   * Downloads images matching the specified criteria.
   * 
   * @param options - Download configuration options
   * @param options.source - The website to search for images
   * @param options.query - Search query string
   * @param options.count - Number of images to download (max: 50)
   * @param options.quality - Preferred image quality
   * @returns Promise resolving to download results
   * @throws {ValidationError} If options are invalid
   * @throws {DownloadError} If download fails
   */
  async download(options: DownloadOptions): Promise<DownloadResult> {
    // Implementation
  }
}
```

### API Documentation

```yaml
# OpenAPI specification
openapi: 3.0.0
info:
  title: Semantest API
  version: 1.0.0
  description: Semantic web automation API

paths:
  /api/download:
    post:
      summary: Download images
      operationId: downloadImages
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DownloadRequest'
      responses:
        '200':
          description: Download initiated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DownloadResponse'
```

## Deployment Best Practices

### Environment Configuration

```typescript
// Use environment-specific configs
export const config = {
  // Required environment variables
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0'
  },
  
  // Feature flags
  features: {
    newImageSelector: process.env.FEATURE_NEW_IMAGE_SELECTOR === 'true',
    debugMode: process.env.DEBUG === 'true'
  },
  
  // External services
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD
  }
};

// Validate required config
export function validateConfig(): void {
  const required = ['JWT_SECRET', 'DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}
```

### Health Checks

```typescript
// Implement comprehensive health checks
export class HealthCheckService {
  constructor(
    private db: Database,
    private redis: Redis,
    private services: ExternalService[]
  ) {}
  
  async check(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      ...this.services.map(s => this.checkService(s))
    ]);
    
    const results = checks.map((check, index) => ({
      name: this.getCheckName(index),
      status: check.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      message: check.status === 'rejected' ? check.reason.message : 'OK'
    }));
    
    return {
      status: results.every(r => r.status === 'healthy') ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: results
    };
  }
}
```

## Monitoring & Observability

### Metrics Collection

```typescript
// Use Prometheus metrics
import { Counter, Histogram, register } from 'prom-client';

export const metrics = {
  httpRequests: new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status']
  }),
  
  requestDuration: new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration',
    labelNames: ['method', 'route'],
    buckets: [0.1, 0.5, 1, 2, 5]
  }),
  
  downloadQueue: new Gauge({
    name: 'download_queue_size',
    help: 'Current download queue size'
  })
};

// Middleware to collect metrics
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    
    metrics.httpRequests.inc({
      method: req.method,
      route: req.route?.path || 'unknown',
      status: res.statusCode
    });
    
    metrics.requestDuration.observe({
      method: req.method,
      route: req.route?.path || 'unknown'
    }, duration);
  });
  
  next();
}
```

## Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
- [12 Factor App](https://12factor.net/)