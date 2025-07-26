---
id: overview
title: Core Components Overview
sidebar_label: Overview
---

# Core Components

The Semantest Core package provides fundamental building blocks and shared utilities used across all components of the system. It implements the foundational patterns and abstractions that ensure consistency and maintainability.

## Architecture

The Core package follows Domain-Driven Design principles and provides:

- **Entity Models** - Base classes for domain entities
- **Value Objects** - Immutable value representations
- **Events** - Event-driven architecture foundation
- **Commands** - Command pattern implementation
- **Repositories** - Data access abstractions
- **Services** - Business logic encapsulation

## Package Structure

```
@semantest/core/
├── src/
│   ├── entities/          # Base entity classes
│   ├── value-objects/     # Shared value objects
│   ├── events/           # Event base classes and bus
│   ├── commands/         # Command interfaces
│   ├── repositories/     # Repository interfaces
│   ├── services/         # Core services
│   ├── utils/           # Utility functions
│   └── types/           # TypeScript definitions
├── tests/
└── package.json
```

## Key Components

### Base Entity

```typescript
import { Entity, EntityId } from '@semantest/core';

export class Image extends Entity<EntityId> {
  constructor(
    id: EntityId,
    private url: string,
    private metadata: ImageMetadata
  ) {
    super(id);
  }
  
  // Domain logic here
}
```

### Value Objects

```typescript
import { ValueObject } from '@semantest/core';

export class ImageQuality extends ValueObject {
  constructor(
    public readonly resolution: Resolution,
    public readonly format: ImageFormat,
    public readonly compression: number
  ) {
    super();
  }
  
  equals(other: ImageQuality): boolean {
    return this.resolution.equals(other.resolution) &&
           this.format === other.format &&
           this.compression === other.compression;
  }
}
```

### Domain Events

```typescript
import { DomainEvent, EventBus } from '@semantest/core';

export class ImageDownloadedEvent extends DomainEvent {
  constructor(
    public readonly imageId: string,
    public readonly url: string,
    public readonly size: number
  ) {
    super();
  }
}

// Publishing events
const eventBus = new EventBus();
await eventBus.publish(new ImageDownloadedEvent(
  'img-123',
  'https://example.com/image.jpg',
  1024000
));
```

### Commands

```typescript
import { Command, CommandHandler } from '@semantest/core';

export class DownloadImageCommand implements Command {
  constructor(
    public readonly url: string,
    public readonly options: DownloadOptions
  ) {}
}

@CommandHandler(DownloadImageCommand)
export class DownloadImageHandler {
  async handle(command: DownloadImageCommand): Promise<void> {
    // Handle command
  }
}
```

### Repositories

```typescript
import { Repository } from '@semantest/core';

export interface ImageRepository extends Repository<Image> {
  findByUrl(url: string): Promise<Image | null>;
  findByCriteria(criteria: SearchCriteria): Promise<Image[]>;
}
```

## Event-Driven Architecture

The Core package provides a robust event system:

```typescript
import { EventBus, EventHandler, DomainEvent } from '@semantest/core';

// Define event
class OrderPlacedEvent extends DomainEvent {
  constructor(public orderId: string) {
    super();
  }
}

// Create handler
@EventHandler(OrderPlacedEvent)
class EmailNotificationHandler {
  async handle(event: OrderPlacedEvent): Promise<void> {
    await this.emailService.sendOrderConfirmation(event.orderId);
  }
}

// Register and publish
const eventBus = new EventBus();
eventBus.register(new EmailNotificationHandler());
await eventBus.publish(new OrderPlacedEvent('order-123'));
```

## Utility Functions

### ID Generation

```typescript
import { generateId, generateUuid } from '@semantest/core/utils';

const id = generateId(); // Short unique ID
const uuid = generateUuid(); // UUID v4
```

### Validation

```typescript
import { validate, ValidationError } from '@semantest/core/utils';

const schema = {
  url: { type: 'string', format: 'url', required: true },
  quality: { type: 'string', enum: ['low', 'medium', 'high'] }
};

try {
  validate(data, schema);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.errors);
  }
}
```

