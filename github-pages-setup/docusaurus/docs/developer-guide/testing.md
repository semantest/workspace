---
id: testing
title: Testing Guide
sidebar_label: Testing
---

# Testing Guide

This guide covers testing practices, patterns, and tools used in the Semantest project. We follow Test-Driven Development (TDD) principles and maintain high test coverage standards.

## Testing Philosophy

### Test-Driven Development (TDD)

We follow the Red-Green-Refactor cycle:

1. **Red**: Write a failing test
2. **Green**: Write minimal code to pass
3. **Refactor**: Improve code while keeping tests green

```typescript
// 1. Red - Write failing test
describe('ImageDownloadQueue', () => {
  it('should prioritize high-priority downloads', () => {
    const queue = new ImageDownloadQueue();
    queue.add({ url: 'url1', priority: 'normal' });
    queue.add({ url: 'url2', priority: 'high' });
    
    expect(queue.next().priority).toBe('high');
  });
});

// 2. Green - Implement minimal solution
class ImageDownloadQueue {
  private items: QueueItem[] = [];
  
  add(item: QueueItem) {
    this.items.push(item);
    this.items.sort((a, b) => 
      a.priority === 'high' ? -1 : 1
    );
  }
  
  next() {
    return this.items.shift();
  }
}

// 3. Refactor - Improve implementation
class ImageDownloadQueue {
  private items = new PriorityQueue<QueueItem>(
    (a, b) => this.comparePriority(a, b)
  );
  
  // Better implementation...
}
```

## Test Structure

### Test Organization

```
packages/
├── chrome-extension/
│   ├── src/
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── e2e/
├── server/
│   ├── src/
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── fixtures/
└── sdk/
    ├── src/
    └── tests/
        ├── unit/
        └── integration/
```

### Test File Naming

```typescript
// Source file: src/services/ImageDownloader.ts
// Test file:   tests/unit/services/ImageDownloader.test.ts

// Source file: src/api/routes/download.ts  
// Test file:   tests/integration/api/download.test.ts
```

## Unit Testing

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Writing Unit Tests

```typescript
import { ImageSelector } from '../src/services/ImageSelector';

describe('ImageSelector', () => {
  let selector: ImageSelector;
  
  beforeEach(() => {
    selector = new ImageSelector();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('selectBestImage', () => {
    it('should select image with highest resolution', () => {
      // Arrange
      const images = [
        { url: 'img1.jpg', width: 800, height: 600 },
        { url: 'img2.jpg', width: 1920, height: 1080 },
        { url: 'img3.jpg', width: 1024, height: 768 }
      ];
      
      // Act
      const result = selector.selectBestImage(images);
      
      // Assert
      expect(result.url).toBe('img2.jpg');
      expect(result.width).toBe(1920);
    });
    
    it('should handle empty image array', () => {
      expect(() => selector.selectBestImage([]))
        .toThrow('No images provided');
    });
    
    it('should filter out invalid images', () => {
      const images = [
        { url: 'img1.jpg', width: 0, height: 600 },
        { url: 'img2.jpg', width: 800, height: 600 }
      ];
      
      const result = selector.selectBestImage(images);
      expect(result.url).toBe('img2.jpg');
    });
  });
});
```

### Mocking

```typescript
// Mock external dependencies
jest.mock('axios');
import axios from 'axios';

describe('ImageDownloader', () => {
  it('should download image from URL', async () => {
    // Arrange
    const mockAxios = axios as jest.Mocked<typeof axios>;
    mockAxios.get.mockResolvedValue({
      data: Buffer.from('image-data'),
      headers: { 'content-type': 'image/jpeg' }
    });
    
    const downloader = new ImageDownloader();
    
    // Act
    const result = await downloader.download('http://example.com/image.jpg');
    
    // Assert
    expect(mockAxios.get).toHaveBeenCalledWith(
      'http://example.com/image.jpg',
      { responseType: 'arraybuffer' }
    );
    expect(result.data).toBeInstanceOf(Buffer);
  });
});
```

## Integration Testing

### Database Testing

