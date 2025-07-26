---
id: style-guide
title: Code Style Guide
sidebar_label: Style Guide
---

# Semantest Code Style Guide

This guide defines the coding standards and conventions used throughout the Semantest project. Consistent code style improves readability, maintainability, and collaboration.

## General Principles

1. **Clarity over cleverness** - Write code that is easy to understand
2. **Consistency** - Follow existing patterns in the codebase
3. **Self-documenting** - Use meaningful names and clear structure
4. **Simplicity** - Prefer simple solutions over complex ones

## TypeScript Style

### File Organization

```typescript
// 1. Imports (grouped and ordered)
// External dependencies
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';

// Internal dependencies  
import { ImageService } from '@/services/ImageService';
import { useAuth } from '@/hooks/useAuth';

// Types and interfaces
import type { Image, ImageMetadata } from '@/types';

// Constants
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

// 2. Type definitions
interface ImageGalleryProps {
  images: Image[];
  onSelect: (image: Image) => void;
}

// 3. Component/Class definition
export const ImageGallery: React.FC<ImageGalleryProps> = observer(({ 
  images, 
  onSelect 
}) => {
  // Implementation
});

// 4. Helper functions
function formatImageSize(bytes: number): string {
  // Implementation
}

// 5. Exports (if not already exported)
export { formatImageSize };
```

### Naming Conventions

```typescript
// Interfaces - PascalCase with descriptive names
interface ImageDownloadRequest {
  source: string;
  criteria: SelectionCriteria;
}

// Types - PascalCase
type ImageQuality = 'low' | 'medium' | 'high';

// Classes - PascalCase
class ImageProcessor {
  // Implementation
}

// Functions - camelCase, verb-based
function downloadImage(url: string): Promise<Buffer> {
  // Implementation
}

// Constants - UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_TIMEOUT = 30000;

// Enums - PascalCase with UPPER_SNAKE_CASE values
enum ImageFormat {
  JPEG = 'jpeg',
  PNG = 'png',
  WEBP = 'webp'
}

// React Components - PascalCase
const ImageViewer: React.FC<Props> = () => {
  // Implementation
};

// Hooks - camelCase with 'use' prefix
function useImageLoader(url: string) {
  // Implementation
}

// Event handlers - handle prefix
const handleImageClick = (image: Image) => {
  // Implementation
};

// Boolean variables - is/has/should prefix
const isLoading = true;
const hasError = false;
const shouldRetry = true;
```

### Type Definitions

```typescript
// Prefer interfaces for object shapes
interface User {
  id: string;
  name: string;
  email: string;
}

// Use types for unions, intersections, and aliases
type Status = 'pending' | 'active' | 'inactive';
type ID = string | number;
type UserWithStatus = User & { status: Status };

// Use generics for reusable types
interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

// Avoid any - use unknown or specific types
// Bad
function process(data: any) { }

// Good
function process(data: unknown) { }
function processUser(user: User) { }

// Use readonly for immutable properties
interface Config {
  readonly apiUrl: string;
  readonly timeout: number;
}

// Use optional chaining and nullish coalescing
const userName = user?.profile?.name ?? 'Anonymous';

// Prefer const assertions
const CONFIG = {
  API_VERSION: 'v1',
  MAX_RETRIES: 3
} as const;
```

### Function Style

```typescript
// Use arrow functions for callbacks and simple functions
const double = (n: number): number => n * 2;

// Use function declarations for top-level functions
function calculateImageScore(metadata: ImageMetadata): number {
  // Complex implementation
  return score;
}

// Use async/await over promises
// Bad
function fetchData() {
  return fetch('/api/data')
    .then(response => response.json())
    .then(data => process(data))
    .catch(error => console.error(error));
}

// Good
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    return process(data);
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// Use default parameters
function createImage(
  url: string,
  options: ImageOptions = {}
): Image {
  // Implementation
}

// Use destructuring
function processImage({ url, width, height }: ImageMetadata) {
  // Implementation
}

// Keep functions small and focused
// Each function should do one thing well
function validateImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
```

### Class Style

```typescript
// Use consistent ordering
export class ImageService {
  // 1. Static properties
  static readonly MAX_CONCURRENT = 5;
  
  // 2. Instance properties
  private readonly http: HttpClient;
  private queue: ImageTask[] = [];
  
  // 3. Constructor
  constructor(
    http: HttpClient,
    private readonly config: ServiceConfig
  ) {
    this.http = http;
  }
  
  // 4. Static methods
  static createDefault(): ImageService {
    return new ImageService(
      new HttpClient(),
      defaultConfig
    );
  }
  
  // 5. Public methods
  async downloadImage(url: string): Promise<Image> {
    // Implementation
  }
  
  // 6. Protected methods
  protected processQueue(): void {
    // Implementation
  }
  
  // 7. Private methods
  private validateUrl(url: string): void {
    // Implementation
  }
}

// Use access modifiers explicitly
class Repository {
  public async find(id: string): Promise<Entity> { }
  protected buildQuery(): Query { }
  private connect(): void { }
}
```

