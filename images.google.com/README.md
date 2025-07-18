# @semantest/images.google.com

## 🖼️ Overview

The Google Images domain module for Semantest - a dedicated domain-driven design module for Google Images search and download automation.

## 📁 Module Structure

```
images.google.com/
├── domain/
│   ├── entities/           # Domain entities (Image, Download)
│   ├── events/             # Domain events (DownloadRequested, etc.)
│   ├── value-objects/      # Value objects (ImageUrl, ImageMetadata)
│   └── repositories/       # Repository interfaces
├── application/
│   ├── services/           # Application services
│   ├── use-cases/          # Use case implementations
│   └── command-handlers/   # Command handlers
├── infrastructure/
│   ├── adapters/           # External service adapters
│   └── repositories/       # Repository implementations
└── tests/
    ├── unit/               # Unit tests
    ├── integration/        # Integration tests
    └── e2e/                # End-to-end tests
```

## 🎯 Domain Model

### Entities
- **Image**: Represents an image with metadata
- **Download**: Represents a download operation
- **SearchResult**: Represents a search result collection

### Value Objects
- **ImageUrl**: Strongly-typed image URL
- **ImageMetadata**: Image metadata (size, format, etc.)
- **SearchQuery**: Search query parameters

### Events
- **ImageDownloadRequested**: Triggered when download is requested
- **ImageDownloadCompleted**: Triggered when download completes
- **ImageDownloadFailed**: Triggered when download fails
- **ImageSearchCompleted**: Triggered when search completes

## 🚀 Usage

```typescript
import { 
  ImageDownloadRequested,
  ImageDownloadCompleted,
  GoogleImagesService 
} from '@semantest/images.google.com';

// Create service
const service = new GoogleImagesService();

// Search for images
const results = await service.search('cats', { maxResults: 10 });

// Download image
const downloadEvent = new ImageDownloadRequested(
  'https://example.com/image.jpg',
  'cats search',
  { quality: 'high' }
);

const result = await service.downloadImage(downloadEvent);
```

## 🏗️ Architecture

This module follows Domain-Driven Design (DDD) principles:

- **Domain Layer**: Pure business logic, no dependencies
- **Application Layer**: Use cases and application services
- **Infrastructure Layer**: External concerns and adapters

### Dependencies
- Core module only (`@semantest/core`)
- No dependencies on other domain modules
- Clean, unidirectional dependencies

## 📊 Features

- ✅ **Image Search**: Search Google Images with various filters
- ✅ **Image Download**: Download images with metadata
- ✅ **Metadata Extraction**: Extract image metadata
- ✅ **Event-Driven**: Full event-driven architecture
- ✅ **Type-Safe**: Complete TypeScript coverage
- ✅ **Testable**: Comprehensive test coverage
- ✅ **Domain-Driven**: Clean domain model

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test type
npm run test:unit
npm run test:integration
npm run test:e2e
```

## 🔧 Development

```bash
# Build
npm run build

# Build and watch
npm run build:watch

# Lint
npm run lint

# Type check
npm run typecheck
```

## 📋 Requirements

- Node.js 18+
- TypeScript 5.5+
- `@semantest/core` ^2.0.0

## 🤝 Contributing

This module follows the Semantest contribution guidelines. See the main project README for details.

## 📜 License

GPL-3.0 - See LICENSE file for details.

---

**Module**: @semantest/images.google.com  
**Version**: 2.0.0  
**Domain**: images.google.com  
**Architecture**: Domain-Driven Design