### Retry Logic

```typescript
import { retry, RetryOptions } from '@semantest/core/utils';

const result = await retry(
  async () => {
    return await fetchData();
  },
  {
    attempts: 3,
    delay: 1000,
    backoff: 'exponential'
  }
);
```

## Error Handling

```typescript
import { 
  DomainError, 
  ValidationError, 
  NotFoundError 
} from '@semantest/core/errors';

// Domain-specific error
export class ImageTooLargeError extends DomainError {
  constructor(size: number, maxSize: number) {
    super(`Image size ${size} exceeds maximum ${maxSize}`);
    this.code = 'IMAGE_TOO_LARGE';
  }
}

// Error handling
try {
  await processImage(image);
} catch (error) {
  if (error instanceof ImageTooLargeError) {
    // Handle specific error
  } else if (error instanceof ValidationError) {
    // Handle validation error
  }
}
```

## Type Definitions

The Core package exports comprehensive TypeScript definitions:

```typescript
// Common types
export type ID = string;
export type Timestamp = number;
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

// Result type for operations
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Pagination
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Query options
export interface QueryOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}
```

## Configuration

```typescript
import { Config } from '@semantest/core';

// Define configuration schema
interface AppConfig {
  server: {
    port: number;
    host: string;
  };
  features: {
    enableDebug: boolean;
  };
}

// Load configuration
const config = new Config<AppConfig>({
  defaults: {
    server: { port: 3000, host: 'localhost' },
    features: { enableDebug: false }
  },
  env: process.env
});

// Access configuration
const port = config.get('server.port');
```

## Testing Utilities

```typescript
import { TestEventBus, mockRepository } from '@semantest/core/testing';

describe('ImageService', () => {
  let eventBus: TestEventBus;
  let repository: jest.Mocked<ImageRepository>;
  
  beforeEach(() => {
    eventBus = new TestEventBus();
    repository = mockRepository<ImageRepository>();
  });
  
  it('should publish event when image downloaded', async () => {
    const service = new ImageService(repository, eventBus);
    await service.downloadImage('http://example.com/image.jpg');
    
    expect(eventBus.published).toContainEqual(
      expect.objectContaining({
        type: 'ImageDownloadedEvent'
      })
    );
  });
});
```

## Performance Utilities

```typescript
import { memoize, debounce, throttle } from '@semantest/core/utils';

// Memoize expensive calculations
const calculateScore = memoize((image: Image) => {
  // Expensive calculation
  return score;
});

// Debounce user input
const search = debounce((query: string) => {
  // Search logic
}, 300);

// Throttle API calls
const updateProgress = throttle((percent: number) => {
  // Update progress
}, 1000);
```

## Installation

```bash
npm install @semantest/core
```

## Usage Example

```typescript
import {
  Entity,
  ValueObject,
  DomainEvent,
  EventBus,
  Repository,
  generateId
} from '@semantest/core';

// Define your domain model
class ImageUrl extends ValueObject {
  constructor(public readonly value: string) {
    super();
    this.validate();
  }
  
  private validate(): void {
    if (!this.value.startsWith('http')) {
      throw new ValidationError('Invalid URL');
    }
  }
}

class Image extends Entity<string> {
  constructor(
    id: string,
    public url: ImageUrl,
    public metadata: ImageMetadata
  ) {
    super(id);
  }
}

// Use in your application
const image = new Image(
  generateId(),
  new ImageUrl('https://example.com/image.jpg'),
  metadata
);
```

## Best Practices

1. **Use Value Objects** for domain concepts
2. **Emit Domain Events** for important state changes
3. **Implement Repository interfaces** for data access
4. **Handle errors** with specific error types
5. **Validate early** using validation utilities
6. **Test with provided utilities** for consistency

## Resources

- [Architecture Guide](/docs/architecture/overview)
- [API Reference](/docs/api/core)
- [Testing Guide](/docs/developer-guide/testing)
- [Best Practices](/docs/developer-guide/best-practices)