/*
                        Semantest - Google Images Domain Errors
                        Domain-specific error types for Google Images functionality

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { DomainError } from './domain.error';

/**
 * Error thrown when image search fails
 */
export class ImageSearchError extends DomainError {
  constructor(
    query: string,
    reason: string,
    originalError?: Error,
    context?: Record<string, any>
  ) {
    super(
      `Failed to search for images with query '${query}': ${reason}`,
      'IMAGE_SEARCH_ERROR',
      'google-images',
      { 
        ...context, 
        query, 
        reason,
        originalError: originalError?.message 
      },
      true,
      503
    );
  }

  getRecoverySuggestions(): string[] {
    return [
      'Check your internet connection',
      'Verify the search query is valid',
      'Try again with different search terms',
      'Check if Google Images is accessible'
    ];
  }
}

/**
 * Error thrown when image download fails
 */
export class ImageDownloadError extends DomainError {
  constructor(
    imageUrl: string,
    reason: string,
    originalError?: Error,
    context?: Record<string, any>
  ) {
    super(
      `Failed to download image from '${imageUrl}': ${reason}`,
      'IMAGE_DOWNLOAD_ERROR',
      'google-images',
      { 
        ...context, 
        imageUrl, 
        reason,
        originalError: originalError?.message 
      },
      true,
      503
    );
  }

  getRecoverySuggestions(): string[] {
    return [
      'Check if the image URL is still valid',
      'Verify you have permission to download this image',
      'Try downloading a different image',
      'Check your network connection'
    ];
  }
}

/**
 * Error thrown when URL resolution fails
 */
export class ImageUrlResolutionError extends DomainError {
  constructor(
    thumbnailUrl: string,
    reason: string,
    context?: Record<string, any>
  ) {
    super(
      `Failed to resolve high-resolution URL from thumbnail: ${reason}`,
      'URL_RESOLUTION_ERROR',
      'google-images',
      { ...context, thumbnailUrl, reason },
      true,
      422
    );
  }

  getRecoverySuggestions(): string[] {
    return [
      'Try a different image',
      'The image format may not be supported',
      'Check if the page structure has changed'
    ];
  }
}

/**
 * Error thrown when no images are found
 */
export class NoImagesFoundError extends DomainError {
  constructor(
    query: string,
    filters?: Record<string, any>,
    context?: Record<string, any>
  ) {
    super(
      `No images found for query '${query}'`,
      'NO_IMAGES_FOUND',
      'google-images',
      { ...context, query, filters },
      true,
      404
    );
  }

  getRecoverySuggestions(): string[] {
    return [
      'Try different search terms',
      'Remove or adjust search filters',
      'Check spelling of your search query',
      'Use more general search terms'
    ];
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends DomainError {
  constructor(
    limit: number,
    resetTime: Date,
    context?: Record<string, any>
  ) {
    super(
      `Rate limit exceeded. Limit: ${limit} requests. Resets at: ${resetTime.toISOString()}`,
      'RATE_LIMIT_EXCEEDED',
      'google-images',
      { ...context, limit, resetTime: resetTime.toISOString() },
      true,
      429
    );
  }

  getRecoverySuggestions(): string[] {
    const resetTime = this.context?.resetTime;
    return [
      `Wait until ${resetTime} before trying again`,
      'Reduce the frequency of your requests',
      'Consider implementing request queuing',
      'Contact support for higher rate limits'
    ];
  }
}

/**
 * Error thrown when browser automation fails
 */
export class GoogleImagesBrowserError extends DomainError {
  constructor(
    operation: string,
    reason: string,
    originalError?: Error,
    context?: Record<string, any>
  ) {
    super(
      `Browser automation failed during ${operation}: ${reason}`,
      'BROWSER_AUTOMATION_ERROR',
      'google-images',
      { 
        ...context, 
        operation, 
        reason,
        originalError: originalError?.message 
      },
      true,
      503
    );
  }

  getRecoverySuggestions(): string[] {
    return [
      'Restart the browser automation service',
      'Check browser configuration',
      'Verify browser dependencies are installed',
      'Try using a different browser adapter'
    ];
  }
}