/*
                        Semantest - Google Images Error Tests
                        Tests for Google Images domain-specific error types

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import {
  ImageSearchError,
  ImageDownloadError,
  ImageUrlResolutionError,
  NoImagesFoundError,
  RateLimitError,
  GoogleImagesBrowserError
} from './google-images.error';

describe('Google Images Error Types', () => {
  describe('ImageSearchError', () => {
    it('should create error with query and reason', () => {
      const error = new ImageSearchError('cats', 'Network timeout');
      
      expect(error.message).toBe('Failed to search images for query "cats": Network timeout');
      expect(error.code).toBe('GOOGLE-IMAGES_IMAGE_SEARCH_ERROR');
      expect(error.statusCode).toBe(503);
      expect(error.recoverable).toBe(true);
      expect(error.context).toEqual({
        domain: 'google-images',
        query: 'cats',
        reason: 'Network timeout'
      });
    });

    it('should include original error in context', () => {
      const originalError = new Error('ECONNREFUSED');
      const error = new ImageSearchError(
        'dogs',
        'Connection refused',
        originalError
      );
      
      expect(error.context?.originalError).toBe('ECONNREFUSED');
    });

    it('should include custom context', () => {
      const error = new ImageSearchError(
        'birds',
        'Rate limited',
        undefined,
        { retryAfter: 60, requestId: 'abc123' }
      );
      
      expect(error.context).toMatchObject({
        retryAfter: 60,
        requestId: 'abc123'
      });
    });

    it('should provide recovery suggestions', () => {
      const error = new ImageSearchError('flowers', 'Timeout');
      const suggestions = error.getRecoverySuggestions();
      
      expect(suggestions).toContain('Check your internet connection');
      expect(suggestions).toContain('Try a different search query');
      expect(suggestions).toContain('Retry the search after a few seconds');
      expect(suggestions).toContain('Check if Google Images is accessible');
    });
  });

  describe('ImageDownloadError', () => {
    it('should create error with URL and reason', () => {
      const url = 'https://example.com/image.jpg';
      const error = new ImageDownloadError(url, 'HTTP 404');
      
      expect(error.message).toBe(`Failed to download image from ${url}: HTTP 404`);
      expect(error.code).toBe('GOOGLE-IMAGES_IMAGE_DOWNLOAD_ERROR');
      expect(error.statusCode).toBe(503);
      expect(error.context?.url).toBe(url);
    });

    it('should provide download-specific recovery suggestions', () => {
      const error = new ImageDownloadError('https://test.com/img.png', 'Timeout');
      const suggestions = error.getRecoverySuggestions();
      
      expect(suggestions).toContain('Check if the image URL is still valid');
      expect(suggestions).toContain('Try downloading from a different source');
      expect(suggestions).toContain('Verify your network connection');
      expect(suggestions).toContain('Check if the server is rate limiting requests');
    });
  });

  describe('ImageUrlResolutionError', () => {
    it('should create error for URL resolution failures', () => {
      const thumbnailUrl = 'https://example.com/thumb.jpg';
      const error = new ImageUrlResolutionError(
        thumbnailUrl,
        'Failed to extract full resolution URL'
      );
      
      expect(error.message).toContain(thumbnailUrl);
      expect(error.code).toBe('GOOGLE-IMAGES_IMAGE_URL_RESOLUTION_ERROR');
      expect(error.statusCode).toBe(503);
      expect(error.context?.thumbnailUrl).toBe(thumbnailUrl);
    });

    it('should provide URL resolution recovery suggestions', () => {
      const error = new ImageUrlResolutionError('https://test.com/t.jpg', 'Parse error');
      const suggestions = error.getRecoverySuggestions();
      
      expect(suggestions).toContain('Try using the thumbnail URL directly');
      expect(suggestions).toContain('Search for alternative versions of the image');
      expect(suggestions).toContain('Check if the image source has changed structure');
    });
  });

  describe('NoImagesFoundError', () => {
    it('should create error for empty search results', () => {
      const error = new NoImagesFoundError('very specific query');
      
      expect(error.message).toBe('No images found for query "very specific query"');
      expect(error.code).toBe('GOOGLE-IMAGES_NO_IMAGES_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.recoverable).toBe(true);
    });

    it('should include search filters in context', () => {
      const filters = { size: 'large', color: 'red', type: 'photo' };
      const error = new NoImagesFoundError('red car', filters);
      
      expect(error.context?.filters).toEqual(filters);
    });

    it('should provide search refinement suggestions', () => {
      const error = new NoImagesFoundError('specific term');
      const suggestions = error.getRecoverySuggestions();
      
      expect(suggestions).toContain('Try using more general search terms');
      expect(suggestions).toContain('Remove or adjust search filters');
      expect(suggestions).toContain('Check spelling and try alternative keywords');
      expect(suggestions).toContain('Try searching in a different language');
    });
  });

  describe('RateLimitError', () => {
    it('should create error with retry limit', () => {
      const error = new RateLimitError(100);
      
      expect(error.message).toBe('Rate limit exceeded. Maximum 100 requests allowed.');
      expect(error.code).toBe('GOOGLE-IMAGES_RATE_LIMIT_ERROR');
      expect(error.statusCode).toBe(429);
      expect(error.context?.limit).toBe(100);
    });

    it('should include reset time if provided', () => {
      const resetTime = new Date(Date.now() + 3600000); // 1 hour from now
      const error = new RateLimitError(50, resetTime);
      
      expect(error.context?.resetTime).toBe(resetTime.toISOString());
      expect(error.getRecoverySuggestions()[0]).toContain(resetTime.toISOString());
    });

    it('should provide rate limit recovery suggestions', () => {
      const error = new RateLimitError(200);
      const suggestions = error.getRecoverySuggestions();
      
      expect(suggestions).toContain('Implement request throttling');
      expect(suggestions).toContain('Use caching to reduce requests');
      expect(suggestions).toContain('Consider upgrading your API limits');
    });
  });

  describe('GoogleImagesBrowserError', () => {
    it('should create browser automation error', () => {
      const error = new GoogleImagesBrowserError(
        'Element not found',
        'search'
      );
      
      expect(error.message).toBe('Browser automation failed: Element not found');
      expect(error.code).toBe('GOOGLE-IMAGES_BROWSER_ERROR');
      expect(error.statusCode).toBe(503);
      expect(error.context?.operation).toBe('search');
    });

    it('should include browser details in context', () => {
      const browserDetails = { 
        browser: 'Chrome',
        version: '120.0',
        headless: true 
      };
      const error = new GoogleImagesBrowserError(
        'Page crash',
        'navigate',
        browserDetails
      );
      
      expect(error.context?.browserDetails).toEqual(browserDetails);
    });

    it('should provide browser-specific recovery suggestions', () => {
      const error = new GoogleImagesBrowserError('Timeout', 'click');
      const suggestions = error.getRecoverySuggestions();
      
      expect(suggestions).toContain('Restart the browser instance');
      expect(suggestions).toContain('Clear browser cache and cookies');
      expect(suggestions).toContain('Try with a different browser configuration');
      expect(suggestions).toContain('Check if the website structure has changed');
      expect(suggestions).toContain('Increase timeout values for slow operations');
    });
  });

  describe('Error serialization', () => {
    it('should serialize all error types correctly', () => {
      const errors = [
        new ImageSearchError('test', 'reason'),
        new ImageDownloadError('http://test.com', 'failed'),
        new ImageUrlResolutionError('http://thumb.com', 'parse error'),
        new NoImagesFoundError('query'),
        new RateLimitError(100),
        new GoogleImagesBrowserError('crash', 'navigate')
      ];

      errors.forEach(error => {
        const json = error.toJSON();
        expect(json).toHaveProperty('name');
        expect(json).toHaveProperty('message');
        expect(json).toHaveProperty('code');
        expect(json).toHaveProperty('timestamp');
        expect(json).toHaveProperty('context');
        expect(json).toHaveProperty('recoverable');
        expect(json).toHaveProperty('statusCode');
      });
    });
  });

  describe('Error inheritance', () => {
    it('should all be instances of Error and SemantestError', () => {
      const errors = [
        new ImageSearchError('test', 'reason'),
        new ImageDownloadError('http://test.com', 'failed'),
        new ImageUrlResolutionError('http://thumb.com', 'parse error'),
        new NoImagesFoundError('query'),
        new RateLimitError(100),
        new GoogleImagesBrowserError('crash', 'navigate')
      ];

      errors.forEach(error => {
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toMatch(/Error$/);
        expect(error.stack).toBeDefined();
      });
    });
  });
});