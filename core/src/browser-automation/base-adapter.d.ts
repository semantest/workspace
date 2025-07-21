import { BrowserConfig, IBrowserAutomationAdapter, NavigationOptions, FormInputOptions, ClickOptions, ScreenshotOptions, SelectorOptions } from './interfaces';
import { BrowserConfigValidator } from './config-validator';
export declare abstract class BaseBrowserAutomationAdapter implements IBrowserAutomationAdapter {
    protected config: BrowserConfig;
    protected initialized: boolean;
    protected validator: BrowserConfigValidator;
    initialize(config?: BrowserConfig): Promise<void>;
    navigate(url: string, options?: NavigationOptions): Promise<void>;
    fillInput(options: FormInputOptions): Promise<void>;
    click(options: ClickOptions): Promise<void>;
    screenshot(options?: ScreenshotOptions): Promise<Buffer>;
    getContent(): Promise<string>;
    getTitle(): Promise<string>;
    waitForElement(options: SelectorOptions): Promise<void>;
    close(): Promise<void>;
    protected ensureInitialized(): void;
    protected validateUrl(url: string): void;
    protected validateSelectorOptions(options: SelectorOptions): void;
    protected abstract doInitialize(): Promise<void>;
    protected abstract doNavigate(url: string, options?: NavigationOptions): Promise<void>;
    protected abstract doFillInput(options: FormInputOptions): Promise<void>;
    protected abstract doClick(options: ClickOptions): Promise<void>;
    protected abstract doScreenshot(options?: ScreenshotOptions): Promise<Buffer>;
    protected abstract doGetContent(): Promise<string>;
    protected abstract doGetTitle(): Promise<string>;
    protected abstract doWaitForElement(options: SelectorOptions): Promise<void>;
    protected abstract doClose(): Promise<void>;
}
//# sourceMappingURL=base-adapter.d.ts.map