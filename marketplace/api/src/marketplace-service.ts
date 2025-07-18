import { Entity, DomainEvent, ValueObject } from '@semantest/core';
import { 
  Package, 
  Publisher, 
  User, 
  Review, 
  Transaction,
  SearchCriteria,
  PublishOptions
} from './types';

/**
 * Core marketplace service for package management
 */
export class MarketplaceService extends Entity<MarketplaceService> {
  private packages: Map<string, Package> = new Map();
  private publishers: Map<string, Publisher> = new Map();
  
  constructor(
    private readonly config: MarketplaceConfig
  ) {
    super();
  }

  /**
   * Search for packages in the marketplace
   */
  async searchPackages(criteria: SearchCriteria): Promise<SearchResult> {
    const startTime = Date.now();
    
    // Apply filters
    let results = Array.from(this.packages.values());
    
    if (criteria.query) {
      results = this.filterByQuery(results, criteria.query);
    }
    
    if (criteria.category) {
      results = results.filter(pkg => pkg.category === criteria.category);
    }
    
    if (criteria.tags && criteria.tags.length > 0) {
      results = results.filter(pkg => 
        criteria.tags!.some(tag => pkg.tags.includes(tag))
      );
    }
    
    if (criteria.minRating) {
      results = results.filter(pkg => pkg.rating >= criteria.minRating!);
    }
    
    if (criteria.priceRange) {
      results = this.filterByPrice(results, criteria.priceRange);
    }
    
    // Sort results
    results = this.sortPackages(results, criteria.sortBy || 'relevance');
    
    // Paginate
    const total = results.length;
    const page = criteria.page || 1;
    const limit = criteria.limit || 20;
    const startIndex = (page - 1) * limit;
    
    results = results.slice(startIndex, startIndex + limit);
    
    this.addDomainEvent(new PackagesSearched({
      correlationId: this.generateCorrelationId(),
      criteria,
      resultCount: results.length,
      timestamp: new Date()
    }));
    
    return {
      packages: results,
      total,
      page,
      limit,
      executionTime: Date.now() - startTime
    };
  }

  /**
   * Get detailed package information
   */
  async getPackage(packageId: string): Promise<Package | null> {
    const pkg = this.packages.get(packageId);
    
    if (!pkg) {
      return null;
    }
    
    // Increment view count
    pkg.stats.views++;
    
    // Load additional details
    const publisher = await this.getPublisher(pkg.publisherId);
    const reviews = await this.getPackageReviews(packageId);
    
    return {
      ...pkg,
      publisher,
      reviews: reviews.slice(0, 5), // Top 5 reviews
      reviewCount: reviews.length
    };
  }

  /**
   * Install a package
   */
  async installPackage(
    packageId: string,
    userId: string,
    options?: InstallOptions
  ): Promise<InstallResult> {
    const pkg = await this.getPackage(packageId);
    
    if (!pkg) {
      throw new Error(`Package ${packageId} not found`);
    }
    
    // Check if already installed
    const existingInstall = await this.checkExistingInstall(userId, packageId);
    if (existingInstall && !options?.force) {
      return {
        success: false,
        message: 'Package already installed',
        version: existingInstall.version
      };
    }
    
    // Handle payment if required
    if (pkg.pricing.type !== 'free') {
      const paymentResult = await this.processPayment(pkg, userId);
      if (!paymentResult.success) {
        return {
          success: false,
          message: 'Payment failed',
          error: paymentResult.error
        };
      }
    }
    
    // Download and install
    const downloadUrl = await this.generateDownloadUrl(pkg, userId);
    
    // Update statistics
    pkg.stats.downloads++;
    pkg.stats.activeInstalls++;
    
    this.addDomainEvent(new PackageInstalled({
      correlationId: this.generateCorrelationId(),
      packageId,
      userId,
      version: pkg.version,
      timestamp: new Date()
    }));
    
    return {
      success: true,
      message: 'Package installed successfully',
      version: pkg.version,
      downloadUrl
    };
  }

