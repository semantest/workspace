---
id: contributing
title: Contributing to Semantest
sidebar_label: Contributing
---

# Contributing to Semantest

Thank you for your interest in contributing to Semantest! This guide will help you get started with contributing to our semantic web automation framework.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:
- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Respect differing viewpoints and experiences

## Getting Started

### Prerequisites

- Node.js 18+ and npm 8+
- Git 2.30+
- Chrome/Chromium browser
- Basic knowledge of TypeScript and web technologies

### Development Setup

1. **Fork and Clone**
   ```bash
   # Fork the repository on GitHub
   # Clone your fork
   git clone https://github.com/YOUR_USERNAME/semantest
   cd semantest
   ```

2. **Install Dependencies**
   ```bash
   # Install root dependencies
   npm install

   # Bootstrap all packages
   npm run bootstrap

   # Build all packages
   npm run build
   ```

3. **Set Up Development Environment**
   ```bash
   # Copy environment template
   cp .env.example .env

   # Start development servers
   npm run dev
   ```

## Development Workflow

### Branch Strategy

We use a feature branch workflow:

```bash
# Create feature branch from main
git checkout -b feature/your-feature-name

# Create bugfix branch
git checkout -b fix/issue-description

# Create documentation branch
git checkout -b docs/what-you-are-documenting
```

### Making Changes

1. **Write Tests First (TDD)**
   ```typescript
   // Write test before implementation
   describe('YourFeature', () => {
     it('should do something specific', () => {
       // Test implementation
     });
   });
   ```

2. **Implement Your Feature**
   - Follow existing code patterns
   - Use TypeScript strict mode
   - Maintain backward compatibility

3. **Run Quality Checks**
   ```bash
   # Run tests
   npm test

   # Run linting
   npm run lint

   # Run type checking
   npm run typecheck

   # Run all checks
   npm run validate
   ```

### Commit Guidelines

We follow Conventional Commits specification:

```bash
# Format: <type>(<scope>): <subject>

# Examples:
git commit -m "feat(chrome-ext): add image quality selector"
git commit -m "fix(server): handle WebSocket reconnection"
git commit -m "docs(api): update authentication examples"
git commit -m "test(sdk): add integration tests for download"
git commit -m "refactor(core): simplify event handling logic"
```

**Commit Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style changes (formatting, etc)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding or updating tests
- `chore`: Changes to build process or auxiliary tools

### Pull Request Process

1. **Before Creating PR**
   - Ensure all tests pass
   - Update documentation if needed
   - Add/update tests for new functionality
   - Rebase on latest main branch

2. **PR Title Format**
   ```
   feat(component): Brief description
   fix(component): Brief description
   ```

3. **PR Description Template**
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] Manual testing completed

   ## Checklist
   - [ ] Code follows project style
   - [ ] Self-review completed
   - [ ] Documentation updated
   - [ ] No breaking changes
   ```

## Architecture Guidelines

### Domain-Driven Design

We follow DDD principles:

```typescript
// Good: Domain-focused naming
interface ImageDownloadCommand {
  source: ImageSource;
  criteria: SelectionCriteria;
  options: DownloadOptions;
}

// Avoid: Technical naming
interface DownloadData {
  url: string;
  params: any;
}
```

### Event-Driven Architecture

All components communicate through events:

```typescript
// Define domain events
export class ImageDownloadRequested extends DomainEvent {
  constructor(
    public readonly source: string,
    public readonly criteria: Criteria
  ) {
    super();
  }
}

