import { SearchQuery, ImageUrl, ImageMetadata } from '../../domain/value-objects';
import { GoogleImagesRepository, ImageSearchResult } from '../../domain/repositories';
import { UrlResolutionService } from '../../domain/services';

/**
 * Google Images Search Service
 * 
 * Application service for handling Google Images search operations
 */
export class GoogleImagesSearchService {
  constructor(
    private readonly repository: GoogleImagesRepository,
    private readonly urlResolutionService: UrlResolutionService
  ) {}

  /**
   * Search for images with the given query
   */
  async searchImages(queryString: string, options: SearchOptions = {}): Promise<SearchResult> {
    try {
      // Validate and create search query
      const searchQuery = new SearchQuery(queryString);
      
      // Set default options
      const searchOptions = {
        limit: options.limit || 10,
        highResOnly: options.highResOnly || false,
        minWidth: options.minWidth || 0,
        minHeight: options.minHeight || 0,
        formats: options.formats || ['jpg', 'jpeg', 'png', 'gif', 'webp']
      };

      // Perform search
      const results = await this.repository.searchImages(searchQuery, searchOptions.limit);

      // Filter results based on options
      const filteredResults = await this.filterResults(results, searchOptions);

      // Resolve high-resolution URLs if needed
      const resolvedResults = searchOptions.highResOnly 
        ? await this.resolveHighResolutionUrls(filteredResults)
        : filteredResults;

      return {
        query: searchQuery,
        results: resolvedResults,
        totalFound: results.length,
        filteredCount: resolvedResults.length,
        searchedAt: new Date()
      };

    } catch (error) {
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get image suggestions based on query
   */
  async getImageSuggestions(queryString: string): Promise<string[]> {
    try {
      const searchQuery = new SearchQuery(queryString);
      const suggestions = [];

      // Generate suggestions based on keywords
      const keywords = searchQuery.keywords;
      
      // Add related terms
      suggestions.push(...keywords.map(keyword => `${keyword} hd`));
      suggestions.push(...keywords.map(keyword => `${keyword} wallpaper`));
      suggestions.push(...keywords.map(keyword => `${keyword} photo`));

      // Add combinations
      if (keywords.length > 1) {
        suggestions.push(keywords.slice(0, 2).join(' '));
      }

      return suggestions.slice(0, 10);

    } catch (error) {
      return [];
    }
  }

  /**
   * Filter search results based on options
   */
  private async filterResults(results: ImageSearchResult[], options: SearchOptions): Promise<ImageSearchResult[]> {
    return results.filter(result => {
      // Filter by dimensions
      if (options.minWidth && result.metadata.width < options.minWidth) {
        return false;
      }
      if (options.minHeight && result.metadata.height < options.minHeight) {
        return false;
      }

      // Filter by format
      if (options.formats && !options.formats.includes(result.metadata.format)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Resolve high-resolution URLs for results
   */
  private async resolveHighResolutionUrls(results: ImageSearchResult[]): Promise<ImageSearchResult[]> {
    const resolvedResults = [];

    for (const result of results) {
      try {
        const highResUrl = await this.urlResolutionService.resolveHighResolutionUrl(result.imageUrl);
        
        if (highResUrl) {
          resolvedResults.push({
            ...result,
            imageUrl: highResUrl
          });
        }
      } catch (error) {
        // Skip images that can't be resolved
        console.debug(`Failed to resolve high-res URL for ${result.imageUrl.url}:`, error);
      }
    }

    return resolvedResults;
  }
}

/**
 * Search Options
 */
export interface SearchOptions {
  limit?: number;
  highResOnly?: boolean;
  minWidth?: number;
  minHeight?: number;
  formats?: string[];
}

/**
 * Search Result
 */
export interface SearchResult {
  query: SearchQuery;
  results: ImageSearchResult[];
  totalFound: number;
  filteredCount: number;
  searchedAt: Date;
}