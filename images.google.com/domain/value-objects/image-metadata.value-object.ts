/**
 * Image Metadata Value Object
 * 
 * Represents metadata about an image including dimensions, format, and source
 */
export class ImageMetadata {
  private readonly _width: number;
  private readonly _height: number;
  private readonly _format: string;
  private readonly _fileSize: number;
  private readonly _altText: string;
  private readonly _title: string;
  private readonly _sourceUrl: string;

  constructor(
    width: number,
    height: number,
    format: string,
    fileSize: number = 0,
    altText: string = '',
    title: string = '',
    sourceUrl: string = ''
  ) {
    this.validateDimensions(width, height);
    this.validateFormat(format);
    this.validateFileSize(fileSize);

    this._width = width;
    this._height = height;
    this._format = format.toLowerCase();
    this._fileSize = fileSize;
    this._altText = altText.trim();
    this._title = title.trim();
    this._sourceUrl = sourceUrl.trim();
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  get format(): string {
    return this._format;
  }

  get fileSize(): number {
    return this._fileSize;
  }

  get altText(): string {
    return this._altText;
  }

  get title(): string {
    return this._title;
  }

  get sourceUrl(): string {
    return this._sourceUrl;
  }

  get aspectRatio(): number {
    return this._height > 0 ? this._width / this._height : 1;
  }

  get isHighResolution(): boolean {
    return this._width >= 1920 && this._height >= 1080;
  }

  get isSquare(): boolean {
    return Math.abs(this._width - this._height) < 10;
  }

  get isLandscape(): boolean {
    return this._width > this._height;
  }

  get isPortrait(): boolean {
    return this._height > this._width;
  }

  get fileSizeFormatted(): string {
    if (this._fileSize === 0) return 'Unknown';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = this._fileSize;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  private validateDimensions(width: number, height: number): void {
    if (!Number.isInteger(width) || !Number.isInteger(height)) {
      throw new Error('Dimensions must be integers');
    }

    if (width <= 0 || height <= 0) {
      throw new Error('Dimensions must be positive');
    }

    if (width > 50000 || height > 50000) {
      throw new Error('Dimensions too large (max 50000px)');
    }
  }

  private validateFormat(format: string): void {
    if (!format || typeof format !== 'string') {
      throw new Error('Format must be a non-empty string');
    }

    const validFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'tiff'];
    if (!validFormats.includes(format.toLowerCase())) {
      throw new Error(`Unsupported format: ${format}. Supported formats: ${validFormats.join(', ')}`);
    }
  }

  private validateFileSize(fileSize: number): void {
    if (fileSize < 0) {
      throw new Error('File size cannot be negative');
    }

    if (fileSize > 100 * 1024 * 1024) { // 100MB
      throw new Error('File size too large (max 100MB)');
    }
  }

  equals(other: ImageMetadata): boolean {
    return (
      this._width === other._width &&
      this._height === other._height &&
      this._format === other._format &&
      this._fileSize === other._fileSize &&
      this._altText === other._altText &&
      this._title === other._title &&
      this._sourceUrl === other._sourceUrl
    );
  }

  toString(): string {
    return `${this._width}x${this._height} ${this._format.toUpperCase()} (${this.fileSizeFormatted})`;
  }
}