/*
                        Semantest - Google Images Downloader Adapter
                        Infrastructure Layer Implementation

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { EventEmitter } from 'events';
import { 
    DownloadRequestedEvent,
    DownloadCompletedEvent,
    DownloadFailedEvent 
} from '../../domain/events';

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
 * INTEGRATED WITH EVENT-DRIVEN ARCHITECTURE BY ANDERS/ALFREDO
 */
export class GoogleImageDownloadAdapter extends EventEmitter {
    private downloadQueue: Map<string, Promise<string>> = new Map();
    private activeDownloads = 0;
    
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

    constructor(config?: Partial<DownloadConfig>) {
        super();
        if (config) {
            this.configure(config);
        }
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for event-driven architecture
     */
    private setupEventListeners(): void {
        // Listen for download requested events from domain layer
        this.on('download:requested', (event: DownloadRequestedEvent) => {
            this.handleDownloadRequest(event).catch(error => {
                console.error('Download request handling failed:', error);
            });
        });
    }

    /**
     * Handle download request event
     */
    private async handleDownloadRequest(event: DownloadRequestedEvent): Promise<void> {
        const { imageUrl, targetFilename, metadata } = event.payload;
        
        try {
            // Check if already downloading
            if (this.downloadQueue.has(imageUrl)) {
                const existingDownload = await this.downloadQueue.get(imageUrl)!;
                this.emitDownloadCompleted(imageUrl, existingDownload, metadata);
                return;
            }

            // Queue the download
            const downloadPromise = this.downloadImageWithQueue(imageUrl, targetFilename || this.generateFilename(imageUrl));
            this.downloadQueue.set(imageUrl, downloadPromise);

            const localPath = await downloadPromise;
            
            // Emit success event
            this.emitDownloadCompleted(imageUrl, localPath, metadata);
            
            // Clean up queue
            this.downloadQueue.delete(imageUrl);
        } catch (error) {
            // Emit failure event
            this.emitDownloadFailed(imageUrl, error as Error, metadata);
            
            // Clean up queue
            this.downloadQueue.delete(imageUrl);
        }
    }

    /**
     * Emit download completed event
     */
    private emitDownloadCompleted(imageUrl: string, localPath: string, metadata: any): void {
        const event = new DownloadCompletedEvent({
            imageUrl,
            localPath,
            downloadedAt: new Date(),
            metadata
        });
        this.emit('download:completed', event);
    }

    /**
     * Emit download failed event
     */
    private emitDownloadFailed(imageUrl: string, error: Error, metadata: any): void {
        const event = new DownloadFailedEvent({
            imageUrl,
            error: error.message,
            failedAt: new Date(),
            metadata
        });
        this.emit('download:failed', event);
    }

    /**
     * Generate filename from URL
     */
    private generateFilename(url: string): string {
        const timestamp = Date.now();
        const urlParts = new URL(url);
        const pathParts = urlParts.pathname.split('/');
        const lastPart = pathParts[pathParts.length - 1] || 'image';
        const ext = lastPart.includes('.') ? lastPart.substring(lastPart.lastIndexOf('.')) : '.jpg';
        return `google_image_${timestamp}${ext}`;
    }

    /**
     * Download image with queue management
     */
    private async downloadImageWithQueue(url: string, filename: string): Promise<string> {
        // Wait if too many concurrent downloads
        while (this.activeDownloads >= (this.config.maxConcurrentDownloads || 3)) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.activeDownloads++;
        try {
            return await this.downloadImage(url, filename);
        } finally {
            this.activeDownloads--;
        }
    }

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
    async downloadImage(url: string, filename: string): Promise<string> {
        this.validateUrl(url);
        this.validateFilename(filename);
        
        const https = await import('https');
        const fs = await import('fs');
        const path = await import('path');
        const { pipeline } = await import('stream/promises');
        
        // Ensure download directory exists
        if (this.config.createDirectories && this.config.downloadPath) {
            await fs.promises.mkdir(this.config.downloadPath, { 
                recursive: true,
                mode: this.config.directoryPermissions 
            });
        }
        
        // Construct safe file path
        const safeFilename = path.basename(filename);
        const filepath = path.join(this.config.downloadPath!, safeFilename);
        
        // Prevent overwriting existing files
        if (await this.fileExists(filepath)) {
            const timestamp = Date.now();
            const ext = path.extname(safeFilename);
            const name = path.basename(safeFilename, ext);
            const uniqueFilename = `${name}_${timestamp}${ext}`;
            const uniqueFilepath = path.join(this.config.downloadPath!, uniqueFilename);
            return this.performDownload(url, uniqueFilepath);
        }
        
        return this.performDownload(url, filepath);
    }
    
    /**
     * Check if file exists
     */
    private async fileExists(filepath: string): Promise<boolean> {
        const fs = await import('fs');
        try {
            await fs.promises.access(filepath);
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * Perform the actual download with retry logic
     */
    private async performDownload(url: string, filepath: string, attempt: number = 1): Promise<string> {
        const https = await import('https');
        const fs = await import('fs');
        const { pipeline } = await import('stream/promises');
        
        return new Promise((resolve, reject) => {
            const tempFilepath = `${filepath}.tmp`;
            const writeStream = fs.createWriteStream(tempFilepath, {
                mode: this.config.filePermissions
            });
            
            let downloadedBytes = 0;
            let totalBytes = 0;
            let responseReceived = false;
            
            const timeoutId = setTimeout(() => {
                if (!responseReceived) {
                    writeStream.destroy();
                    this.cleanup(tempFilepath);
                    reject(new Error('Download timeout'));
                }
            }, this.config.timeout!);
            
            const request = https.get(url, {
                headers: {
                    'User-Agent': this.config.userAgent!,
                    ...this.config.headers
                },
                timeout: this.config.timeout
            }, (response) => {
                responseReceived = true;
                clearTimeout(timeoutId);
                
                // Handle redirects
                if (response.statusCode === 301 || response.statusCode === 302) {
                    if (this.config.followRedirects && response.headers.location) {
                        writeStream.destroy();
                        this.cleanup(tempFilepath);
                        
                        // Validate redirect URL
                        try {
                            this.validateUrl(response.headers.location);
                            return this.performDownload(response.headers.location, filepath, attempt)
                                .then(resolve)
                                .catch(reject);
                        } catch (error) {
                            reject(error);
                        }
                        return;
                    }
                }
                
                // Check status code
                if (response.statusCode !== 200) {
                    writeStream.destroy();
                    this.cleanup(tempFilepath);
                    reject(new Error(`HTTP ${response.statusCode}: Download failed`));
                    return;
                }
                
                // Validate content type
                const contentType = response.headers['content-type'];
                if (contentType && this.config.allowedMimeTypes) {
                    const isAllowed = this.config.allowedMimeTypes.some(mime => 
                        contentType.toLowerCase().includes(mime.toLowerCase())
                    );
                    if (!isAllowed) {
                        writeStream.destroy();
                        this.cleanup(tempFilepath);
                        reject(new Error(`Invalid content type: ${contentType}`));
                        return;
                    }
                }
                
                // Check file size
                totalBytes = parseInt(response.headers['content-length'] || '0', 10);
                if (totalBytes > this.config.maxFileSize!) {
                    writeStream.destroy();
                    this.cleanup(tempFilepath);
                    reject(new Error(`File too large: ${totalBytes} bytes`));
                    return;
                }
                
                // Track progress
                response.on('data', (chunk) => {
                    downloadedBytes += chunk.length;
                    
                    // Enforce max file size during download
                    if (downloadedBytes > this.config.maxFileSize!) {
                        response.destroy();
                        writeStream.destroy();
                        this.cleanup(tempFilepath);
                        reject(new Error(`File size exceeded limit during download`));
                    }
                });
                
                // Pipe response to file
                pipeline(response, writeStream)
                    .then(async () => {
                        // Move temp file to final location
                        await fs.promises.rename(tempFilepath, filepath);
                        resolve(filepath);
                    })
                    .catch(async (error) => {
                        this.cleanup(tempFilepath);
                        
                        // Retry logic
                        if (attempt < this.config.maxRetries!) {
                            const delay = this.config.retryDelay! * Math.pow(this.config.backoffFactor!, attempt - 1);
                            await new Promise(r => setTimeout(r, delay));
                            
                            try {
                                const result = await this.performDownload(url, filepath, attempt + 1);
                                resolve(result);
                            } catch (retryError) {
                                reject(retryError);
                            }
                        } else {
                            reject(new Error(`Download failed after ${attempt} attempts: ${error.message}`));
                        }
                    });
            });
            
            request.on('error', (error) => {
                clearTimeout(timeoutId);
                writeStream.destroy();
                this.cleanup(tempFilepath);
                reject(new Error(`Network error: ${error.message}`));
            });
            
            writeStream.on('error', (error) => {
                clearTimeout(timeoutId);
                request.destroy();
                this.cleanup(tempFilepath);
                reject(new Error(`File write error: ${error.message}`));
            });
        });
    }
    
    /**
     * Clean up temporary files
     */
    private async cleanup(filepath: string): Promise<void> {
        if (!this.config.cleanupOnError) return;
        
        const fs = await import('fs');
        try {
            await fs.promises.unlink(filepath);
        } catch {
            // Ignore cleanup errors
        }
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