## React/JSX Style

### Component Structure

```tsx
// Functional component with props interface
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  variant = 'primary',
  disabled = false
}) => {
  // Hooks at the top
  const [isHovered, setIsHovered] = useState(false);
  const theme = useTheme();
  
  // Derived state
  const className = `btn btn-${variant} ${isHovered ? 'hovered' : ''}`;
  
  // Event handlers
  const handleClick = useCallback(() => {
    if (!disabled) {
      onClick();
    }
  }, [disabled, onClick]);
  
  // Early returns for edge cases
  if (!label) {
    return null;
  }
  
  // Main render
  return (
    <button
      className={className}
      onClick={handleClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {label}
    </button>
  );
};

// Display name for debugging
Button.displayName = 'Button';
```

### JSX Conventions

```tsx
// Self-closing tags for elements without children
<Image src={url} alt={description} />

// Multi-line props for readability
<ImageGallery
  images={images}
  columns={3}
  spacing={16}
  onImageClick={handleImageClick}
  onLoadMore={handleLoadMore}
/>

// Conditional rendering
{isLoading && <Spinner />}

{error ? (
  <ErrorMessage message={error.message} />
) : (
  <ImageList images={images} />
)}

// Map with keys
{images.map((image) => (
  <ImageCard
    key={image.id}
    image={image}
    onClick={() => handleSelect(image)}
  />
))}

// Fragments for multiple elements
<>
  <Header />
  <Main />
  <Footer />
</>

// Props spreading - use sparingly
const buttonProps = {
  variant: 'primary',
  size: 'large'
};

<Button {...buttonProps} onClick={handleClick} />
```

## CSS/Styling

### CSS Modules

```scss
// ImageCard.module.scss
.container {
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: translateY(-4px);
  }
}

.image {
  width: 100%;
  height: auto;
  object-fit: cover;
}

.title {
  padding: 16px;
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
}

// BEM-like naming for complex components
.card {
  &__header {
    // Header styles
  }
  
  &__body {
    // Body styles
  }
  
  &__footer {
    // Footer styles
  }
  
  &--highlighted {
    // Modifier styles
  }
}
```

### Styled Components

```typescript
import styled from 'styled-components';

// Use descriptive names
export const ImageContainer = styled.div<{ isSelected: boolean }>`
  position: relative;
  border: 2px solid ${props => 
    props.isSelected ? props.theme.colors.primary : 'transparent'
  };
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  
  &:hover {
    border-color: ${props => props.theme.colors.primaryLight};
  }
`;

// Use theme values
export const Title = styled.h3`
  font-size: ${props => props.theme.fontSizes.large};
  color: ${props => props.theme.colors.text};
  margin: 0 0 ${props => props.theme.spacing.medium};
`;

// Compose styles
const BaseButton = styled.button`
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
`;

export const PrimaryButton = styled(BaseButton)`
  background: ${props => props.theme.colors.primary};
  color: white;
  
  &:hover {
    background: ${props => props.theme.colors.primaryDark};
  }
`;
```

## Comments and Documentation

### Code Comments

```typescript
// Use comments to explain "why", not "what"

// Bad - explains what the code does
// Increment counter by 1
counter++;

// Good - explains why
// Increment retry counter to track failed attempts for metrics
retryCount++;

// Use TODO comments with assignee
// TODO(john): Implement caching to improve performance

// Use FIXME for known issues
// FIXME: This causes memory leak in production

// Use NOTE for important information
// NOTE: This must match the backend validation

// Multi-line comments for complex logic
/**
 * Calculate image quality score based on:
 * - Resolution (40% weight)
 * - File size efficiency (30% weight)  
 * - Metadata completeness (30% weight)
 * 
 * Score range: 0-100
 */
function calculateQualityScore(image: Image): number {
  // Implementation
}
```

### JSDoc Comments

