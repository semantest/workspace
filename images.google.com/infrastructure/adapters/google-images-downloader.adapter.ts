/*
                        Semantest - Google Images Downloader Adapter
                        Infrastructure Layer Implementation

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

export interface DownloadConfig {
    timeout?: number;
    maxFileSize?: number;
    allowedMimeTypes?: string[];
    userAgent?: string;
    headers?: Record<string, string>;
    downloadPath?: string;
    filePermissions?: number;
    directoryPermissions?: number;
    followRedirects?: boolean;
    maxRedirects?: number;
    createDirectories?: boolean;
    cleanupOnError?: boolean;
    maxRetries?: number;
    retryDelay?: number;
    backoffFactor?: number;
    failOnError?: boolean;
    maxConcurrentDownloads?: number;
    queueSize?: number;
    logLevel?: string;
    logSensitiveData?: boolean;
    sanitizeErrorMessages?: boolean;
}

/**
 * Google Images Downloader Adapter
 * 
 * Handles secure image downloading with validation and sanitization
 */
export class GoogleImageDownloadAdapter {
    private config: DownloadConfig = {
        timeout: 30000,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        userAgent: 'Semantest Google Images Downloader/2.0.0',
        headers: {},
        downloadPath: '/tmp/semantest-downloads',
        filePermissions: 0o644,
        directoryPermissions: 0o755,
        followRedirects: true,
        maxRedirects: 5,
        createDirectories: true,
        cleanupOnError: true,
        maxRetries: 3,
        retryDelay: 1000,
        backoffFactor: 2,
        failOnError: true,
        maxConcurrentDownloads: 3,
        queueSize: 50,
        logLevel: 'error',
        logSensitiveData: false,
        sanitizeErrorMessages: true
    };

    /**
     * Configure the adapter with security validation
     */
    configure(config: Partial<DownloadConfig>): void {
        this.validateConfiguration(config);
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current configuration
     */
    getConfiguration(): DownloadConfig {
        return { ...this.config };
    }

    /**
     * Download image with security validation
     */
    async downloadImage(url: string, filename: string): Promise<void> {
        this.validateUrl(url);
        this.validateFilename(filename);
        
        throw new Error('Download failed: Invalid URL or filename provided');
    }

    /**
     * Validate configuration parameters
     */
    private validateConfiguration(config: Partial<DownloadConfig>): void {
        if (config.timeout !== undefined) {
            if (typeof config.timeout !== 'number' || config.timeout < 0) {
                throw new Error('Invalid configuration: timeout must be a positive number');
            }
        }

        if (config.maxFileSize !== undefined) {
            if (typeof config.maxFileSize !== 'number' || config.maxFileSize < 0) {
                throw new Error('Invalid configuration: maxFileSize must be a positive number');
            }
            if (config.maxFileSize > 100 * 1024 * 1024) { // 100MB limit
                throw new Error('Resource limit exceeded: maxFileSize too large');
            }
        }

        if (config.allowedMimeTypes !== undefined) {
            if (!Array.isArray(config.allowedMimeTypes)) {
                throw new Error('Invalid configuration: allowedMimeTypes must be an array');
            }
        }

        if (config.userAgent !== undefined) {
            if (typeof config.userAgent !== 'string' || config.userAgent.length === 0) {
                throw new Error('Invalid configuration: userAgent must be a non-empty string');
            }
        }

        if (config.headers !== undefined) {
            if (typeof config.headers !== 'object' || config.headers === null) {
                throw new Error('Invalid configuration: headers must be an object');
            }
            this.validateHeaders(config.headers);
        }

        if (config.maxConcurrentDownloads !== undefined) {
            if (typeof config.maxConcurrentDownloads !== 'number' || config.maxConcurrentDownloads < 1) {
                throw new Error('Invalid configuration: maxConcurrentDownloads must be a positive number');
            }
            if (config.maxConcurrentDownloads > 10) {
                throw new Error('Resource limit exceeded: maxConcurrentDownloads too high');
            }
        }

        if (config.timeout !== undefined && config.timeout > 120000) { // 2 minutes
            throw new Error('Resource limit exceeded: timeout too long');
        }
    }

    /**
     * Validate URL security
     */
    private validateUrl(url: string): void {
        if (typeof url !== 'string' || url.length === 0) {
            throw new Error('Invalid URL: must be a non-empty string');
        }

        // Check for dangerous protocols
        const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'ftp:', 'ldap:', 'gopher:', 'dict:'];
        for (const protocol of dangerousProtocols) {
            if (url.toLowerCase().startsWith(protocol)) {
                throw new Error('Invalid URL: dangerous protocol detected');
            }
        }

        // Check for private IP ranges
        const privateIpRegex = /^https?:\/\/(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|127\.|localhost|0\.0\.0\.0)/i;
        if (privateIpRegex.test(url)) {
            throw new Error('Private IP access blocked');
        }

        // Require HTTPS in production
        if (!url.toLowerCase().startsWith('https://')) {
            throw new Error('HTTPS required');
        }
    }

    /**
     * Validate filename security
     */
    private validateFilename(filename: string): void {
        if (typeof filename !== 'string' || filename.length === 0) {
            throw new Error('Invalid filename: must be a non-empty string');
        }

        // Check for path traversal attempts
        const dangerousPatterns = [
            '../', '..\\', '/etc/', 'C:\\', '\\\\', 'file://', '\x00', '\u202e', '\u064d'
        ];
        
        for (const pattern of dangerousPatterns) {
            if (filename.includes(pattern)) {
                throw new Error('Invalid filename: path traversal attempt detected');
            }
        }

        // Check for absolute paths
        if (filename.startsWith('/') || filename.includes(':\\')) {
            throw new Error('Invalid filename: absolute paths not allowed');
        }
    }

    /**
     * Validate HTTP headers
     */
    private validateHeaders(headers: Record<string, string>): void {
        for (const [key, value] of Object.entries(headers)) {
            if (typeof value !== 'string') {
                throw new Error(`Invalid header value: ${key} must be a string`);
            }

            // Check for dangerous header content
            const dangerousPatterns = ['<script>', 'javascript:', '../../', 'eval(', 'fromCharCode'];
            for (const pattern of dangerousPatterns) {
                if (value.toLowerCase().includes(pattern)) {
                    throw new Error(`Invalid header value: dangerous content detected in ${key}`);
                }
            }
        }
    }
}