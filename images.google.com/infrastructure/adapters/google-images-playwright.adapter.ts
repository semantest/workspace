/*
                        Semantest - Google Images Playwright Adapter
                        Infrastructure Layer Implementation

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { PlaywrightBrowserAdapter, BrowserConfig } from '@semantest/core';
import { GoogleImageElement } from '../../domain/events/download-requested.event';
import { SearchFilters } from '../../domain/entities/google-image-search-session.entity';

export interface GoogleImagesPlaywrightConfig {
    maxPages?: number;
    maxResults?: number;
    baseUrl?: string;
    searchDelay?: number;
    resultSelector?: string;
    imageSelector?: string;
}

/**
 * Google Images Playwright Adapter
 * 
 * Extends the core Playwright adapter with Google Images specific functionality
 */
export class GoogleImagesPlaywrightAdapter extends PlaywrightBrowserAdapter {
    private googleConfig: GoogleImagesPlaywrightConfig = {
        maxPages: 5,
        maxResults: 100,
        baseUrl: 'https://images.google.com',
        searchDelay: 1000,
        resultSelector: '[data-ri]',
        imageSelector: 'img'
    };

    /**
     * Configure the adapter with security validation
     */
    configure(config: Partial<BrowserConfig>, googleConfig?: Partial<GoogleImagesPlaywrightConfig>): void {
        // Use parent class configuration validation
        if (config) {
            this.validateGoogleConfig(config);
        }
        
        if (googleConfig) {
            this.validateGoogleSpecificConfig(googleConfig);
            this.googleConfig = { ...this.googleConfig, ...googleConfig };
        }
        
        // Set default config for Google Images
        const defaultConfig: BrowserConfig = {
            timeout: 30000,
            userAgent: 'Semantest Google Images Playwright/2.0.0',
            viewport: { width: 1280, height: 720 },
            headless: true,
            slowMo: 0,
            ...config
        };
        
        super.initialize(defaultConfig);
    }

    /**
     * Get current configuration
     */
    getConfiguration(): { browser: BrowserConfig; google: GoogleImagesPlaywrightConfig } {
        return {
            browser: { ...this.config },
            google: { ...this.googleConfig }
        };
    }