```typescript
import { DatabaseTestUtils } from '../utils/DatabaseTestUtils';
import { ImageRepository } from '../../src/repositories/ImageRepository';

describe('ImageRepository Integration', () => {
  let repository: ImageRepository;
  let dbUtils: DatabaseTestUtils;
  
  beforeAll(async () => {
    dbUtils = new DatabaseTestUtils();
    await dbUtils.setup();
    repository = new ImageRepository(dbUtils.connection);
  });
  
  afterAll(async () => {
    await dbUtils.teardown();
  });
  
  beforeEach(async () => {
    await dbUtils.clear();
  });
  
  it('should save and retrieve image metadata', async () => {
    // Arrange
    const imageData = {
      url: 'http://example.com/image.jpg',
      filename: 'image.jpg',
      size: 1024000,
      metadata: {
        width: 1920,
        height: 1080,
        format: 'jpeg'
      }
    };
    
    // Act
    const saved = await repository.save(imageData);
    const retrieved = await repository.findById(saved.id);
    
    // Assert
    expect(retrieved).toMatchObject(imageData);
    expect(retrieved.id).toBeDefined();
    expect(retrieved.createdAt).toBeInstanceOf(Date);
  });
});
```

### API Testing

```typescript
import request from 'supertest';
import { app } from '../../src/app';
import { TestServer } from '../utils/TestServer';

describe('Download API Integration', () => {
  let server: TestServer;
  
  beforeAll(async () => {
    server = new TestServer(app);
    await server.start();
  });
  
  afterAll(async () => {
    await server.stop();
  });
  
  describe('POST /api/download', () => {
    it('should initiate image download', async () => {
      // Arrange
      const downloadRequest = {
        source: 'test.com',
        query: 'sunset',
        count: 5
      };
      
      // Act
      const response = await request(app)
        .post('/api/download')
        .send(downloadRequest)
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Assert
      expect(response.body).toMatchObject({
        success: true,
        jobId: expect.any(String),
        status: 'queued'
      });
    });
    
    it('should validate request parameters', async () => {
      const response = await request(app)
        .post('/api/download')
        .send({ invalid: 'data' })
        .expect(400);
      
      expect(response.body.error).toContain('validation');
    });
  });
});
```

## End-to-End Testing

### Playwright Setup

```typescript
// playwright.config.ts
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 2,
  workers: 4,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    }
  ]
};

export default config;
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';
import { SemantestTestHelper } from '../helpers/SemantestTestHelper';

test.describe('Image Download E2E', () => {
  let helper: SemantestTestHelper;
  
  test.beforeEach(async ({ page }) => {
    helper = new SemantestTestHelper(page);
    await helper.installExtension();
    await helper.navigateToTestSite();
  });
  
  test('should download images through voice command', async ({ page }) => {
    // Start recording
    await helper.clickMicrophoneButton();
    
    // Simulate voice command
    await helper.simulateVoiceCommand('Download sunset images');
    
    // Wait for processing
    await expect(page.locator('.status')).toContainText('Processing');
    
    // Verify download started
    await expect(page.locator('.download-progress')).toBeVisible();
    
    // Wait for completion
    await page.waitForSelector('.download-complete', {
      timeout: 30000
    });
    
    // Verify results
    const downloads = await helper.getDownloadedImages();
    expect(downloads).toHaveLength(5);
    expect(downloads[0]).toMatchObject({
      filename: expect.stringMatching(/sunset.*\.(jpg|png)$/),
      size: expect.any(Number)
    });
  });
});
```

## Test Utilities

### Test Builders

```typescript
// Test data builders using Builder pattern
export class ImageMetadataBuilder {
  private metadata: Partial<ImageMetadata> = {
    width: 1920,
    height: 1080,
    format: 'jpeg',
    size: 1024000
  };
  
  withDimensions(width: number, height: number) {
    this.metadata.width = width;
    this.metadata.height = height;
    return this;
  }
  
  withFormat(format: string) {
    this.metadata.format = format;
    return this;
  }
  
  withSize(size: number) {
    this.metadata.size = size;
    return this;
  }
  
  build(): ImageMetadata {
    return this.metadata as ImageMetadata;
  }
}

// Usage in tests
const metadata = new ImageMetadataBuilder()
  .withDimensions(3840, 2160)
  .withFormat('png')
  .build();
```

### Test Fixtures

```typescript
// fixtures/images.ts
export const testImages = {
  highQuality: {
    url: 'http://example.com/hq.jpg',
    width: 3840,
    height: 2160,
    format: 'jpeg',
    size: 5242880
  },
  mediumQuality: {
    url: 'http://example.com/mq.jpg',
    width: 1920,
    height: 1080,
    format: 'jpeg',
    size: 2097152
  },
  lowQuality: {
    url: 'http://example.com/lq.jpg',
    width: 800,
    height: 600,
    format: 'jpeg',
    size: 524288
  }
};

// fixtures/commands.ts
export const testCommands = {
  downloadSingle: {
    type: 'DOWNLOAD_IMAGE',
    target: { url: 'http://example.com/image.jpg' },
    options: { quality: 'high' }
  },
  downloadMultiple: {
    type: 'DOWNLOAD_IMAGES',
    target: { selector: 'img.gallery' },
    options: { count: 5, quality: 'medium' }
  }
};
```

