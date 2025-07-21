import { BaseBrowserAutomationAdapter } from './base-adapter';
import { NavigationOptions, FormInputOptions, ClickOptions, ScreenshotOptions, SelectorOptions } from './interfaces';
export declare class PlaywrightBrowserAdapter extends BaseBrowserAutomationAdapter {
    private browser;
    private context;
    private page;
    private playwright;
    protected doInitialize(): Promise<void>;
    protected doNavigate(url: string, options?: NavigationOptions): Promise<void>;
    protected doFillInput(options: FormInputOptions): Promise<void>;
    protected doClick(options: ClickOptions): Promise<void>;
    protected doScreenshot(options?: ScreenshotOptions): Promise<Buffer>;
    protected doGetContent(): Promise<string>;
    protected doGetTitle(): Promise<string>;
    protected doWaitForElement(options: SelectorOptions): Promise<void>;
    protected doClose(): Promise<void>;
    private findElement;
    static isAvailable(): Promise<boolean>;
}
//# sourceMappingURL=playwright-adapter.d.ts.map