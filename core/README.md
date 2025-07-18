# @semantest/core

Core utilities and patterns for the Semantest framework.

## Features

- **Base Classes**: Entity, Value Object, Domain Event, Aggregate Root
- **Adapters**: HTTP, Storage, Cache, Browser, Database, Logging
- **Validation**: Comprehensive validation utilities and patterns
- **Browser Automation**: Unified browser automation interfaces
- **Security**: Authentication, authorization, input sanitization
- **Storage**: Multiple storage implementations (Memory, Local, Chrome)
- **Error Handling**: Structured error types and utilities
- **Design Patterns**: Common patterns (Singleton, Factory, Observer, etc.)
- **Utilities**: Common utility functions and helpers

## Installation

```bash
npm install @semantest/core
```

## Usage

### Basic Entity

```typescript
import { Entity, BaseEntityProps } from '@semantest/core';

interface UserProps extends BaseEntityProps {
  name: string;
  email: string;
}

class User extends Entity<UserProps> {
  getId(): string {
    return this.props.id;
  }
  
  getName(): string {
    return this.props.name;
  }
  
  getEmail(): string {
    return this.props.email;
  }
}
```

### Validation

```typescript
import { ValidationUtils } from '@semantest/core';

const emailValidator = ValidationUtils.email();
const result = emailValidator.validate('test@example.com');

if (!result.valid) {
  console.log('Validation errors:', result.errors);
}
```

### Browser Automation

```typescript
import { BrowserAutomation, SelectorStrategy } from '@semantest/core';

const page: BrowserAutomation = await createBrowserPage();
const element = await page.findElement({
  strategy: SelectorStrategy.CSS,
  selector: 'input[name="search"]'
});

await element.type('Hello World');
await element.click();
```

### Storage

```typescript
import { StorageFactory } from '@semantest/core';

const storage = StorageFactory.createLocalStorage();
await storage.set('key', 'value');
const value = await storage.get('key');
```

### Events

```typescript
import { DomainEvent } from '@semantest/core';

class UserCreated extends DomainEvent {
  public readonly eventType = 'UserCreated';
  
  constructor(
    correlationId: string,
    public readonly userId: string,
    public readonly userData: any
  ) {
    super(correlationId, userId);
  }
}
```

## API Reference

### Core Classes

- `Entity<T>` - Base entity class
- `AggregateRoot<T>` - Aggregate root with event handling
- `ValueObject<T>` - Base value object class
- `DomainEvent` - Base domain event class

### Adapters

- `BrowserAdapter` - Browser automation interface
- `StorageAdapter` - Storage interface
- `HttpAdapter` - HTTP client interface
- `CacheAdapter` - Cache interface
- `DatabaseAdapter` - Database interface

### Validation

- `ValidationUtils` - Validation utilities
- `StringValidator` - String validation
- `NumberValidator` - Number validation
- `EmailValidator` - Email validation
- `UrlValidator` - URL validation

### Security

- `SecurityValidator` - Security policy validation
- `PermissionChecker` - Permission checking utilities
- `InputSanitizer` - Input sanitization
- `EncryptionUtils` - Encryption utilities

### Design Patterns

- `Singleton` - Singleton pattern implementation
- `Factory<T>` - Factory pattern base class
- `Observer<T>` - Observer pattern implementation
- `Command` - Command pattern interface
- `Strategy<T, R>` - Strategy pattern interface

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.