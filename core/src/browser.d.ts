export declare enum SelectorStrategy {
    CSS = "css",
    XPATH = "xpath",
    TEXT = "text",
    ATTRIBUTE = "attribute"
}
export interface SelectorConfig {
    strategy: SelectorStrategy;
    selector: string;
    timeout?: number;
    visible?: boolean;
    enabled?: boolean;
}
export interface BrowserElement {
    click(): Promise<void>;
    type(text: string): Promise<void>;
    getText(): Promise<string>;
    getAttribute(name: string): Promise<string | null>;
    isVisible(): Promise<boolean>;
    isEnabled(): Promise<boolean>;
    getSelector(): string;
    getTagName(): Promise<string>;
    getParent(): Promise<BrowserElement | null>;
    getChildren(): Promise<BrowserElement[]>;
}
export interface BrowserAutomation {
    navigate(url: string): Promise<void>;
    getUrl(): Promise<string>;
    getTitle(): Promise<string>;
    findElement(config: SelectorConfig): Promise<BrowserElement | null>;
    findElements(config: SelectorConfig): Promise<BrowserElement[]>;
    waitForElement(config: SelectorConfig): Promise<BrowserElement>;
    screenshot(options?: ScreenshotOptions): Promise<Buffer>;
    evaluate(script: string): Promise<any>;
    close(): Promise<void>;
}
export interface ScreenshotOptions {
    fullPage?: boolean;
    element?: BrowserElement;
    clip?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    quality?: number;
    type?: 'png' | 'jpeg';
}
export interface BrowserContext {
    newPage(): Promise<BrowserAutomation>;
    close(): Promise<void>;
    pages(): Promise<BrowserAutomation[]>;
    cookies(): Promise<Cookie[]>;
    setCookie(cookie: Cookie): Promise<void>;
    clearCookies(): Promise<void>;
}
export interface Cookie {
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: Date;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
}
export interface BrowserLaunchOptions {
    headless?: boolean;
    devtools?: boolean;
    slowMo?: number;
    timeout?: number;
    userAgent?: string;
    viewport?: {
        width: number;
        height: number;
    };
    executablePath?: string;
    args?: string[];
}
export interface BrowserFactory {
    createBrowser(options?: BrowserLaunchOptions): Promise<BrowserContext>;
    createPage(context: BrowserContext): Promise<BrowserAutomation>;
}
export declare class SelectorGenerator {
    static generateCssSelector(element: any): string;
    static generateXPathSelector(element: any): string;
    static generateTextSelector(element: any): string | null;
}
export declare class BrowserUtils {
    static waitForVisible(browser: BrowserAutomation, selector: string, timeout?: number): Promise<BrowserElement | null>;
    static waitForEnabled(browser: BrowserAutomation, selector: string, timeout?: number): Promise<BrowserElement | null>;
    static sleep(ms: number): Promise<void>;
    static extractImageInfo(element: any): ImageInfo | null;
    static isGoogleImagesThumbnail(url: string): boolean;
    static isDirectImageUrl(url: string): boolean;
}
export interface ImageInfo {
    src: string;
    alt: string;
    width: number;
    height: number;
    title: string;
}
//# sourceMappingURL=browser.d.ts.map