import { IBrowserAutomationAdapter, BrowserConfig } from './interfaces';
export declare enum BrowserAdapterType {
    PLAYWRIGHT = "playwright",
    BROWSER_MCP = "browser-mcp",
    AUTO = "auto"
}
export declare class BrowserAdapterFactory {
    private static adapters;
    static create(type?: BrowserAdapterType, config?: BrowserConfig): Promise<IBrowserAutomationAdapter>;
    static getInstance(key: string, type?: BrowserAdapterType, config?: BrowserConfig): Promise<IBrowserAutomationAdapter>;
    static closeInstance(key: string): Promise<void>;
    static closeAll(): Promise<void>;
    private static createPlaywrightAdapter;
    private static createBrowserMCPAdapter;
    private static createBestAvailableAdapter;
    static getAvailableAdapters(): Promise<BrowserAdapterType[]>;
    static isAdapterAvailable(type: BrowserAdapterType): Promise<boolean>;
}
//# sourceMappingURL=browser-adapter-factory.d.ts.map