  /**
   * Publish a new package
   */
  async publishPackage(
    publisherId: string,
    packageData: PackageData,
    options?: PublishOptions
  ): Promise<PublishResult> {
    // Validate publisher
    const publisher = await this.validatePublisher(publisherId);
    if (!publisher.verified && packageData.pricing.type !== 'free') {
      throw new Error('Only verified publishers can publish paid packages');
    }
    
    // Validate package
    const validation = await this.validatePackage(packageData);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors
      };
    }
    
    // Check for naming conflicts
    const existingPackage = await this.checkPackageExists(packageData.name);
    if (existingPackage && !options?.update) {
      return {
        success: false,
        errors: ['Package name already exists']
      };
    }
    
    // Run quality checks
    const qualityCheck = await this.runQualityChecks(packageData);
    if (!qualityCheck.passed) {
      return {
        success: false,
        errors: qualityCheck.issues,
        qualityReport: qualityCheck.report
      };
    }
    
    // Create package
    const pkg = new Package({
      id: this.generatePackageId(),
      name: packageData.name,
      version: packageData.version,
      description: packageData.description,
      publisherId,
      category: packageData.category,
      tags: packageData.tags,
      pricing: packageData.pricing,
      license: packageData.license,
      requirements: packageData.requirements,
      stats: new PackageStats(),
      rating: 0,
      status: 'pending_review',
      publishedAt: new Date()
    });
    
    // Store package
    this.packages.set(pkg.id, pkg);
    
    // Submit for moderation
    await this.submitForModeration(pkg);
    
    this.addDomainEvent(new PackagePublished({
      correlationId: this.generateCorrelationId(),
      packageId: pkg.id,
      publisherId,
      version: pkg.version,
      timestamp: new Date()
    }));
    
    return {
      success: true,
      packageId: pkg.id,
      status: 'pending_review',
      estimatedReviewTime: '24-48 hours'
    };
  }

  /**
   * Submit a review for a package
   */
  async submitReview(
    packageId: string,
    userId: string,
    reviewData: ReviewData
  ): Promise<Review> {
    const pkg = await this.getPackage(packageId);
    if (!pkg) {
      throw new Error('Package not found');
    }
    
    // Check if user has installed the package
    const hasInstalled = await this.checkUserInstalled(userId, packageId);
    if (!hasInstalled) {
      throw new Error('You must install the package before reviewing');
    }
    
    // Check for existing review
    const existingReview = await this.getUserReview(userId, packageId);
    if (existingReview) {
      throw new Error('You have already reviewed this package');
    }
    
    // Create review
    const review = new Review({
      id: this.generateReviewId(),
      packageId,
      userId,
      rating: reviewData.rating,
      title: reviewData.title,
      comment: reviewData.comment,
      helpful: 0,
      verified: hasInstalled,
      createdAt: new Date()
    });
    
    // Update package rating
    await this.updatePackageRating(packageId);
    
    this.addDomainEvent(new ReviewSubmitted({
      correlationId: this.generateCorrelationId(),
      reviewId: review.id,
      packageId,
      userId,
      rating: review.rating,
      timestamp: new Date()
    }));
    
    return review;
  }

  /**
   * Get marketplace analytics
   */
  async getAnalytics(
    publisherId?: string,
    timeRange?: TimeRange
  ): Promise<MarketplaceAnalytics> {
    const packages = publisherId ? 
      Array.from(this.packages.values()).filter(p => p.publisherId === publisherId) :
      Array.from(this.packages.values());
    
    const analytics: MarketplaceAnalytics = {
      totalPackages: packages.length,
      totalDownloads: packages.reduce((sum, p) => sum + p.stats.downloads, 0),
      totalRevenue: await this.calculateRevenue(packages, timeRange),
      activeInstalls: packages.reduce((sum, p) => sum + p.stats.activeInstalls, 0),
      topPackages: this.getTopPackages(packages, 10),
      categoryBreakdown: this.getCategoryBreakdown(packages),
      revenueByPeriod: await this.getRevenueByPeriod(packages, timeRange),
      growthMetrics: this.calculateGrowthMetrics(packages, timeRange)
    };
    
    return analytics;
  }

  /**
   * Filter packages by search query
   */
  private filterByQuery(packages: Package[], query: string): Package[] {
    const searchTerms = query.toLowerCase().split(' ');
    
    return packages.filter(pkg => {
      const searchableText = [
        pkg.name,
        pkg.description,
        ...pkg.tags,
        pkg.category
      ].join(' ').toLowerCase();
      
      return searchTerms.every(term => searchableText.includes(term));
    });
  }

  /**
   * Sort packages by criteria
   */
  private sortPackages(packages: Package[], sortBy: string): Package[] {
    switch (sortBy) {
      case 'downloads':
        return packages.sort((a, b) => b.stats.downloads - a.stats.downloads);
      case 'rating':
        return packages.sort((a, b) => b.rating - a.rating);
      case 'newest':
        return packages.sort((a, b) => 
          b.publishedAt.getTime() - a.publishedAt.getTime()
        );
      case 'price_low':
        return packages.sort((a, b) => 
          (a.pricing.price || 0) - (b.pricing.price || 0)
        );
      case 'price_high':
        return packages.sort((a, b) => 
          (b.pricing.price || 0) - (a.pricing.price || 0)
        );
      default: // relevance
        return packages;
    }
  }

  /**
   * Validate package data
   */
  private async validatePackage(data: PackageData): Promise<ValidationResult> {
    const errors: string[] = [];
    
    // Name validation
    if (!data.name || data.name.length < 3) {
      errors.push('Package name must be at least 3 characters');
    }
    
    if (!/^[@a-z0-9-~][a-z0-9-._~]*\/[a-z0-9-._~]+$/.test(data.name)) {
      errors.push('Invalid package name format');
    }
    
    // Version validation
    if (!/^\d+\.\d+\.\d+/.test(data.version)) {
      errors.push('Invalid version format (use semver)');
    }
    
    // Description validation
    if (!data.description || data.description.length < 10) {
      errors.push('Description must be at least 10 characters');
    }
    
    // License validation
    if (!this.isValidLicense(data.license)) {
      errors.push('Invalid license');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Run quality checks on package
   */
  private async runQualityChecks(data: PackageData): Promise<QualityCheckResult> {
    const issues: string[] = [];
    const report: QualityReport = {
      codeQuality: 0,
      documentation: 0,
      testing: 0,
      security: 0,
      performance: 0
    };
    
    // Check code quality
    if (!data.files || data.files.length === 0) {
      issues.push('No files provided');
    }
    
    // Check documentation
    if (!data.readme) {
      issues.push('README is required');
      report.documentation = 0;
    } else {
      report.documentation = this.scoreDocumentation(data.readme);
    }
    
    // Check testing
    if (!data.tests || data.tests.length === 0) {
      issues.push('Tests are required');
      report.testing = 0;
    } else {
      report.testing = this.scoreTests(data.tests);
    }
    
    // Security checks would go here
    report.security = 80; // Placeholder
    
    // Performance checks would go here
    report.performance = 85; // Placeholder
    
    // Overall score
    const overallScore = Object.values(report).reduce((a, b) => a + b) / 5;
    
    return {
      passed: overallScore >= this.config.minQualityScore,
      issues,
      report,
      score: overallScore
    };
  }

  getId(): string {
    return this.config.id;
  }
}

// Domain Events
export class PackagesSearched extends DomainEvent {
  constructor(
    public readonly payload: {
      correlationId: string;
      criteria: SearchCriteria;
      resultCount: number;
      timestamp: Date;
    }
  ) {
    super(payload.correlationId);
  }
}

export class PackageInstalled extends DomainEvent {
  constructor(
    public readonly payload: {
      correlationId: string;
      packageId: string;
      userId: string;
      version: string;
      timestamp: Date;
    }
  ) {
    super(payload.correlationId);
  }
}

export class PackagePublished extends DomainEvent {
  constructor(
    public readonly payload: {
      correlationId: string;
      packageId: string;
      publisherId: string;
      version: string;
      timestamp: Date;
    }
  ) {
    super(payload.correlationId);
  }
}

export class ReviewSubmitted extends DomainEvent {
  constructor(
    public readonly payload: {
      correlationId: string;
      reviewId: string;
      packageId: string;
      userId: string;
      rating: number;
      timestamp: Date;
    }
  ) {
    super(payload.correlationId);
  }
}

// Value Objects
export class Package extends ValueObject {
  constructor(
    public readonly props: {
      id: string;
      name: string;
      version: string;
      description: string;
      publisherId: string;
      category: string;
      tags: string[];
      pricing: Pricing;
      license: string;
      requirements: Requirements;
      stats: PackageStats;
      rating: number;
      status: PackageStatus;
      publishedAt: Date;
      updatedAt?: Date;
      publisher?: Publisher;
      reviews?: Review[];
      reviewCount?: number;
    }
  ) {
    super(props);
  }
  
  get id() { return this.props.id; }
  get name() { return this.props.name; }
  get version() { return this.props.version; }
  get description() { return this.props.description; }
  get publisherId() { return this.props.publisherId; }
  get category() { return this.props.category; }
  get tags() { return this.props.tags; }
  get pricing() { return this.props.pricing; }
  get license() { return this.props.license; }
  get requirements() { return this.props.requirements; }
  get stats() { return this.props.stats; }
  get rating() { return this.props.rating; }
  get status() { return this.props.status; }
  get publishedAt() { return this.props.publishedAt; }
}

export class PackageStats {
  downloads: number = 0;
  views: number = 0;
  activeInstalls: number = 0;
  stars: number = 0;
  forks: number = 0;
}

// Types
export interface MarketplaceConfig {
  id: string;
  minQualityScore: number;
  moderationEnabled: boolean;
  paymentEnabled: boolean;
}

export interface SearchResult {
  packages: Package[];
  total: number;
  page: number;
  limit: number;
  executionTime: number;
}

export interface InstallOptions {
  force?: boolean;
  version?: string;
}

export interface InstallResult {
  success: boolean;
  message: string;
  version?: string;
  downloadUrl?: string;
  error?: string;
}

export interface PackageData {
  name: string;
  version: string;
  description: string;
  category: string;
  tags: string[];
  pricing: Pricing;
  license: string;
  requirements: Requirements;
  readme: string;
  files: string[];
  tests: string[];
}

export interface Pricing {
  type: 'free' | 'paid' | 'freemium' | 'subscription';
  price?: number;
  currency?: string;
  billingPeriod?: 'monthly' | 'yearly' | 'lifetime';
}

export interface Requirements {
  semantestVersion: string;
  dependencies: Record<string, string>;
  platforms?: string[];
}

export interface PublishResult {
  success: boolean;
  packageId?: string;
  status?: string;
  errors?: string[];
  qualityReport?: QualityReport;
  estimatedReviewTime?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface QualityCheckResult {
  passed: boolean;
  issues: string[];
  report: QualityReport;
  score: number;
}

export interface QualityReport {
  codeQuality: number;
  documentation: number;
  testing: number;
  security: number;
  performance: number;
}

export interface ReviewData {
  rating: number;
  title: string;
  comment: string;
}

export class Review extends ValueObject {
  constructor(
    public readonly props: {
      id: string;
      packageId: string;
      userId: string;
      rating: number;
      title: string;
      comment: string;
      helpful: number;
      verified: boolean;
      createdAt: Date;
    }
  ) {
    super(props);
  }
}

export interface MarketplaceAnalytics {
  totalPackages: number;
  totalDownloads: number;
  totalRevenue: number;
  activeInstalls: number;
  topPackages: Package[];
  categoryBreakdown: Record<string, number>;
  revenueByPeriod: Array<{ period: string; revenue: number }>;
  growthMetrics: GrowthMetrics;
}

export interface GrowthMetrics {
  downloadsGrowth: number;
  revenueGrowth: number;
  userGrowth: number;
  packageGrowth: number;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export type PackageStatus = 'pending_review' | 'published' | 'rejected' | 'suspended';