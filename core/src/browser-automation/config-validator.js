"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserConfigValidator = void 0;
const interfaces_1 = require("./interfaces");
class BrowserConfigValidator {
    constructor() {
        this.DANGEROUS_EXECUTABLE_PATHS = [
            '/bin/sh', '/bin/bash', '/usr/bin/sh', '/usr/bin/bash',
            'cmd.exe', 'powershell.exe', 'wscript.exe'
        ];
        this.DANGEROUS_BROWSER_ARGS = [
            '--disable-web-security',
            '--allow-running-insecure-content',
            '--disable-features=VizDisplayCompositor',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--allow-file-access-from-files',
            '--allow-file-access',
            '--enable-local-file-accesses'
        ];
        this.DANGEROUS_DOWNLOAD_PATHS = [
            '/etc', '/usr', '/var', '/bin', '/sbin',
            '/System', '/Windows', 'C:\\Windows', 'C:\\System'
        ];
        this.MAX_TIMEOUT = 120000;
        this.MAX_VIEWPORT_SIZE = 4096;
        this.MIN_VIEWPORT_SIZE = 100;
    }
    validateConfig(config) {
        this.validateTimeout(config.timeout);
        this.validateUserAgent(config.userAgent);
        this.validateViewport(config.viewport);
        this.validateExecutablePath(config.executablePath);
        this.validateBrowserArgs(config.args);
        this.validateDownloadsPath(config.downloadsPath);
        this.validateUserDataDir(config.userDataDir);
    }
    validateTimeout(timeout) {
        if (timeout === undefined) {
            return;
        }
        if (typeof timeout !== 'number' || timeout < 0) {
            throw new interfaces_1.BrowserAutomationError('Invalid timeout: must be a positive number', 'INVALID_TIMEOUT');
        }
        if (timeout > this.MAX_TIMEOUT) {
            throw new interfaces_1.BrowserAutomationError(`Resource limit exceeded: timeout cannot exceed ${this.MAX_TIMEOUT}ms`, 'TIMEOUT_TOO_LONG');
        }
    }
    validateUserAgent(userAgent) {
        if (userAgent === undefined) {
            return;
        }
        if (typeof userAgent !== 'string' || userAgent.length === 0) {
            throw new interfaces_1.BrowserAutomationError('Invalid user agent: must be a non-empty string', 'INVALID_USER_AGENT');
        }
        if (userAgent.includes('<script>') || userAgent.includes('javascript:')) {
            throw new interfaces_1.BrowserAutomationError('Invalid user agent: contains suspicious content', 'SUSPICIOUS_USER_AGENT');
        }
    }
    validateViewport(viewport) {
        if (viewport === undefined) {
            return;
        }
        if (typeof viewport !== 'object' ||
            typeof viewport.width !== 'number' ||
            typeof viewport.height !== 'number') {
            throw new interfaces_1.BrowserAutomationError('Invalid viewport: must be an object with width and height', 'INVALID_VIEWPORT');
        }
        if (viewport.width < this.MIN_VIEWPORT_SIZE ||
            viewport.height < this.MIN_VIEWPORT_SIZE) {
            throw new interfaces_1.BrowserAutomationError(`Invalid viewport: dimensions must be at least ${this.MIN_VIEWPORT_SIZE}px`, 'VIEWPORT_TOO_SMALL');
        }
        if (viewport.width > this.MAX_VIEWPORT_SIZE ||
            viewport.height > this.MAX_VIEWPORT_SIZE) {
            throw new interfaces_1.BrowserAutomationError(`Invalid viewport: dimensions cannot exceed ${this.MAX_VIEWPORT_SIZE}px`, 'VIEWPORT_TOO_LARGE');
        }
    }
    validateExecutablePath(executablePath) {
        if (executablePath === undefined) {
            return;
        }
        if (typeof executablePath !== 'string') {
            throw new interfaces_1.BrowserAutomationError('Invalid executable path: must be a string', 'INVALID_EXECUTABLE_PATH');
        }
        const normalizedPath = executablePath.toLowerCase();
        for (const dangerous of this.DANGEROUS_EXECUTABLE_PATHS) {
            if (normalizedPath.includes(dangerous.toLowerCase())) {
                throw new interfaces_1.BrowserAutomationError('Unsafe executable path: potential security risk', 'DANGEROUS_EXECUTABLE_PATH');
            }
        }
    }
    validateBrowserArgs(args) {
        if (args === undefined) {
            return;
        }
        if (!Array.isArray(args)) {
            throw new interfaces_1.BrowserAutomationError('Invalid browser args: must be an array', 'INVALID_BROWSER_ARGS');
        }
        for (const arg of args) {
            if (typeof arg !== 'string') {
                throw new interfaces_1.BrowserAutomationError('Invalid browser arg: must be a string', 'INVALID_BROWSER_ARG_TYPE');
            }
            if (this.DANGEROUS_BROWSER_ARGS.includes(arg)) {
                throw new interfaces_1.BrowserAutomationError(`Unsafe browser argument: ${arg}`, 'DANGEROUS_BROWSER_ARG');
            }
        }
    }
    validateDownloadsPath(downloadsPath) {
        if (downloadsPath === undefined) {
            return;
        }
        if (typeof downloadsPath !== 'string') {
            throw new interfaces_1.BrowserAutomationError('Invalid downloads path: must be a string', 'INVALID_DOWNLOADS_PATH');
        }
        const normalizedPath = downloadsPath.toLowerCase();
        for (const dangerous of this.DANGEROUS_DOWNLOAD_PATHS) {
            if (normalizedPath.startsWith(dangerous.toLowerCase())) {
                throw new interfaces_1.BrowserAutomationError('Unsafe downloads path: potential security risk', 'DANGEROUS_DOWNLOADS_PATH');
            }
        }
        this.checkPathTraversal(downloadsPath, 'downloads path');
    }
    validateUserDataDir(userDataDir) {
        if (userDataDir === undefined) {
            return;
        }
        if (typeof userDataDir !== 'string') {
            throw new interfaces_1.BrowserAutomationError('Invalid user data dir: must be a string', 'INVALID_USER_DATA_DIR');
        }
        this.checkPathTraversal(userDataDir, 'user data dir');
    }
    checkPathTraversal(path, name) {
        if (path.includes('../') || path.includes('..\\')) {
            throw new interfaces_1.BrowserAutomationError(`Unsafe ${name}: path traversal detected`, 'PATH_TRAVERSAL');
        }
    }
}
exports.BrowserConfigValidator = BrowserConfigValidator;
//# sourceMappingURL=config-validator.js.map