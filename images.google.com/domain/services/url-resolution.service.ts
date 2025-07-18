import { ImageUrl } from '../value-objects';

/**
 * URL Resolution Service
 * 
 * Domain service for resolving high-resolution image URLs from Google Images
 */
export class UrlResolutionService {
  /**
   * Resolve high-resolution URL from Google Images thumbnail
   */
  async resolveHighResolutionUrl(thumbnailUrl: ImageUrl): Promise<ImageUrl | null> {
    // Check if already high resolution
    if (thumbnailUrl.isHighRes) {
      return thumbnailUrl;
    }

    // Try different resolution strategies
    const strategies = [
      this.tryDataAttributeStrategy,
      this.tryGoogleUrlParsingStrategy,
      this.tryDirectImageStrategy,
      this.tryReverseImageSearchStrategy
    ];

    for (const strategy of strategies) {
      try {
        const resolvedUrl = await strategy.call(this, thumbnailUrl);
        if (resolvedUrl) {
          return resolvedUrl;
        }
      } catch (error) {
        // Continue to next strategy
        console.debug(`URL resolution strategy failed:`, error);
      }
    }

    return null;
  }

  /**
   * Check if URL is a Google Images thumbnail
   */
  isGoogleImagesThumbnail(url: ImageUrl): boolean {
    const thumbnailPatterns = [
      /encrypted-tbn0\.gstatic\.com/,
      /googleusercontent\.com/,
      /google\.com\/images/,
      /gstatic\.com/,
      /yt3\.googleusercontent\.com/
    ];

    return thumbnailPatterns.some(pattern => pattern.test(url.url));
  }

  /**
   * Extract quality score from URL
   */
  getImageQualityScore(url: ImageUrl): number {
    const urlString = url.url;
    let score = 0;

    // Higher score for direct image URLs
    if (this.isDirectImageUrl(url)) {
      score += 50;
    }

    // Higher score for certain domains
    if (urlString.includes('wikimedia.org')) score += 20;
    if (urlString.includes('unsplash.com')) score += 20;
    if (urlString.includes('pexels.com')) score += 20;

    // Lower score for Google proxied URLs
    if (this.isGoogleImagesThumbnail(url)) {
      score -= 30;
    }

    // Check for quality indicators in URL
    if (urlString.includes('_l.jpg') || urlString.includes('_h.jpg')) score += 10;
    if (urlString.includes('quality=')) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Strategy 1: Try extracting from data attributes
   */
  private async tryDataAttributeStrategy(thumbnailUrl: ImageUrl): Promise<ImageUrl | null> {
    // This would typically be implemented with DOM parsing
    // For now, return null as this requires browser context
    return null;
  }

  /**
   * Strategy 2: Parse Google URL structure
   */
  private async tryGoogleUrlParsingStrategy(thumbnailUrl: ImageUrl): Promise<ImageUrl | null> {
    try {
      const url = new URL(thumbnailUrl.url);
      
      // Check for imgurl parameter
      const imgUrl = url.searchParams.get('imgurl');
      if (imgUrl) {
        const decodedUrl = decodeURIComponent(imgUrl);
        if (this.isValidImageUrl(decodedUrl)) {
          return new ImageUrl(decodedUrl, true);
        }
      }

      // Check for imgrefurl parameter (source page)
      const imgRefUrl = url.searchParams.get('imgrefurl');
      if (imgRefUrl) {
        // This would require additional processing to extract image from page
        return null;
      }

      // Try to extract from path segments
      const pathSegments = url.pathname.split('/');
      for (const segment of pathSegments) {
        if (segment.startsWith('http') || this.isValidImageUrl(segment)) {
          try {
            const decodedSegment = decodeURIComponent(segment);
            if (this.isValidImageUrl(decodedSegment)) {
              return new ImageUrl(decodedSegment, true);
            }
          } catch {
            continue;
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Strategy 3: Check if it's already a direct image URL
   */
  private async tryDirectImageStrategy(thumbnailUrl: ImageUrl): Promise<ImageUrl | null> {
    if (this.isDirectImageUrl(thumbnailUrl) && !this.isGoogleImagesThumbnail(thumbnailUrl)) {
      return new ImageUrl(thumbnailUrl.url, true);
    }
    return null;
  }

  /**
   * Strategy 4: Reverse image search (placeholder)
   */
  private async tryReverseImageSearchStrategy(thumbnailUrl: ImageUrl): Promise<ImageUrl | null> {
    // This would implement reverse image search to find original source
    // Complex implementation requiring external services
    return null;
  }

  /**
   * Check if URL is a direct image URL
   */
  private isDirectImageUrl(url: ImageUrl): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.tiff'];
    const lowerUrl = url.url.toLowerCase();
    
    return imageExtensions.some(ext => lowerUrl.includes(ext)) && 
           !this.isGoogleImagesThumbnail(url);
  }

  /**
   * Validate if string is a valid image URL
   */
  private isValidImageUrl(urlString: string): boolean {
    try {
      new URL(urlString);
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.tiff'];
      return imageExtensions.some(ext => urlString.toLowerCase().includes(ext));
    } catch {
      return false;
    }
  }
}