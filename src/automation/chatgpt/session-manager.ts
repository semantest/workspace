/*
                        Semantest - Browser Session Manager
                        Manages browser sessions for ChatGPT automation

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { Browser, BrowserContext, Page, chromium, firefox, webkit } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { EventEmitter } from 'events';

export interface BrowserSessionConfig {
    browserType?: 'chromium' | 'firefox' | 'webkit';
    userDataDir?: string;
    headless?: boolean;
    viewport?: { width: number; height: number };
    timeout?: number;
    sessionId?: string;
    persistSession?: boolean;
}

export interface SessionInfo {
    id: string;
    browserType: string;
    created: Date;
    lastActivity: Date;
    userDataDir: string;
    isActive: boolean;
}

/**
 * Browser Session Manager for ChatGPT Automation
 * 
 * Manages browser sessions, allowing reconnection to existing sessions
 * where users have already logged into ChatGPT manually.
 */
export class BrowserSessionManager extends EventEmitter {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private page: Page | null = null;
    private config: Required<BrowserSessionConfig>;
    private sessionInfo: SessionInfo | null = null;

    constructor(config: BrowserSessionConfig = {}) {
        super();

        this.config = {
            browserType: config.browserType ?? 'chromium',
            userDataDir: config.userDataDir ?? join(process.cwd(), '.browser-sessions'),
            headless: config.headless ?? false,
            viewport: config.viewport ?? { width: 1280, height: 720 },
            timeout: config.timeout ?? 60000,
            sessionId: config.sessionId ?? `session-${Date.now()}`,
            persistSession: config.persistSession ?? true
        };

        // Ensure session directory exists
        if (!existsSync(this.config.userDataDir)) {
            mkdirSync(this.config.userDataDir, { recursive: true });
        }
    }

