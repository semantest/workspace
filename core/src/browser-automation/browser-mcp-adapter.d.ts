import { BaseBrowserAutomationAdapter } from './base-adapter';
import { NavigationOptions, FormInputOptions, ClickOptions, ScreenshotOptions, SelectorOptions } from './interfaces';
export declare class BrowserMCPAdapter extends BaseBrowserAutomationAdapter {
    private mcpClient;
    private sessionActive;
    protected doInitialize(): Promise<void>;
    protected doNavigate(url: string, options?: NavigationOptions): Promise<void>;
    protected doFillInput(options: FormInputOptions): Promise<void>;
    protected doClick(options: ClickOptions): Promise<void>;
    protected doScreenshot(options?: ScreenshotOptions): Promise<Buffer>;
    protected doGetContent(): Promise<string>;
    protected doGetTitle(): Promise<string>;
    protected doWaitForElement(options: SelectorOptions): Promise<void>;
    protected doClose(): Promise<void>;
    private buildSelector;
    private sleep;
    static isAvailable(): Promise<boolean>;
}
//# sourceMappingURL=browser-mcp-adapter.d.ts.map