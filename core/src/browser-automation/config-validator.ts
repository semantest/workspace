/*
                        Semantest - Browser Configuration Validator
                        Security-focused validation for browser configurations

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { BrowserConfig, BrowserAutomationError } from './interfaces';

/**
 * Browser configuration validator
 * Ensures security and resource limits
 */
export class BrowserConfigValidator {
    private readonly DANGEROUS_EXECUTABLE_PATHS = [
        '/bin/sh', '/bin/bash', '/usr/bin/sh', '/usr/bin/bash',
        'cmd.exe', 'powershell.exe', 'wscript.exe'
    ];

    private readonly DANGEROUS_BROWSER_ARGS = [
        '--disable-web-security',
        '--allow-running-insecure-content',
        '--disable-features=VizDisplayCompositor',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--allow-file-access-from-files',
        '--allow-file-access',
        '--enable-local-file-accesses'
    ];

    private readonly DANGEROUS_DOWNLOAD_PATHS = [
        '/etc', '/usr', '/var', '/bin', '/sbin',
        '/System', '/Windows', 'C:\\Windows', 'C:\\System'
    ];

    private readonly MAX_TIMEOUT = 120000; // 2 minutes
    private readonly MAX_VIEWPORT_SIZE = 4096;
    private readonly MIN_VIEWPORT_SIZE = 100;

    /**
     * Validate browser configuration
     */
    validateConfig(config: BrowserConfig): void {
        this.validateTimeout(config.timeout);
        this.validateUserAgent(config.userAgent);
        this.validateViewport(config.viewport);
        this.validateExecutablePath(config.executablePath);
        this.validateBrowserArgs(config.args);
        this.validateDownloadsPath(config.downloadsPath);
        this.validateUserDataDir(config.userDataDir);
    }

    /**
     * Validate timeout
     */
    private validateTimeout(timeout?: number): void {
        if (timeout === undefined) {
            return;
        }

        if (typeof timeout !== 'number' || timeout < 0) {
            throw new BrowserAutomationError(
                'Invalid timeout: must be a positive number',
                'INVALID_TIMEOUT'
            );
        }

        if (timeout > this.MAX_TIMEOUT) {
            throw new BrowserAutomationError(
                `Resource limit exceeded: timeout cannot exceed ${this.MAX_TIMEOUT}ms`,
                'TIMEOUT_TOO_LONG'
            );
        }
    }

    /**
     * Validate user agent
     */
    private validateUserAgent(userAgent?: string): void {
        if (userAgent === undefined) {
            return;
        }

        if (typeof userAgent !== 'string' || userAgent.length === 0) {
            throw new BrowserAutomationError(
                'Invalid user agent: must be a non-empty string',
                'INVALID_USER_AGENT'
            );
        }

        // Check for suspicious patterns
        if (userAgent.includes('<script>') || userAgent.includes('javascript:')) {
            throw new BrowserAutomationError(
                'Invalid user agent: contains suspicious content',
                'SUSPICIOUS_USER_AGENT'
            );
        }
    }

    /**
     * Validate viewport
     */
    private validateViewport(viewport?: { width: number; height: number }): void {
        if (viewport === undefined) {
            return;
        }

        if (typeof viewport !== 'object' || 
            typeof viewport.width !== 'number' || 
            typeof viewport.height !== 'number') {
            throw new BrowserAutomationError(
                'Invalid viewport: must be an object with width and height',
                'INVALID_VIEWPORT'
            );
        }

        if (viewport.width < this.MIN_VIEWPORT_SIZE || 
            viewport.height < this.MIN_VIEWPORT_SIZE) {
            throw new BrowserAutomationError(
                `Invalid viewport: dimensions must be at least ${this.MIN_VIEWPORT_SIZE}px`,
                'VIEWPORT_TOO_SMALL'
            );
        }

        if (viewport.width > this.MAX_VIEWPORT_SIZE || 
            viewport.height > this.MAX_VIEWPORT_SIZE) {
            throw new BrowserAutomationError(
                `Invalid viewport: dimensions cannot exceed ${this.MAX_VIEWPORT_SIZE}px`,
                'VIEWPORT_TOO_LARGE'
            );
        }
    }

    /**
     * Validate executable path
     */
    private validateExecutablePath(executablePath?: string): void {
        if (executablePath === undefined) {
            return;
        }

        if (typeof executablePath !== 'string') {
            throw new BrowserAutomationError(
                'Invalid executable path: must be a string',
                'INVALID_EXECUTABLE_PATH'
            );
        }

        const normalizedPath = executablePath.toLowerCase();
        for (const dangerous of this.DANGEROUS_EXECUTABLE_PATHS) {
            if (normalizedPath.includes(dangerous.toLowerCase())) {
                throw new BrowserAutomationError(
                    'Unsafe executable path: potential security risk',
                    'DANGEROUS_EXECUTABLE_PATH'
                );
            }
        }
    }

    /**
     * Validate browser arguments
     */
    private validateBrowserArgs(args?: string[]): void {
        if (args === undefined) {
            return;
        }

        if (!Array.isArray(args)) {
            throw new BrowserAutomationError(
                'Invalid browser args: must be an array',
                'INVALID_BROWSER_ARGS'
            );
        }

        for (const arg of args) {
            if (typeof arg !== 'string') {
                throw new BrowserAutomationError(
                    'Invalid browser arg: must be a string',
                    'INVALID_BROWSER_ARG_TYPE'
                );
            }

            if (this.DANGEROUS_BROWSER_ARGS.includes(arg)) {
                throw new BrowserAutomationError(
                    `Unsafe browser argument: ${arg}`,
                    'DANGEROUS_BROWSER_ARG'
                );
            }
        }
    }

    /**
     * Validate downloads path
     */
    private validateDownloadsPath(downloadsPath?: string): void {
        if (downloadsPath === undefined) {
            return;
        }

        if (typeof downloadsPath !== 'string') {
            throw new BrowserAutomationError(
                'Invalid downloads path: must be a string',
                'INVALID_DOWNLOADS_PATH'
            );
        }

        const normalizedPath = downloadsPath.toLowerCase();
        for (const dangerous of this.DANGEROUS_DOWNLOAD_PATHS) {
            if (normalizedPath.startsWith(dangerous.toLowerCase())) {
                throw new BrowserAutomationError(
                    'Unsafe downloads path: potential security risk',
                    'DANGEROUS_DOWNLOADS_PATH'
                );
            }
        }

        this.checkPathTraversal(downloadsPath, 'downloads path');
    }

    /**
     * Validate user data directory
     */
    private validateUserDataDir(userDataDir?: string): void {
        if (userDataDir === undefined) {
            return;
        }

        if (typeof userDataDir !== 'string') {
            throw new BrowserAutomationError(
                'Invalid user data dir: must be a string',
                'INVALID_USER_DATA_DIR'
            );
        }

        this.checkPathTraversal(userDataDir, 'user data dir');
    }

    /**
     * Check for path traversal attempts
     */
    private checkPathTraversal(path: string, name: string): void {
        if (path.includes('../') || path.includes('..\\')) {
            throw new BrowserAutomationError(
                `Unsafe ${name}: path traversal detected`,
                'PATH_TRAVERSAL'
            );
        }
    }
}