    /**
     * Create a new browser session
     */
    async createSession(): Promise<SessionInfo> {
        try {
            this.emit('status', { message: 'Creating new browser session...', type: 'info' });

            // Get browser launcher
            const browserLauncher = this.getBrowserLauncher();

            // Session-specific user data directory
            const sessionDataDir = join(this.config.userDataDir, this.config.sessionId);
            if (!existsSync(sessionDataDir)) {
                mkdirSync(sessionDataDir, { recursive: true });
            }

            // Launch browser with persistent context
            this.browser = await browserLauncher.launchPersistentContext(sessionDataDir, {
                headless: this.config.headless,
                viewport: this.config.viewport,
                acceptDownloads: true,
                args: [
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage',
                    '--no-sandbox',
                    '--disable-setuid-sandbox'
                ],
                userAgent: this.getUserAgent()
            });

            this.context = this.browser;
            
            // Create or get existing page
            const pages = this.context.pages();
            this.page = pages.length > 0 ? pages[0] : await this.context.newPage();
            
            // Set timeout
            this.page.setDefaultTimeout(this.config.timeout);

            // Create session info
            this.sessionInfo = {
                id: this.config.sessionId,
                browserType: this.config.browserType,
                created: new Date(),
                lastActivity: new Date(),
                userDataDir: sessionDataDir,
                isActive: true
            };

            // Save session info if persistence is enabled
            if (this.config.persistSession) {
                await this.saveSessionInfo();
            }

            this.emit('sessionCreated', this.sessionInfo);
            this.emit('status', { message: 'Browser session created successfully', type: 'success' });

            return this.sessionInfo;

        } catch (error) {
            this.emit('error', { message: 'Failed to create browser session', error });
            throw new Error(`Session creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Connect to an existing browser session
     */
    async connectToSession(sessionId: string): Promise<SessionInfo> {
        try {
            this.emit('status', { message: `Connecting to existing session: ${sessionId}`, type: 'info' });

            // Load existing session info
            const sessionInfo = await this.loadSessionInfo(sessionId);
            if (!sessionInfo) {
                throw new Error(`Session ${sessionId} not found`);
            }

            // Update config with session ID
            this.config.sessionId = sessionId;

            // Try to connect to existing browser
            const sessionDataDir = sessionInfo.userDataDir;
            if (!existsSync(sessionDataDir)) {
                throw new Error(`Session data directory not found: ${sessionDataDir}`);
            }

            // Get browser launcher
            const browserLauncher = this.getBrowserLauncher();

            // Connect to persistent context
            this.browser = await browserLauncher.launchPersistentContext(sessionDataDir, {
                headless: this.config.headless,
                viewport: this.config.viewport,
                acceptDownloads: true,
                args: [
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage',
                    '--no-sandbox',
                    '--disable-setuid-sandbox'
                ],
                userAgent: this.getUserAgent()
            });

            this.context = this.browser;
            
            // Get existing pages or create new one
            const pages = this.context.pages();
            this.page = pages.length > 0 ? pages[0] : await this.context.newPage();
            
            // Set timeout
            this.page.setDefaultTimeout(this.config.timeout);

            // Update session info
            sessionInfo.lastActivity = new Date();
            sessionInfo.isActive = true;
            this.sessionInfo = sessionInfo;

            // Save updated session info
            if (this.config.persistSession) {
                await this.saveSessionInfo();
            }

            this.emit('sessionConnected', this.sessionInfo);
            this.emit('status', { message: 'Connected to existing browser session', type: 'success' });

            return this.sessionInfo;

        } catch (error) {
            this.emit('error', { message: 'Failed to connect to session', error, sessionId });
            throw new Error(`Session connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * List all available sessions
     */
    async listSessions(): Promise<SessionInfo[]> {
        try {
            const sessionsDir = this.config.userDataDir;
            if (!existsSync(sessionsDir)) {
                return [];
            }

            const sessions: SessionInfo[] = [];
            const { readdirSync, statSync } = await import('fs');
            
            const sessionDirs = readdirSync(sessionsDir)
                .filter(name => {
                    const sessionPath = join(sessionsDir, name);
                    return statSync(sessionPath).isDirectory();
                });

            for (const sessionDir of sessionDirs) {
                try {
                    const sessionInfo = await this.loadSessionInfo(sessionDir);
                    if (sessionInfo) {
                        sessions.push(sessionInfo);
                    }
                } catch {
                    // Skip invalid sessions
                }
            }

            return sessions.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());

        } catch (error) {
            this.emit('error', { message: 'Failed to list sessions', error });
            return [];
        }
    }

    /**
     * Get the current page instance
     */
    getPage(): Page | null {
        return this.page;
    }

    /**
     * Get the current browser instance
     */
    getBrowser(): Browser | null {
        return this.browser;
    }

    /**
     * Get current session info
     */
    getSessionInfo(): SessionInfo | null {
        return this.sessionInfo;
    }

    /**
     * Navigate to a URL
     */
    async navigate(url: string): Promise<void> {
        if (!this.page) {
            throw new Error('No active page. Create or connect to a session first.');
        }

        try {
            await this.page.goto(url, { waitUntil: 'networkidle' });
            await this.updateActivity();
        } catch (error) {
            throw new Error(`Navigation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Take a screenshot of the current page
     */
    async takeScreenshot(options?: { path?: string; fullPage?: boolean }): Promise<Buffer> {
        if (!this.page) {
            throw new Error('No active page. Create or connect to a session first.');
        }

        const screenshot = await this.page.screenshot({
            fullPage: options?.fullPage ?? true,
            path: options?.path
        });

        await this.updateActivity();
        return screenshot;
    }

    /**
     * Close the current session
     */
    async closeSession(): Promise<void> {
        try {
            this.emit('status', { message: 'Closing browser session...', type: 'info' });

            if (this.sessionInfo) {
                this.sessionInfo.isActive = false;
                
                if (this.config.persistSession) {
                    await this.saveSessionInfo();
                }
            }

            if (this.page) {
                await this.page.close();
                this.page = null;
            }

            if (this.browser) {
                await this.browser.close();
                this.browser = null;
            }

            this.context = null;
            
            this.emit('sessionClosed', this.sessionInfo);
            this.emit('status', { message: 'Browser session closed', type: 'success' });

        } catch (error) {
            this.emit('error', { message: 'Error closing session', error });
        }
    }

    /**
     * Delete a session permanently
     */
    async deleteSession(sessionId: string): Promise<void> {
        try {
            const sessionDataDir = join(this.config.userDataDir, sessionId);
            const sessionInfoPath = join(sessionDataDir, 'session-info.json');

            // Remove session files
            if (existsSync(sessionInfoPath)) {
                const { unlinkSync } = await import('fs');
                unlinkSync(sessionInfoPath);
            }

            // Note: We don't delete the entire session directory as it may contain
            // important browser data. The session info file removal is sufficient
            // to mark it as deleted.

            this.emit('sessionDeleted', { sessionId });

        } catch (error) {
            this.emit('error', { message: 'Failed to delete session', error, sessionId });
            throw error;
        }
    }

    /**
     * Get the appropriate browser launcher
     */
    private getBrowserLauncher() {
        switch (this.config.browserType) {
            case 'firefox':
                return firefox;
            case 'webkit':
                return webkit;
            case 'chromium':
            default:
                return chromium;
        }
    }

    /**
     * Get user agent string
     */
    private getUserAgent(): string {
        const baseUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)';
        
        switch (this.config.browserType) {
            case 'firefox':
                return `${baseUA} Firefox/120.0`;
            case 'webkit':
                return `${baseUA} Version/17.0 Safari/537.36`;
            case 'chromium':
            default:
                return `${baseUA} Chrome/120.0.0.0 Safari/537.36`;
        }
    }

    /**
     * Save session info to disk
     */
    private async saveSessionInfo(): Promise<void> {
        if (!this.sessionInfo) return;

        try {
            const sessionInfoPath = join(this.sessionInfo.userDataDir, 'session-info.json');
            const sessionData = {
                ...this.sessionInfo,
                created: this.sessionInfo.created.toISOString(),
                lastActivity: this.sessionInfo.lastActivity.toISOString()
            };

            writeFileSync(sessionInfoPath, JSON.stringify(sessionData, null, 2));

        } catch (error) {
            this.emit('error', { message: 'Failed to save session info', error });
        }
    }

    /**
     * Load session info from disk
     */
    private async loadSessionInfo(sessionId: string): Promise<SessionInfo | null> {
        try {
            const sessionDataDir = join(this.config.userDataDir, sessionId);
            const sessionInfoPath = join(sessionDataDir, 'session-info.json');

            if (!existsSync(sessionInfoPath)) {
                return null;
            }

            const sessionData = JSON.parse(readFileSync(sessionInfoPath, 'utf8'));
            
            return {
                ...sessionData,
                created: new Date(sessionData.created),
                lastActivity: new Date(sessionData.lastActivity)
            };

        } catch (error) {
            this.emit('error', { message: 'Failed to load session info', error, sessionId });
            return null;
        }
    }

    /**
     * Update last activity timestamp
     */
    private async updateActivity(): Promise<void> {
        if (this.sessionInfo) {
            this.sessionInfo.lastActivity = new Date();
            
            if (this.config.persistSession) {
                await this.saveSessionInfo();
            }
        }
    }
}

export default BrowserSessionManager;