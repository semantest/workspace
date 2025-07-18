/**
 * Image URL Value Object
 * 
 * Represents a validated image URL with metadata
 */
export class ImageUrl {
  private readonly _url: string;
  private readonly _isHighRes: boolean;
  private readonly _extension: string;

  constructor(url: string, isHighRes: boolean = false) {
    this.validateUrl(url);
    this._url = url;
    this._isHighRes = isHighRes;
    this._extension = this.extractExtension(url);
  }

  get url(): string {
    return this._url;
  }

  get isHighRes(): boolean {
    return this._isHighRes;
  }

  get extension(): string {
    return this._extension;
  }

  get domain(): string {
    try {
      return new URL(this._url).hostname;
    } catch {
      return '';
    }
  }

  private validateUrl(url: string): void {
    if (!url || typeof url !== 'string') {
      throw new Error('URL must be a non-empty string');
    }

    try {
      new URL(url);
    } catch {
      throw new Error('Invalid URL format');
    }

    if (!this.isImageUrl(url)) {
      throw new Error('URL does not point to an image');
    }
  }

  private isImageUrl(url: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const lowerUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowerUrl.includes(ext));
  }

  private extractExtension(url: string): string {
    const match = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
    return match ? match[1] : 'jpg';
  }

  equals(other: ImageUrl): boolean {
    return this._url === other._url;
  }

  toString(): string {
    return this._url;
  }
}