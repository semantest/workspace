"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaywrightBrowserAdapter = void 0;
const base_adapter_1 = require("./base-adapter");
const interfaces_1 = require("./interfaces");
class PlaywrightBrowserAdapter extends base_adapter_1.BaseBrowserAutomationAdapter {
    constructor() {
        super(...arguments);
        this.browser = null;
        this.context = null;
        this.page = null;
        this.playwright = null;
    }
    async doInitialize() {
        try {
            const { chromium } = await Promise.resolve().then(() => __importStar(require('playwright')));
            this.playwright = { chromium };
            const launchOptions = {
                headless: this.config.headless,
                args: this.config.args,
                executablePath: this.config.executablePath,
                slowMo: this.config.slowMo
            };
            this.browser = await this.playwright.chromium.launch(launchOptions);
            const contextOptions = {
                viewport: this.config.viewport,
                userAgent: this.config.userAgent
            };
            if (this.config.downloadsPath) {
                contextOptions.acceptDownloads = true;
                contextOptions.downloadsPath = this.config.downloadsPath;
            }
            this.context = await this.browser.newContext(contextOptions);
            this.page = await this.context.newPage();
            if (this.config.timeout) {
                this.page.setDefaultTimeout(this.config.timeout);
            }
        }
        catch (error) {
            throw new interfaces_1.BrowserAutomationError('Failed to initialize Playwright', 'PLAYWRIGHT_INIT_ERROR', error);
        }
    }
    async doNavigate(url, options) {
        try {
            const navOptions = {
                timeout: options?.timeout ?? this.config.timeout,
                waitUntil: options?.waitUntil ?? 'load'
            };
            await this.page.goto(url, navOptions);
        }
        catch (error) {
            throw new interfaces_1.BrowserAutomationError('Navigation failed', 'NAVIGATION_ERROR', error);
        }
    }
    async doFillInput(options) {
        try {
            const element = await this.findElement(options);
            if (options.clear) {
                await element.clear();
            }
            await element.type(options.value, {
                delay: options.delay ?? 0
            });
        }
        catch (error) {
            throw new interfaces_1.BrowserAutomationError('Failed to fill input', 'FILL_INPUT_ERROR', error);
        }
    }
    async doClick(options) {
        try {
            const element = await this.findElement(options);
            await element.click({
                button: options.button ?? 'left',
                clickCount: options.clickCount ?? 1,
                delay: options.delay ?? 0
            });
        }
        catch (error) {
            throw new interfaces_1.BrowserAutomationError('Failed to click element', 'CLICK_ERROR', error);
        }
    }
    async doScreenshot(options) {
        try {
            const screenshotOptions = {
                type: options?.type ?? 'png',
                fullPage: options?.fullPage ?? false
            };
            if (options?.quality && options.type === 'jpeg') {
                screenshotOptions.quality = options.quality;
            }
            let screenshot;
            if (options?.selector) {
                const element = await this.findElement({ selector: options.selector });
                screenshot = await element.screenshot(screenshotOptions);
            }
            else {
                screenshot = await this.page.screenshot(screenshotOptions);
            }
            if (options?.path) {
                const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
                await fs.writeFile(options.path, screenshot);
            }
            return screenshot;
        }
        catch (error) {
            throw new interfaces_1.BrowserAutomationError('Failed to take screenshot', 'SCREENSHOT_ERROR', error);
        }
    }
    async doGetContent() {
        try {
            return await this.page.content();
        }
        catch (error) {
            throw new interfaces_1.BrowserAutomationError('Failed to get page content', 'GET_CONTENT_ERROR', error);
        }
    }
    async doGetTitle() {
        try {
            return await this.page.title();
        }
        catch (error) {
            throw new interfaces_1.BrowserAutomationError('Failed to get page title', 'GET_TITLE_ERROR', error);
        }
    }
    async doWaitForElement(options) {
        try {
            const timeout = options.timeout ?? this.config.timeout;
            if (options.selector) {
                await this.page.waitForSelector(options.selector, { timeout });
            }
            else if (options.xpath) {
                await this.page.waitForSelector(`xpath=${options.xpath}`, { timeout });
            }
            else if (options.text) {
                await this.page.waitForSelector(`text="${options.text}"`, { timeout });
            }
        }
        catch (error) {
            throw new interfaces_1.BrowserAutomationError('Timeout waiting for element', 'WAIT_TIMEOUT', error);
        }
    }
    async doClose() {
        try {
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
                this.context = null;
                this.page = null;
            }
        }
        catch (error) {
            throw new interfaces_1.BrowserAutomationError('Failed to close browser', 'CLOSE_ERROR', error);
        }
    }
    async findElement(options) {
        const timeout = options.timeout ?? this.config.timeout;
        try {
            if (options.selector) {
                return await this.page.waitForSelector(options.selector, { timeout });
            }
            else if (options.xpath) {
                return await this.page.waitForSelector(`xpath=${options.xpath}`, { timeout });
            }
            else if (options.text) {
                return await this.page.waitForSelector(`text="${options.text}"`, { timeout });
            }
            throw new Error('No selector provided');
        }
        catch (error) {
            throw new interfaces_1.BrowserAutomationError('Element not found', 'ELEMENT_NOT_FOUND', error);
        }
    }
    static async isAvailable() {
        try {
            await Promise.resolve().then(() => __importStar(require('playwright')));
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.PlaywrightBrowserAdapter = PlaywrightBrowserAdapter;
//# sourceMappingURL=playwright-adapter.js.map