```typescript
/**
 * Downloads images from the specified source matching the given criteria.
 * 
 * @param options - Configuration for the download operation
 * @param options.source - The website URL to search for images
 * @param options.query - Search query to find relevant images
 * @param options.count - Maximum number of images to download
 * @returns Promise that resolves with download results
 * 
 * @example
 * ```typescript
 * const results = await downloadImages({
 *   source: 'unsplash.com',
 *   query: 'nature',
 *   count: 10
 * });
 * ```
 * 
 * @throws {ValidationError} If options are invalid
 * @throws {NetworkError} If download fails
 * 
 * @since 1.0.0
 */
export async function downloadImages(
  options: DownloadOptions
): Promise<DownloadResult> {
  // Implementation
}

/**
 * Represents an image with its metadata.
 * 
 * @remarks
 * This interface is used throughout the application
 * for image processing and storage.
 */
export interface Image {
  /** Unique identifier for the image */
  id: string;
  
  /** Source URL of the image */
  url: string;
  
  /** Local file path after download */
  path?: string;
  
  /** Image metadata including dimensions and format */
  metadata: ImageMetadata;
  
  /** Timestamp when the image was processed */
  processedAt: Date;
}
```

## Error Messages

```typescript
// User-friendly error messages
class ValidationError extends Error {
  constructor(field: string, value: any) {
    super(`Invalid ${field}: "${value}" is not a valid value`);
  }
}

// Include context in errors
throw new Error(
  `Failed to download image from ${url}: ${response.statusText}`
);

// Use error codes for programmatic handling
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
  }
}

throw new AppError(
  'Image too large for processing',
  'IMAGE_TOO_LARGE',
  400
);
```

## Git Commit Messages

```bash
# Format: <type>(<scope>): <subject>

# Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- style: Code style changes (formatting, etc)
- refactor: Code refactoring
- test: Test additions or updates
- chore: Build process or auxiliary tool changes

# Examples:
feat(image-service): add batch download capability
fix(websocket): handle reconnection after timeout
docs(api): update authentication examples
style(components): apply consistent formatting
refactor(download): extract retry logic to utility
test(integration): add WebSocket connection tests
chore(deps): upgrade TypeScript to 5.0

# Commit body (optional) - explain why, not what
feat(image-service): add progressive loading support

This improves user experience by showing low-resolution
previews while high-resolution images are downloading.
The implementation uses intersection observer to load
images as they come into viewport.

Closes #123
```

## Import/Export Style

```typescript
// Group imports logically
// 1. Node modules
import fs from 'fs';
import path from 'path';

// 2. External packages
import express from 'express';
import { z } from 'zod';

// 3. Internal modules (absolute paths)
import { ImageService } from '@/services/ImageService';
import { Logger } from '@/utils/logger';

// 4. Internal modules (relative paths)
import { validateRequest } from './middleware';
import { ImageController } from './controllers';

// 5. Types
import type { Request, Response } from 'express';

// Use named exports for utilities
export { formatDate, parseDate } from './dateUtils';

// Use default export for main class/component
export default class ImageProcessor {
  // Implementation
}

// Re-export for public API
export { ImageService } from './services/ImageService';
export type { Image, ImageMetadata } from './types';
```

## Testing Style

```typescript
// Descriptive test names
describe('ImageService', () => {
  describe('downloadImage', () => {
    it('should download and save image from valid URL', async () => {
      // Test implementation
    });
    
    it('should throw ValidationError for invalid URL', async () => {
      // Test implementation
    });
    
    it('should retry failed downloads up to 3 times', async () => {
      // Test implementation
    });
  });
});

// Use beforeEach for setup
beforeEach(() => {
  jest.clearAllMocks();
  // Other setup
});

// Group related tests
describe('when authenticated', () => {
  beforeEach(() => {
    // Auth setup
  });
  
  it('should allow image download', async () => {
    // Test
  });
});

describe('when not authenticated', () => {
  it('should return 401 error', async () => {
    // Test
  });
});
```

## Linting Configuration

### ESLint Rules

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  "rules": {
    "indent": ["error", 2],
    "quotes": ["error", "single"],
    "semi": ["error", "always"],
    "comma-dangle": ["error", "never"],
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["error"],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "react/prop-types": "off"
  }
}
```

### Prettier Configuration

```json
{
  "semi": true,
  "trailingComma": "none",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

## Code Review Checklist

- [ ] Code follows naming conventions
- [ ] Functions are small and focused
- [ ] Complex logic is well-commented
- [ ] Error handling is comprehensive
- [ ] Tests cover edge cases
- [ ] No console.log statements
- [ ] No commented-out code
- [ ] Dependencies are necessary
- [ ] Performance implications considered
- [ ] Security best practices followed

## Resources

- [TypeScript Style Guide](https://basarat.gitbook.io/typescript/styleguide)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- [React Style Guide](https://github.com/airbnb/javascript/tree/master/react)
- [Conventional Commits](https://www.conventionalcommits.org/)