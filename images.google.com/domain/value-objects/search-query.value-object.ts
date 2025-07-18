/**
 * Search Query Value Object
 * 
 * Represents a validated search query with metadata
 */
export class SearchQuery {
  private readonly _query: string;
  private readonly _normalizedQuery: string;
  private readonly _keywords: string[];

  constructor(query: string) {
    this.validateQuery(query);
    this._query = query.trim();
    this._normalizedQuery = this.normalizeQuery(this._query);
    this._keywords = this.extractKeywords(this._normalizedQuery);
  }

  get query(): string {
    return this._query;
  }

  get normalizedQuery(): string {
    return this._normalizedQuery;
  }

  get keywords(): string[] {
    return [...this._keywords];
  }

  get urlEncoded(): string {
    return encodeURIComponent(this._query);
  }

  get filename(): string {
    return this._normalizedQuery.replace(/[^a-zA-Z0-9-_]/g, '_');
  }

  private validateQuery(query: string): void {
    if (!query || typeof query !== 'string') {
      throw new Error('Query must be a non-empty string');
    }

    if (query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }

    if (query.length > 200) {
      throw new Error('Query too long (max 200 characters)');
    }

    // Check for potentially harmful content
    const harmfulPatterns = [
      /script/i,
      /javascript/i,
      /vbscript/i,
      /onload/i,
      /onclick/i,
      /<[^>]*>/,
      /eval\(/i,
      /expression\(/i
    ];

    if (harmfulPatterns.some(pattern => pattern.test(query))) {
      throw new Error('Query contains invalid or potentially harmful content');
    }
  }

  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractKeywords(query: string): string[] {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    
    return query
      .split(' ')
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 10); // Limit to 10 keywords
  }

  equals(other: SearchQuery): boolean {
    return this._normalizedQuery === other._normalizedQuery;
  }

  toString(): string {
    return this._query;
  }
}