// Unit tests for Value Objects
import { ImageUrl, SearchQuery, ImageMetadata } from '../../domain/value-objects';

describe('Value Objects', () => {
  describe('ImageUrl', () => {
    test('should create valid ImageUrl', () => {
      const url = new ImageUrl('https://example.com/image.jpg');
      expect(url.url).toBe('https://example.com/image.jpg');
      expect(url.extension).toBe('jpg');
      expect(url.domain).toBe('example.com');
    });

    test('should throw error for invalid URL', () => {
      expect(() => new ImageUrl('invalid-url')).toThrow('Invalid URL format');
    });

    test('should throw error for non-image URL', () => {
      expect(() => new ImageUrl('https://example.com/document.pdf')).toThrow('URL does not point to an image');
    });
  });

  describe('SearchQuery', () => {
    test('should create valid SearchQuery', () => {
      const query = new SearchQuery('mountain landscape');
      expect(query.query).toBe('mountain landscape');
      expect(query.normalizedQuery).toBe('mountain landscape');
      expect(query.keywords).toEqual(['mountain', 'landscape']);
    });

    test('should normalize query', () => {
      const query = new SearchQuery('Mountain  LANDSCAPE!!!');
      expect(query.normalizedQuery).toBe('mountain landscape');
    });

    test('should throw error for empty query', () => {
      expect(() => new SearchQuery('')).toThrow('Query cannot be empty');
    });

    test('should throw error for malicious query', () => {
      expect(() => new SearchQuery('<script>alert("xss")</script>')).toThrow('Query contains invalid or potentially harmful content');
    });
  });

  describe('ImageMetadata', () => {
    test('should create valid ImageMetadata', () => {
      const metadata = new ImageMetadata(1920, 1080, 'jpg', 1024000, 'Mountain view', 'Beautiful mountain');
      expect(metadata.width).toBe(1920);
      expect(metadata.height).toBe(1080);
      expect(metadata.format).toBe('jpg');
      expect(metadata.isHighResolution).toBe(true);
      expect(metadata.isLandscape).toBe(true);
      expect(metadata.aspectRatio).toBeCloseTo(1.78);
    });

    test('should throw error for invalid dimensions', () => {
      expect(() => new ImageMetadata(0, 1080, 'jpg')).toThrow('Dimensions must be positive');
      expect(() => new ImageMetadata(1920, -1080, 'jpg')).toThrow('Dimensions must be positive');
    });

    test('should throw error for invalid format', () => {
      expect(() => new ImageMetadata(1920, 1080, 'invalid')).toThrow('Unsupported format');
    });

    test('should format file size correctly', () => {
      const metadata = new ImageMetadata(1920, 1080, 'jpg', 1024000);
      expect(metadata.fileSizeFormatted).toBe('1000.0 KB');
    });
  });
});