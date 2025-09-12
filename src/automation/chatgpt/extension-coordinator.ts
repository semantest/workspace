/*
                        Semantest - Extension Coordinator
                        Coordinates between Playwright automation and browser extension

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { Page } from 'playwright';
import { EventEmitter } from 'events';
import { WebSocket } from 'ws';

export interface ExtensionMessage {
    type: 'automation-request' | 'automation-response' | 'status-update' | 'image-generated' | 'error';
    id?: string;
    payload?: any;
    timestamp?: string;
}

export interface CoordinatorConfig {
    websocketPort?: number;
    extensionId?: string;
    timeout?: number;
    retryAttempts?: number;
}

/**
 * Extension Coordinator
 * 
 * Manages communication between Playwright automation and the browser extension
 * for coordinated ChatGPT image generation workflows.
 */
export class ExtensionCoordinator extends EventEmitter {
    private page: Page | null = null;
    private websocket: WebSocket | null = null;
    private config: Required<CoordinatorConfig>;
    private isConnected = false;
    private messageQueue: ExtensionMessage[] = [];
    private pendingRequests = new Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }>();

    constructor(config: CoordinatorConfig = {}) {
        super();

        this.config = {
            websocketPort: config.websocketPort ?? 8081,
            extensionId: config.extensionId ?? 'chatgpt-automation-extension',
            timeout: config.timeout ?? 30000,
            retryAttempts: config.retryAttempts ?? 3
        };
    }

    /**
     * Initialize coordinator with page instance
     */
    async initialize(page: Page): Promise<void> {
        try {
            this.page = page;
            
            // Setup page-extension communication
            await this.setupPageCommunication();
            
            // Setup WebSocket communication
            await this.setupWebSocketCommunication();

            this.emit('initialized');
            this.emit('status', { message: 'Extension coordinator initialized', type: 'success' });

        } catch (error) {
            this.emit('error', { message: 'Failed to initialize extension coordinator', error });
            throw error;
        }
    }

    /**
     * Setup communication with the browser extension through the page
     */
    private async setupPageCommunication(): Promise<void> {
        if (!this.page) throw new Error('Page not available');

        try {
            // Inject communication script
            await this.page.addInitScript(() => {
                // Create a custom event system for Playwright-Extension communication
                window.playwrightExtensionBridge = {
                    sendMessage: (message: any) => {
                        window.dispatchEvent(new CustomEvent('playwright-to-extension', {
                            detail: message
                        }));
                    },
                    
                    onMessage: (callback: (message: any) => void) => {
                        window.addEventListener('extension-to-playwright', (event: any) => {
                            callback(event.detail);
                        });
                    }
                };

                // Notify extension that Playwright is ready
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('playwright-ready', {
                        detail: { timestamp: Date.now() }
                    }));
                }, 1000);
            });

            // Listen for messages from extension
            await this.page.exposeFunction('handleExtensionMessage', (message: ExtensionMessage) => {
                this.handleExtensionMessage(message);
            });

            // Setup message listener
            await this.page.evaluate(() => {
                window.addEventListener('extension-to-playwright', (event: any) => {
                    if (typeof window.handleExtensionMessage === 'function') {
                        window.handleExtensionMessage(event.detail);
                    }
                });
            });

        } catch (error) {
            throw new Error(`Failed to setup page communication: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Setup WebSocket communication
     */
    private async setupWebSocketCommunication(): Promise<void> {
        try {
            // For now, we'll use the page-based communication
            // WebSocket can be added later for more robust communication
            this.isConnected = true;

        } catch (error) {
            throw new Error(`Failed to setup WebSocket communication: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Send message to extension
     */
    async sendToExtension(message: ExtensionMessage): Promise<ExtensionMessage | void> {
        if (!this.isConnected || !this.page) {
            throw new Error('Coordinator not connected');
        }

        try {
            // Add message ID and timestamp
            const messageWithId: ExtensionMessage = {
                ...message,
                id: message.id || `msg-${Date.now()}-${Math.random()}`,
                timestamp: new Date().toISOString()
            };

            // For request/response pattern
            if (message.type === 'automation-request') {
                return new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        this.pendingRequests.delete(messageWithId.id!);
                        reject(new Error('Message timeout'));
                    }, this.config.timeout);

                    this.pendingRequests.set(messageWithId.id!, { resolve, reject, timeout });

                    // Send message to extension via page
                    this.page!.evaluate((msg) => {
                        if (window.playwrightExtensionBridge) {
                            window.playwrightExtensionBridge.sendMessage(msg);
                        }
                    }, messageWithId);
                });
            } else {
                // Fire and forget messages
                await this.page.evaluate((msg) => {
                    if (window.playwrightExtensionBridge) {
                        window.playwrightExtensionBridge.sendMessage(msg);
                    }
                }, messageWithId);
            }

        } catch (error) {
            throw new Error(`Failed to send message to extension: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Handle message from extension
     */
    private handleExtensionMessage(message: ExtensionMessage): void {
        try {
            // Handle response to pending request
            if (message.type === 'automation-response' && message.id) {
                const pending = this.pendingRequests.get(message.id);
                if (pending) {
                    clearTimeout(pending.timeout);
                    this.pendingRequests.delete(message.id);
                    pending.resolve(message);
                    return;
                }
            }

            // Handle error responses
            if (message.type === 'error' && message.id) {
                const pending = this.pendingRequests.get(message.id);
                if (pending) {
                    clearTimeout(pending.timeout);
                    this.pendingRequests.delete(message.id);
                    pending.reject(new Error(message.payload?.error || 'Extension error'));
                    return;
                }
            }

            // Emit message for listeners
            this.emit('extensionMessage', message);

        } catch (error) {
            this.emit('error', { message: 'Error handling extension message', error, originalMessage: message });
        }
    }

    /**
     * Request extension to monitor ChatGPT state
     */
    async requestStateMonitoring(): Promise<void> {
        await this.sendToExtension({
            type: 'automation-request',
            payload: {
                action: 'start-monitoring',
                target: 'chatgpt-state'
            }
        });
    }

    /**
     * Request extension to detect image generation completion
     */
    async requestImageDetection(): Promise<void> {
        await this.sendToExtension({
            type: 'automation-request',
            payload: {
                action: 'detect-images',
                target: 'chatgpt-images'
            }
        });
    }

    /**
     * Notify extension of automation start
     */
    async notifyAutomationStart(prompt: string): Promise<void> {
        await this.sendToExtension({
            type: 'status-update',
            payload: {
                status: 'automation-started',
                prompt: prompt,
                timestamp: Date.now()
            }
        });
    }

    /**
     * Notify extension of automation completion
     */
    async notifyAutomationComplete(results: any): Promise<void> {
        await this.sendToExtension({
            type: 'status-update',
            payload: {
                status: 'automation-complete',
                results: results,
                timestamp: Date.now()
            }
        });
    }

    /**
     * Request extension to enhance image detection
     */
    async requestImageEnhancement(): Promise<any> {
        const response = await this.sendToExtension({
            type: 'automation-request',
            payload: {
                action: 'enhance-image-detection',
                options: {
                    useAdvancedSelectors: true,
                    waitForAnimation: true,
                    validateImageLoad: true
                }
            }
        });

        return response;
    }

    /**
     * Get extension status
     */
    async getExtensionStatus(): Promise<any> {
        try {
            const response = await this.sendToExtension({
                type: 'automation-request',
                payload: {
                    action: 'get-status'
                }
            });

            return response;

        } catch (error) {
            return {
                connected: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Test extension connectivity
     */
    async testConnection(): Promise<boolean> {
        try {
            await this.sendToExtension({
                type: 'automation-request',
                payload: {
                    action: 'ping'
                }
            });

            return true;

        } catch (error) {
            this.emit('error', { message: 'Extension connection test failed', error });
            return false;
        }
    }

    /**
     * Synchronize with extension state
     */
    async synchronizeState(): Promise<void> {
        try {
            // Request current extension state
            const status = await this.getExtensionStatus();
            
            // Update coordinator state based on extension
            if (status && status.payload) {
                this.emit('stateSynchronized', status.payload);
            }

        } catch (error) {
            this.emit('error', { message: 'Failed to synchronize state with extension', error });
        }
    }

    /**
     * Enable coordination mode for image generation
     */
    async enableImageGenerationCoordination(): Promise<void> {
        await this.sendToExtension({
            type: 'automation-request',
            payload: {
                action: 'enable-coordination',
                mode: 'image-generation',
                features: [
                    'prompt-detection',
                    'generation-monitoring',
                    'completion-detection',
                    'download-assistance'
                ]
            }
        });
    }

    /**
     * Disable coordination mode
     */
    async disableCoordination(): Promise<void> {
        await this.sendToExtension({
            type: 'automation-request',
            payload: {
                action: 'disable-coordination'
            }
        });
    }

    /**
     * Get coordination status
     */
    isCoordinationActive(): boolean {
        return this.isConnected;
    }

    /**
     * Close coordinator and cleanup
     */
    async close(): Promise<void> {
        try {
            // Clear pending requests
            for (const [id, pending] of this.pendingRequests.entries()) {
                clearTimeout(pending.timeout);
                pending.reject(new Error('Coordinator closing'));
            }
            this.pendingRequests.clear();

            // Notify extension of shutdown
            if (this.isConnected) {
                try {
                    await this.sendToExtension({
                        type: 'status-update',
                        payload: {
                            status: 'automation-shutdown'
                        }
                    });
                } catch {
                    // Ignore errors during shutdown notification
                }
            }

            // Close WebSocket if exists
            if (this.websocket) {
                this.websocket.close();
                this.websocket = null;
            }

            this.isConnected = false;
            this.page = null;

            this.emit('closed');

        } catch (error) {
            this.emit('error', { message: 'Error during coordinator cleanup', error });
        }
    }
}

export default ExtensionCoordinator;