// Handle events
@EventHandler(ImageDownloadRequested)
export class ImageDownloadHandler {
  async handle(event: ImageDownloadRequested) {
    // Implementation
  }
}
```

## Testing Standards

### Test Structure

```typescript
describe('Component/Feature', () => {
  describe('Method/Behavior', () => {
    it('should handle specific case', () => {
      // Arrange
      const input = createTestInput();
      
      // Act
      const result = performAction(input);
      
      // Assert
      expect(result).toMatchExpectation();
    });
  });
});
```

### Test Coverage Requirements

- Minimum 80% code coverage
- 100% coverage for critical paths
- All public APIs must have tests
- Edge cases must be tested

### Testing Best Practices

1. **Use Test Builders**
   ```typescript
   const command = new CommandBuilder()
     .withSource('google.com')
     .withQuery('sunset')
     .build();
   ```

2. **Mock External Dependencies**
   ```typescript
   const mockBrowser = createMockBrowser();
   jest.mock('../browser', () => mockBrowser);
   ```

3. **Test Behaviors, Not Implementation**
   ```typescript
   // Good: Test behavior
   expect(result.images).toHaveLength(5);
   
   // Avoid: Test implementation details
   expect(privateMethod).toHaveBeenCalled();
   ```

## Code Style Guide

### TypeScript Guidelines

1. **Use Strict Type Checking**
   ```typescript
   // tsconfig.json
   {
     "compilerOptions": {
       "strict": true,
       "noImplicitAny": true,
       "strictNullChecks": true
     }
   }
   ```

2. **Prefer Interfaces Over Types**
   ```typescript
   // Good
   interface User {
     id: string;
     name: string;
   }
   
   // Use type only for unions/intersections
   type Status = 'active' | 'inactive';
   ```

3. **Use Meaningful Names**
   ```typescript
   // Good
   const imageQualityThreshold = 0.8;
   
   // Avoid
   const threshold = 0.8;
   ```

### Error Handling

```typescript
// Create specific error types
export class ImageDownloadError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'ImageDownloadError';
  }
}

// Handle errors appropriately
try {
  await downloadImage(url);
} catch (error) {
  if (error instanceof ImageDownloadError) {
    logger.error('Download failed', {
      code: error.code,
      details: error.details
    });
  }
  throw error;
}
```

## Package-Specific Guidelines

### Chrome Extension

- Follow Chrome Extension Manifest V3 guidelines
- Minimize permissions requested
- Handle all Chrome API errors
- Test across different Chrome versions

### WebSocket Server

- Implement proper error recovery
- Add health check endpoints
- Follow security best practices
- Document all message types

### SDK

- Maintain backward compatibility
- Provide TypeScript definitions
- Include comprehensive examples
- Follow semantic versioning

## Documentation

### Code Documentation

```typescript
/**
 * Downloads images based on semantic criteria.
 * 
 * @param options - Download configuration
 * @param options.source - Website to search
 * @param options.query - Search query
 * @param options.count - Number of images (default: 10)
 * @returns Promise resolving to download results
 * 
 * @example
 * ```typescript
 * const results = await downloadImages({
 *   source: 'unsplash.com',
 *   query: 'architecture',
 *   count: 5
 * });
 * ```
 */
export async function downloadImages(options: DownloadOptions): Promise<DownloadResult> {
  // Implementation
}
```

### User Documentation

- Update relevant docs in `/docs`
- Include code examples
- Add to FAQ if applicable
- Update API references

## Release Process

### Version Bumping

```bash
# Bump version for all packages
npm run version:patch  # 1.0.0 → 1.0.1
npm run version:minor  # 1.0.0 → 1.1.0
npm run version:major  # 1.0.0 → 2.0.0
```

### Creating Releases

1. Update CHANGELOG.md
2. Create release branch
3. Run final validation
4. Create GitHub release
5. Publish to npm

## Getting Help

### Resources

- [Discord Community](https://discord.gg/semantest)
- [GitHub Discussions](https://github.com/semantest/workspace/discussions)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/semantest)

### Communication Channels

- **Discord**: Real-time help and discussion
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Twitter**: @semantest for announcements

## Recognition

Contributors are recognized in:
- CONTRIBUTORS.md file
- GitHub contributors page
- Release notes
- Project documentation

Thank you for contributing to Semantest! 🎉