### Custom Matchers

```typescript
// matchers/imageMatchers.ts
expect.extend({
  toBeValidImageUrl(received: string) {
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const hasValidExtension = validExtensions.some(ext => 
      received.toLowerCase().endsWith(ext)
    );
    
    const isValidUrl = /^https?:\/\/.+/.test(received);
    
    return {
      pass: isValidUrl && hasValidExtension,
      message: () => 
        `expected ${received} to be a valid image URL`
    };
  },
  
  toHaveImageDimensions(
    received: any, 
    width: number, 
    height: number
  ) {
    const pass = 
      received.width === width && 
      received.height === height;
    
    return {
      pass,
      message: () =>
        `expected image to have dimensions ${width}x${height}, ` +
        `but got ${received.width}x${received.height}`
    };
  }
});

// Usage
expect(imageUrl).toBeValidImageUrl();
expect(metadata).toHaveImageDimensions(1920, 1080);
```

## Performance Testing

### Load Testing

```typescript
import { performance } from 'perf_hooks';

describe('Performance Tests', () => {
  it('should handle 100 concurrent downloads', async () => {
    const startTime = performance.now();
    const promises = Array(100).fill(null).map((_, i) => 
      downloader.download(`http://example.com/image${i}.jpg`)
    );
    
    const results = await Promise.allSettled(promises);
    const endTime = performance.now();
    
    const successful = results.filter(r => r.status === 'fulfilled');
    const duration = endTime - startTime;
    
    expect(successful.length).toBeGreaterThan(95); // 95% success rate
    expect(duration).toBeLessThan(30000); // Under 30 seconds
  });
  
  it('should maintain response time under load', async () => {
    const responseTimes: number[] = [];
    
    for (let i = 0; i < 50; i++) {
      const start = performance.now();
      await client.execute('PING');
      const end = performance.now();
      
      responseTimes.push(end - start);
    }
    
    const avgResponseTime = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
    const p95ResponseTime = responseTimes.sort()[Math.floor(responseTimes.length * 0.95)];
    
    expect(avgResponseTime).toBeLessThan(100); // Avg under 100ms
    expect(p95ResponseTime).toBeLessThan(200); // P95 under 200ms
  });
});
```

## Test Coverage

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# Generate HTML report
npm run test:coverage -- --coverageReporters=html

# Check coverage thresholds
npm run test:coverage -- --coverageThreshold='{
  "global": {
    "branches": 80,
    "functions": 80,
    "lines": 80,
    "statements": 80
  }
}'
```

### Coverage Requirements

- **Global**: Minimum 80% coverage
- **Critical Paths**: 100% coverage required
- **Public APIs**: 100% coverage required
- **Utilities**: 90% coverage required

## Continuous Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

## Test Debugging

### Debugging Tests

```typescript
// Add debugging output
test('complex scenario', async () => {
  console.log('Starting test...');
  
  const result = await complexOperation();
  console.log('Result:', JSON.stringify(result, null, 2));
  
  // Use debugger
  debugger;
  
  expect(result).toBeDefined();
});

// Run with debugging
// node --inspect-brk ./node_modules/.bin/jest --runInBand
```

### Visual Debugging

```typescript
// For E2E tests - pause execution
test('visual debugging', async ({ page }) => {
  await page.goto('/');
  
  // Pause here - browser stays open
  await page.pause();
  
  await page.click('button');
});
```

## Best Practices

### Do's

1. ✅ Write tests before code (TDD)
2. ✅ Keep tests simple and focused
3. ✅ Use descriptive test names
4. ✅ Test one thing at a time
5. ✅ Use test builders for complex data
6. ✅ Mock external dependencies
7. ✅ Clean up after tests

### Don'ts

1. ❌ Don't test implementation details
2. ❌ Don't use production data
3. ❌ Don't skip failing tests
4. ❌ Don't rely on test order
5. ❌ Don't use hard-coded waits
6. ❌ Don't ignore flaky tests
7. ❌ Don't duplicate test logic

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [TDD Guide](https://martinfowler.com/bliki/TestDrivenDevelopment.html)