    /**
     * Search for images with security validation
     */
    async searchImages(query: string, filters: SearchFilters): Promise<GoogleImageElement[]> {
        this.validateQuery(query);
        this.validateFilters(filters);
        
        try {
            // Navigate to Google Images
            await this.navigate(`${this.googleConfig.baseUrl}/search?q=${encodeURIComponent(query)}`);
            
            // Wait for images to load
            await this.waitForElement({ selector: this.googleConfig.resultSelector! });
            
            // Extract image elements
            const elements = await this.extractImageElements();
            
            // Apply filters and limit results
            return this.filterResults(elements, filters);
        } catch (error) {
            throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Extract image elements from the page
     */
    private async extractImageElements(): Promise<GoogleImageElement[]> {
        // Implementation will extract actual image data
        // For now, return empty array as placeholder
        return [];
    }

    /**
     * Filter and limit search results
     */
    private filterResults(elements: GoogleImageElement[], filters: SearchFilters): GoogleImageElement[] {
        let filtered = elements;
        
        // Apply size filter
        if (filters.imageSize && filters.imageSize !== 'any') {
            filtered = this.filterBySize(filtered, filters.imageSize);
        }
        
        // Apply type filter
        if (filters.imageType && filters.imageType !== 'any') {
            filtered = this.filterByType(filtered, filters.imageType);
        }
        
        // Limit results
        return filtered.slice(0, this.googleConfig.maxResults);
    }

    /**
     * Filter images by size
     */
    private filterBySize(elements: GoogleImageElement[], size: string): GoogleImageElement[] {
        // Implementation depends on available metadata
        return elements;
    }

    /**
     * Filter images by type
     */
    private filterByType(elements: GoogleImageElement[], type: string): GoogleImageElement[] {
        // Implementation depends on available metadata
        return elements;
    }

    /**
     * Validate Google-specific configuration parameters
     */
    private validateGoogleConfig(config: Partial<BrowserConfig>): void {
        // Base validation is handled by parent class
        // Additional Google Images specific validation
        if (config.userAgent && !config.userAgent.includes('Semantest')) {
            console.warn('User agent should identify as Semantest for proper attribution');
        }
    }

    /**
     * Validate Google-specific configuration
     */
    private validateGoogleSpecificConfig(config: Partial<GoogleImagesPlaywrightConfig>): void {
        if (config.maxPages !== undefined) {
            if (typeof config.maxPages !== 'number' || config.maxPages < 1) {
                throw new Error('Invalid configuration: maxPages must be a positive number');
            }
        }

        if (config.maxResults !== undefined) {
            if (typeof config.maxResults !== 'number' || config.maxResults < 1) {
                throw new Error('Invalid configuration: maxResults must be a positive number');
            }
            if (config.maxResults > 1000) {
                throw new Error('Resource limit exceeded: maxResults too high');
            }
        }

        if (config.baseUrl !== undefined) {
            if (typeof config.baseUrl !== 'string' || !config.baseUrl.startsWith('https://')) {
                throw new Error('Invalid configuration: baseUrl must be a valid HTTPS URL');
            }
        }

        if (config.searchDelay !== undefined) {
            if (typeof config.searchDelay !== 'number' || config.searchDelay < 0) {
                throw new Error('Invalid configuration: searchDelay must be a non-negative number');
            }
        }
    }

    /**
     * Validate search query
     */
    private validateQuery(query: string): void {
        if (typeof query !== 'string' || query.length === 0) {
            throw new Error('Invalid search query: must be a non-empty string');
        }

        // Check for dangerous query content
        const dangerousPatterns = [
            '<script>', '</script>', 'javascript:', 'onload=', 'onerror=', 'onclick=',
            'eval(', 'fromCharCode', '${', '../../', 'file://', 'data:text/html'
        ];
        
        for (const pattern of dangerousPatterns) {
            if (query.toLowerCase().includes(pattern)) {
                throw new Error('Invalid search query: dangerous content detected');
            }
        }

        // Check for JNDI injection patterns
        if (query.includes('${jndi:')) {
            throw new Error('Invalid search query: JNDI injection attempt detected');
        }
    }

    /**
     * Validate search filters
     */
    private validateFilters(filters: SearchFilters): void {
        if (typeof filters !== 'object' || filters === null) {
            return; // Filters are optional
        }

        // Validate enum values
        const validImageSizes = ['large', 'medium', 'icon', 'larger-than', 'exactly'];
        if (filters.imageSize && !validImageSizes.includes(filters.imageSize)) {
            throw new Error('Invalid filter: imageSize must be one of: ' + validImageSizes.join(', '));
        }

        const validImageTypes = ['photo', 'clipart', 'lineart', 'gif', 'transparent'];
        if (filters.imageType && !validImageTypes.includes(filters.imageType)) {
            throw new Error('Invalid filter: imageType must be one of: ' + validImageTypes.join(', '));
        }

        const validSafeSearch = ['strict', 'moderate', 'off'];
        if (filters.safeSearch && !validSafeSearch.includes(filters.safeSearch)) {
            throw new Error('Invalid filter: safeSearch must be one of: ' + validSafeSearch.join(', '));
        }

        // Validate dimensions
        if (filters.imageSizeDimensions) {
            if (typeof filters.imageSizeDimensions !== 'object' ||
                typeof filters.imageSizeDimensions.width !== 'number' ||
                typeof filters.imageSizeDimensions.height !== 'number') {
                throw new Error('Invalid filter: imageSizeDimensions must have width and height numbers');
            }
            
            if (filters.imageSizeDimensions.width < 1 || filters.imageSizeDimensions.height < 1) {
                throw new Error('Invalid filter: imageSizeDimensions must be positive numbers');
            }
        }
    }
}