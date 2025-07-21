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
exports.BrowserMCPAdapter = void 0;
const base_adapter_1 = require("./base-adapter");
const interfaces_1 = require("./interfaces");
class BrowserMCPAdapter extends base_adapter_1.BaseBrowserAutomationAdapter {
    constructor() {
        super(...arguments);
        this.mcpClient = null;
        this.sessionActive = false;
    }
    async doInitialize() {
        try {
            this.mcpClient = {
                isConnected: () => true,
                navigate: async (url) => {
                    console.log(`[Browser MCP] Navigating to: ${url}`);
                },
                fillInput: async (selector, value) => {
                    console.log(`[Browser MCP] Filling input ${selector} with: ${value}`);
                },
                click: async (selector) => {
                    console.log(`[Browser MCP] Clicking: ${selector}`);
                },
                screenshot: async (options) => {
                    console.log(`[Browser MCP] Taking screenshot`);
                    return Buffer.from('mock-screenshot-data');
                },
                getContent: async () => {
                    return '<html><body>Mock content</body></html>';
                },
                getTitle: async () => {
                    return 'Mock Page Title';
                },
                close: async () => {
                    console.log('[Browser MCP] Closing browser');
                }
            };
            this.sessionActive = true;
        }
        catch (error) {
            throw new interfaces_1.BrowserAutomationError('Failed to initialize Browser MCP', 'MCP_INIT_ERROR', error);
        }
    }
    async doNavigate(url, options) {
        try {
            await this.mcpClient.navigate(url);
            if (options?.waitUntil === 'networkidle') {
                await this.sleep(2000);
            }
        }
        catch (error) {
            throw new interfaces_1.BrowserAutomationError('Navigation failed', 'NAVIGATION_ERROR', error);
        }
    }
    async doFillInput(options) {
        try {
            const selector = this.buildSelector(options);
            if (options.clear) {
                await this.mcpClient.fillInput(selector, '');
            }
            await this.mcpClient.fillInput(selector, options.value);
        }
        catch (error) {
            throw new interfaces_1.BrowserAutomationError('Failed to fill input', 'FILL_INPUT_ERROR', error);
        }
    }
    async doClick(options) {
        try {
            const selector = this.buildSelector(options);
            for (let i = 0; i < (options.clickCount ?? 1); i++) {
                await this.mcpClient.click(selector);
                if (options.delay && i < (options.clickCount ?? 1) - 1) {
                    await this.sleep(options.delay);
                }
            }
        }
        catch (error) {
            throw new interfaces_1.BrowserAutomationError('Failed to click element', 'CLICK_ERROR', error);
        }
    }
    async doScreenshot(options) {
        try {
            const screenshotData = await this.mcpClient.screenshot({
                fullPage: options?.fullPage,
                selector: options?.selector,
                type: options?.type,
                quality: options?.quality
            });
            if (options?.path) {
                const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
                await fs.writeFile(options.path, screenshotData);
            }
            return screenshotData;
        }
        catch (error) {
            throw new interfaces_1.BrowserAutomationError('Failed to take screenshot', 'SCREENSHOT_ERROR', error);
        }
    }
    async doGetContent() {
        try {
            return await this.mcpClient.getContent();
        }
        catch (error) {
            throw new interfaces_1.BrowserAutomationError('Failed to get page content', 'GET_CONTENT_ERROR', error);
        }
    }
    async doGetTitle() {
        try {
            return await this.mcpClient.getTitle();
        }
        catch (error) {
            throw new interfaces_1.BrowserAutomationError('Failed to get page title', 'GET_TITLE_ERROR', error);
        }
    }
    async doWaitForElement(options) {
        const timeout = options.timeout ?? this.config.timeout ?? 30000;
        const startTime = Date.now();
        const selector = this.buildSelector(options);
        while (Date.now() - startTime < timeout) {
            try {
                await this.sleep(100);
                if (Date.now() - startTime > 500) {
                    return;
                }
            }
            catch {
            }
        }
        throw new interfaces_1.BrowserAutomationError('Timeout waiting for element', 'WAIT_TIMEOUT');
    }
    async doClose() {
        try {
            if (this.mcpClient && this.sessionActive) {
                await this.mcpClient.close();
                this.mcpClient = null;
                this.sessionActive = false;
            }
        }
        catch (error) {
            throw new interfaces_1.BrowserAutomationError('Failed to close browser', 'CLOSE_ERROR', error);
        }
    }
    buildSelector(options) {
        if (options.selector) {
            return options.selector;
        }
        else if (options.xpath) {
            return `xpath:${options.xpath}`;
        }
        else if (options.text) {
            return `text:${options.text}`;
        }
        throw new Error('No selector provided');
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    static async isAvailable() {
        return true;
    }
}
exports.BrowserMCPAdapter = BrowserMCPAdapter;
//# sourceMappingURL=browser-mcp-adapter.js.map