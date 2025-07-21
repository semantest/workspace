"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserAdapterFactory = exports.BrowserAdapterType = void 0;
const playwright_adapter_1 = require("./playwright-adapter");
const browser_mcp_adapter_1 = require("./browser-mcp-adapter");
var BrowserAdapterType;
(function (BrowserAdapterType) {
    BrowserAdapterType["PLAYWRIGHT"] = "playwright";
    BrowserAdapterType["BROWSER_MCP"] = "browser-mcp";
    BrowserAdapterType["AUTO"] = "auto";
})(BrowserAdapterType || (exports.BrowserAdapterType = BrowserAdapterType = {}));
class BrowserAdapterFactory {
    static async create(type = BrowserAdapterType.AUTO, config) {
        let adapter;
        switch (type) {
            case BrowserAdapterType.PLAYWRIGHT:
                adapter = await this.createPlaywrightAdapter();
                break;
            case BrowserAdapterType.BROWSER_MCP:
                adapter = await this.createBrowserMCPAdapter();
                break;
            case BrowserAdapterType.AUTO:
            default:
                adapter = await this.createBestAvailableAdapter();
                break;
        }
        await adapter.initialize(config);
        return adapter;
    }
    static async getInstance(key, type = BrowserAdapterType.AUTO, config) {
        if (!this.adapters.has(key)) {
            const adapter = await this.create(type, config);
            this.adapters.set(key, adapter);
        }
        return this.adapters.get(key);
    }
    static async closeInstance(key) {
        const adapter = this.adapters.get(key);
        if (adapter) {
            await adapter.close();
            this.adapters.delete(key);
        }
    }
    static async closeAll() {
        const closePromises = Array.from(this.adapters.entries()).map(async ([key, adapter]) => {
            await adapter.close();
            this.adapters.delete(key);
        });
        await Promise.all(closePromises);
    }
    static async createPlaywrightAdapter() {
        const isAvailable = await playwright_adapter_1.PlaywrightBrowserAdapter.isAvailable();
        if (!isAvailable) {
            throw new Error('Playwright is not available. Please install it with: npm install playwright');
        }
        return new playwright_adapter_1.PlaywrightBrowserAdapter();
    }
    static async createBrowserMCPAdapter() {
        const isAvailable = await browser_mcp_adapter_1.BrowserMCPAdapter.isAvailable();
        if (!isAvailable) {
            throw new Error('Browser MCP is not available');
        }
        return new browser_mcp_adapter_1.BrowserMCPAdapter();
    }
    static async createBestAvailableAdapter() {
        try {
            if (await playwright_adapter_1.PlaywrightBrowserAdapter.isAvailable()) {
                return new playwright_adapter_1.PlaywrightBrowserAdapter();
            }
        }
        catch {
        }
        if (await browser_mcp_adapter_1.BrowserMCPAdapter.isAvailable()) {
            return new browser_mcp_adapter_1.BrowserMCPAdapter();
        }
        throw new Error('No browser automation adapter available. Please install Playwright or ensure Browser MCP is running.');
    }
    static async getAvailableAdapters() {
        const available = [];
        if (await playwright_adapter_1.PlaywrightBrowserAdapter.isAvailable()) {
            available.push(BrowserAdapterType.PLAYWRIGHT);
        }
        if (await browser_mcp_adapter_1.BrowserMCPAdapter.isAvailable()) {
            available.push(BrowserAdapterType.BROWSER_MCP);
        }
        return available;
    }
    static async isAdapterAvailable(type) {
        switch (type) {
            case BrowserAdapterType.PLAYWRIGHT:
                return await playwright_adapter_1.PlaywrightBrowserAdapter.isAvailable();
            case BrowserAdapterType.BROWSER_MCP:
                return await browser_mcp_adapter_1.BrowserMCPAdapter.isAvailable();
            case BrowserAdapterType.AUTO:
                const available = await this.getAvailableAdapters();
                return available.length > 0;
            default:
                return false;
        }
    }
}
exports.BrowserAdapterFactory = BrowserAdapterFactory;
BrowserAdapterFactory.adapters = new Map();
//# sourceMappingURL=browser-adapter-factory.js.map