# Semantest Error Handling System

A comprehensive error handling framework that provides structured error types, recovery strategies, and seamless integration with logging and monitoring systems.

## Overview

The Semantest error handling system is designed to:
- Provide a consistent error structure across all modules
- Enable graceful error recovery
- Integrate with monitoring and alerting systems
- Offer helpful recovery suggestions to users
- Maintain security and privacy in error reporting

## Error Hierarchy

### Base Error Class

```typescript
export abstract class SemantestError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, any>,
    public readonly recoverable: boolean = true,
    public readonly statusCode: number = 500
  );
}
```

### Domain Errors

- `EntityNotFoundError` - When a requested entity doesn't exist
- `BusinessRuleViolationError` - When a business rule is violated
- `AggregateInvariantError` - When an aggregate invariant is violated
- `DomainEventError` - When domain event handling fails

### Domain-Specific Errors

#### Google Images Errors
- `ImageSearchError` - Failed image search operations
- `ImageDownloadError` - Failed image downloads
- `ImageUrlResolutionError` - Failed URL resolution
- `NoImagesFoundError` - No images found for query
- `RateLimitError` - Rate limit exceeded
- `GoogleImagesBrowserError` - Browser automation failures

### Infrastructure Errors
- `NetworkError` - Network connectivity issues
- `TimeoutError` - Operation timeouts
- `ServiceUnavailableError` - External service failures

### Validation Errors
- `ValidationError` - Input validation failures
- `SchemaValidationError` - Schema validation failures

### Security Errors
- `AuthenticationError` - Authentication failures
- `AuthorizationError` - Authorization failures
- `SecurityViolationError` - Security policy violations

## Recovery Strategies

### Retry Strategy

Automatically retry operations with exponential backoff:

```typescript
const strategy = new RetryStrategy(
  operation,
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000
);
```

### Fallback Strategy

Use fallback values when operations fail:

```typescript
const strategy = new FallbackStrategy(
  fallbackValue,
  errorCodes: ['SPECIFIC_ERROR']
);
```

### Circuit Breaker Strategy

Prevent cascading failures:

```typescript
const strategy = new CircuitBreakerStrategy(
  operation,
  failureThreshold: 5,
  resetTimeout: 60000
);
```

### Cache Strategy

Use cached values during failures:

```typescript
const strategy = new CacheStrategy(
  getCacheKey,
  ttl: 300000 // 5 minutes
);
```

### Recovery Chains

Combine multiple strategies:

```typescript
const chain = new RecoveryChain<T>()
  .add(retryStrategy)
  .add(cacheStrategy)
  .add(fallbackStrategy);

try {
  const result = await chain.execute(error, context);
} catch (finalError) {
  // All strategies failed
}
```

## Error Handler

The global error handler provides centralized error processing:

```typescript
import { globalErrorHandler } from '@semantest/core/errors';

// Handle an error
const response = globalErrorHandler.handle(error);

// Express middleware
app.use(expressErrorHandler({
  logErrors: true,
  includeStackTrace: false,
  sanitizeErrors: true
}));
```

## React Error Boundaries

Catch and handle errors in React components:

```typescript
import { ErrorBoundary, withErrorBoundary } from '@semantest/core/errors';

// Using component
<ErrorBoundary
  fallback={(error, errorInfo) => <CustomErrorUI />}
  onError={(error, errorInfo) => console.error(error)}
  level="component"
>
  <YourComponent />
</ErrorBoundary>

// Using HOC
const SafeComponent = withErrorBoundary(YourComponent, {
  level: 'component',
  fallback: CustomErrorUI
});

// Using hook
const errorHandler = useErrorHandler();
try {
  await riskyOperation();
} catch (error) {
  errorHandler(error);
}
```

## Usage Examples

### Basic Error Handling

```typescript
import { ImageSearchError, RecoveryPatterns } from '@semantest/core/errors';

async function searchImages(query: string) {
  try {
    return await performSearch(query);
  } catch (error) {
    throw new ImageSearchError(
      query,
      'Failed to connect to search service',
      error
    );
  }
}

// With recovery
const searchWithRecovery = RecoveryPatterns.networkErrorRecovery(
  () => searchImages('cats'),
  [] // fallback empty array
);

const results = await searchWithRecovery.execute(
  new Error('Initial failure')
);
```

### Domain Error Handling

