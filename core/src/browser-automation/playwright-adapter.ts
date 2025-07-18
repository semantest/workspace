/*
                        Semantest - Playwright Browser Automation Adapter
                        Playwright-based implementation of browser automation

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { BaseBrowserAutomationAdapter } from './base-adapter';
import {
    NavigationOptions,
    FormInputOptions,
    ClickOptions,
    ScreenshotOptions,
    SelectorOptions,
    BrowserAutomationError
} from './interfaces';

/**
 * Playwright-based browser automation adapter
 * 
 * This adapter provides a Playwright implementation of the browser
 * automation interface. It will be used when Playwright is available
 * in the environment.
 */
export class PlaywrightBrowserAdapter extends BaseBrowserAutomationAdapter {
    private browser: any = null;
    private context: any = null;
    private page: any = null;
    private playwright: any = null;

    /**
     * Initialize Playwright browser
     */
    protected async doInitialize(): Promise<void> {
        try {
            // Dynamic import to avoid hard dependency
            const { chromium } = await import('playwright');
            this.playwright = { chromium };

            const launchOptions: any = {
                headless: this.config.headless,
                args: this.config.args,
                executablePath: this.config.executablePath,
                slowMo: this.config.slowMo
            };

            this.browser = await this.playwright.chromium.launch(launchOptions);

            const contextOptions: any = {
                viewport: this.config.viewport,
                userAgent: this.config.userAgent
            };

            if (this.config.downloadsPath) {
                contextOptions.acceptDownloads = true;
                contextOptions.downloadsPath = this.config.downloadsPath;
            }

            this.context = await this.browser.newContext(contextOptions);
            this.page = await this.context.newPage();

            // Set default timeout
            if (this.config.timeout) {
                this.page.setDefaultTimeout(this.config.timeout);
            }
        } catch (error) {
            throw new BrowserAutomationError(
                'Failed to initialize Playwright',
                'PLAYWRIGHT_INIT_ERROR',
                error
            );
        }
    }

    /**
     * Navigate to URL
     */
    protected async doNavigate(url: string, options?: NavigationOptions): Promise<void> {
        try {
            const navOptions: any = {
                timeout: options?.timeout ?? this.config.timeout,
                waitUntil: options?.waitUntil ?? 'load'
            };

            await this.page.goto(url, navOptions);
        } catch (error) {
            throw new BrowserAutomationError(
                'Navigation failed',
                'NAVIGATION_ERROR',
                error
            );
        }
    }

    /**
     * Fill form input
     */
    protected async doFillInput(options: FormInputOptions): Promise<void> {
        try {
            const element = await this.findElement(options);

            if (options.clear) {
                await element.clear();
            }

            await element.type(options.value, {
                delay: options.delay ?? 0
            });
        } catch (error) {
            throw new BrowserAutomationError(
                'Failed to fill input',
                'FILL_INPUT_ERROR',
                error
            );
        }
    }

    /**
     * Click element
     */
    protected async doClick(options: ClickOptions): Promise<void> {
        try {
            const element = await this.findElement(options);

            await element.click({
                button: options.button ?? 'left',
                clickCount: options.clickCount ?? 1,
                delay: options.delay ?? 0
            });
        } catch (error) {
            throw new BrowserAutomationError(
                'Failed to click element',
                'CLICK_ERROR',
                error
            );
        }
    }

    /**
     * Take screenshot
     */
    protected async doScreenshot(options?: ScreenshotOptions): Promise<Buffer> {
        try {
            const screenshotOptions: any = {
                type: options?.type ?? 'png',
                fullPage: options?.fullPage ?? false
            };

            if (options?.quality && options.type === 'jpeg') {
                screenshotOptions.quality = options.quality;
            }

            let screenshot: Buffer;

            if (options?.selector) {
                const element = await this.findElement({ selector: options.selector });
                screenshot = await element.screenshot(screenshotOptions);
            } else {
                screenshot = await this.page.screenshot(screenshotOptions);
            }

            if (options?.path) {
                const fs = await import('fs/promises');
                await fs.writeFile(options.path, screenshot);
            }

            return screenshot;
        } catch (error) {
            throw new BrowserAutomationError(
                'Failed to take screenshot',
                'SCREENSHOT_ERROR',
                error
            );
        }
    }

    /**
     * Get page content
     */
    protected async doGetContent(): Promise<string> {
        try {
            return await this.page.content();
        } catch (error) {
            throw new BrowserAutomationError(
                'Failed to get page content',
                'GET_CONTENT_ERROR',
                error
            );
        }
    }

    /**
     * Get page title
     */
    protected async doGetTitle(): Promise<string> {
        try {
            return await this.page.title();
        } catch (error) {
            throw new BrowserAutomationError(
                'Failed to get page title',
                'GET_TITLE_ERROR',
                error
            );
        }
    }

    /**
     * Wait for element
     */
    protected async doWaitForElement(options: SelectorOptions): Promise<void> {
        try {
            const timeout = options.timeout ?? this.config.timeout;

            if (options.selector) {
                await this.page.waitForSelector(options.selector, { timeout });
            } else if (options.xpath) {
                await this.page.waitForSelector(`xpath=${options.xpath}`, { timeout });
            } else if (options.text) {
                await this.page.waitForSelector(`text="${options.text}"`, { timeout });
            }
        } catch (error) {
            throw new BrowserAutomationError(
                'Timeout waiting for element',
                'WAIT_TIMEOUT',
                error
            );
        }
    }

    /**
     * Close browser
     */
    protected async doClose(): Promise<void> {
        try {
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
                this.context = null;
                this.page = null;
            }
        } catch (error) {
            throw new BrowserAutomationError(
                'Failed to close browser',
                'CLOSE_ERROR',
                error
            );
        }
    }

    /**
     * Find element using various selectors
     */
    private async findElement(options: SelectorOptions): Promise<any> {
        const timeout = options.timeout ?? this.config.timeout;

        try {
            if (options.selector) {
                return await this.page.waitForSelector(options.selector, { timeout });
            } else if (options.xpath) {
                return await this.page.waitForSelector(`xpath=${options.xpath}`, { timeout });
            } else if (options.text) {
                return await this.page.waitForSelector(`text="${options.text}"`, { timeout });
            }

            throw new Error('No selector provided');
        } catch (error) {
            throw new BrowserAutomationError(
                'Element not found',
                'ELEMENT_NOT_FOUND',
                error
            );
        }
    }

    /**
     * Check if Playwright is available
     */
    static async isAvailable(): Promise<boolean> {
        try {
            await import('playwright');
            return true;
        } catch {
            return false;
        }
    }
}