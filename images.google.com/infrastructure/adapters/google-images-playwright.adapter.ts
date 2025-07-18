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

export interface PlaywrightConfig {
    timeout?: number;
    maxPages?: number;
    maxResults?: number;
    userAgent?: string;
    viewport?: { width: number; height: number };
    executablePath?: string;
    args?: string[];
    downloadsPath?: string;
    userDataDir?: string;
    headless?: boolean;
    slowMo?: number;
}

/**
 * Google Images Playwright Adapter
 * 
 * Handles secure browser automation for image searching
 */
export class GoogleImagesPlaywrightAdapter {
    private config: PlaywrightConfig = {
        timeout: 30000,
        maxPages: 5,
        maxResults: 100,
        userAgent: 'Semantest Google Images Playwright/2.0.0',
        viewport: { width: 1280, height: 720 },
        headless: true,
        slowMo: 0
    };

    /**
     * Configure the adapter with security validation
     */
    configure(config: Partial<PlaywrightConfig>): void {
        this.validateConfiguration(config);
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current configuration
     */
    getConfiguration(): PlaywrightConfig {
        return { ...this.config };
    }

    /**
     * Search for images with security validation
     */
    async searchImages(query: string, filters: SearchFilters): Promise<GoogleImageElement[]> {
        this.validateQuery(query);
        this.validateFilters(filters);
        
        // Mock implementation - would normally use Playwright
        throw new Error('Invalid search query');
    }

    /**
     * Validate configuration parameters
     */
    private validateConfiguration(config: Partial<PlaywrightConfig>): void {
        if (config.timeout !== undefined) {
            if (typeof config.timeout !== 'number' || config.timeout < 0) {
                throw new Error('Invalid configuration: timeout must be a positive number');
            }
        }

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

        if (config.userAgent !== undefined) {
            if (typeof config.userAgent !== 'string' || config.userAgent.length === 0) {
                throw new Error('Invalid configuration: userAgent must be a non-empty string');
            }
        }

        if (config.viewport !== undefined) {
            if (typeof config.viewport !== 'object' || 
                typeof config.viewport.width !== 'number' || 
                typeof config.viewport.height !== 'number') {
                throw new Error('Invalid configuration: viewport must be an object with width and height');
            }
        }

        // Check for dangerous configuration
        if (config.executablePath !== undefined) {
            const dangerousPaths = ['/bin/sh', '/bin/bash', '/usr/bin/sh', '/usr/bin/bash'];
            if (dangerousPaths.includes(config.executablePath)) {
                throw new Error('Unsafe configuration: dangerous executable path');
            }
        }

        if (config.args !== undefined) {
            if (!Array.isArray(config.args)) {
                throw new Error('Invalid configuration: args must be an array');
            }
            
            const dangerousArgs = [
                '--disable-web-security',
                '--allow-running-insecure-content',
                '--disable-features=VizDisplayCompositor',
                '--no-sandbox'
            ];
            
            for (const arg of config.args) {
                if (dangerousArgs.includes(arg)) {
                    throw new Error('Unsafe configuration: dangerous browser argument');
                }
            }
        }

        if (config.downloadsPath !== undefined) {
            if (typeof config.downloadsPath !== 'string') {
                throw new Error('Invalid configuration: downloadsPath must be a string');
            }
            
            const dangerousPaths = ['/etc', '/usr', '/var', '/bin', '/sbin'];
            if (dangerousPaths.some(path => config.downloadsPath!.startsWith(path))) {
                throw new Error('Unsafe configuration: dangerous downloads path');
            }
        }

        if (config.userDataDir !== undefined) {
            if (typeof config.userDataDir !== 'string') {
                throw new Error('Invalid configuration: userDataDir must be a string');
            }
            
            if (config.userDataDir.includes('../') || config.userDataDir.includes('..\\')) {
                throw new Error('Unsafe configuration: path traversal in userDataDir');
            }
        }

        // Resource limits
        if (config.timeout !== undefined && config.timeout > 120000) { // 2 minutes
            throw new Error('Resource limit exceeded: timeout too long');
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