export interface BrowserConfig {
    timeout?: number;
    userAgent?: string;
    viewport?: ViewportSize;
    executablePath?: string;
    args?: string[];
    downloadsPath?: string;
    userDataDir?: string;
    headless?: boolean;
    slowMo?: number;
}
export interface ViewportSize {
    width: number;
    height: number;
}
export interface NavigationOptions {
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
    timeout?: number;
}
export interface SelectorOptions {
    selector?: string;
    xpath?: string;
    text?: string;
    timeout?: number;
}
export interface FormInputOptions extends SelectorOptions {
    value: string;
    clear?: boolean;
    delay?: number;
}
export interface ClickOptions extends SelectorOptions {
    clickCount?: number;
    button?: 'left' | 'right' | 'middle';
    delay?: number;
}
export interface ScreenshotOptions {
    path?: string;
    fullPage?: boolean;
    selector?: string;
    type?: 'png' | 'jpeg';
    quality?: number;
}
export interface IBrowserAutomationAdapter {
    initialize(config?: BrowserConfig): Promise<void>;
    navigate(url: string, options?: NavigationOptions): Promise<void>;
    fillInput(options: FormInputOptions): Promise<void>;
    click(options: ClickOptions): Promise<void>;
    screenshot(options?: ScreenshotOptions): Promise<Buffer>;
    getContent(): Promise<string>;
    getTitle(): Promise<string>;
    waitForElement(options: SelectorOptions): Promise<void>;
    close(): Promise<void>;
}
export declare class BrowserAutomationError extends Error {
    readonly code: string;
    readonly details?: any | undefined;
    constructor(message: string, code: string, details?: any | undefined);
}
//# sourceMappingURL=interfaces.d.ts.map