```typescript
import { EntityNotFoundError, BusinessRuleViolationError } from '@semantest/core/errors';

class OrderService {
  async getOrder(orderId: string): Promise<Order> {
    const order = await this.repository.findById(orderId);
    
    if (!order) {
      throw new EntityNotFoundError(
        'Order',
        orderId,
        'orders',
        { customerId: this.currentUser.id }
      );
    }
    
    return order;
  }
  
  async placeOrder(items: Item[], total: number): Promise<Order> {
    if (total < 10) {
      throw new BusinessRuleViolationError(
        'MinimumOrderAmount',
        'Order amount must be at least $10',
        'orders',
        { total, itemCount: items.length }
      );
    }
    
    // ... place order
  }
}
```

### Error Recovery Patterns

```typescript
import { 
  RecoveryChain, 
  RetryStrategy, 
  CircuitBreakerStrategy,
  CacheStrategy 
} from '@semantest/core/errors';

// Complex recovery chain
const imageDownloadChain = new RecoveryChain<Buffer>()
  // First try retry with backoff
  .add(new RetryStrategy(
    () => downloadImage(url),
    3, // max retries
    1000, // base delay
    10000 // max delay
  ))
  // Then try cache
  .add(new CacheStrategy(
    (ctx) => ctx.url,
    300000 // 5 minute TTL
  ))
  // Finally use placeholder
  .add(new FallbackStrategy(
    () => loadPlaceholderImage()
  ));

try {
  const image = await imageDownloadChain.execute(
    new ImageDownloadError(url, 'Network error'),
    { url }
  );
} catch (error) {
  // All recovery strategies failed
  console.error('Failed to get image:', error);
}
```

### Integration with Monitoring

```typescript
import { ErrorHandler } from '@semantest/core/errors';
import { Logger } from '@semantest/core/logging';
import { MonitoringService } from '@semantest/core/monitoring';

// Custom error handler with monitoring
const errorHandler = new ErrorHandler(
  {
    logErrors: true,
    includeStackTrace: process.env.NODE_ENV !== 'production',
    onError: (error) => {
      // Custom error processing
      if (error instanceof SecurityError) {
        // Trigger security alert
        securityTeam.notify(error);
      }
    }
  },
  new Logger('AppErrors'),
  MonitoringService.getInstance()
);

// Errors will now be:
// - Logged with appropriate level
// - Counted in metrics
// - Trigger alerts for critical errors
// - Include correlation IDs for tracing
```

## Best Practices

1. **Use Domain-Specific Errors**: Create specific error types for your domain
2. **Provide Context**: Include relevant context in error creation
3. **Set Recoverable Flag**: Indicate if an error can be recovered from
4. **Use Appropriate Status Codes**: Match HTTP status codes to error types
5. **Implement Recovery Strategies**: Use recovery chains for resilient operations
6. **Log at Appropriate Levels**: Use warn for client errors, error for server errors
7. **Sanitize for Production**: Don't expose sensitive data in production errors
8. **Monitor Error Rates**: Track error frequencies and patterns
9. **Document Recovery Steps**: Provide clear recovery suggestions
10. **Test Error Paths**: Include error scenarios in your tests

## Security Considerations

- Never log sensitive data (passwords, tokens, PII)
- Sanitize error messages in production
- Use correlation IDs instead of exposing internal IDs
- Monitor for security-related errors
- Implement rate limiting for error-prone operations

## Performance Impact

The error handling system is designed to have minimal performance impact:
- Lazy stack trace capture
- Efficient error serialization
- Caching for recovery strategies
- Asynchronous logging and monitoring

## Testing

```typescript
import { ImageSearchError, ErrorHandler } from '@semantest/core/errors';

describe('Error Handling', () => {
  it('should handle domain errors', () => {
    const error = new ImageSearchError(
      'test query',
      'Service unavailable'
    );
    
    expect(error.code).toBe('GOOGLE-IMAGES_IMAGE_SEARCH_ERROR');
    expect(error.statusCode).toBe(503);
    expect(error.getRecoverySuggestions()).toContain(
      'Check your internet connection'
    );
  });
  
  it('should recover with retry strategy', async () => {
    let attempts = 0;
    const operation = jest.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 3) throw new Error('Temporary failure');
      return 'success';
    });
    
    const strategy = new RetryStrategy(operation, 3, 10);
    const result = await strategy.recover(new Error('Initial'));
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });
});
```