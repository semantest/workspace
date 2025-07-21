import { BrowserConfig } from './interfaces';
export declare class BrowserConfigValidator {
    private readonly DANGEROUS_EXECUTABLE_PATHS;
    private readonly DANGEROUS_BROWSER_ARGS;
    private readonly DANGEROUS_DOWNLOAD_PATHS;
    private readonly MAX_TIMEOUT;
    private readonly MAX_VIEWPORT_SIZE;
    private readonly MIN_VIEWPORT_SIZE;
    validateConfig(config: BrowserConfig): void;
    private validateTimeout;
    private validateUserAgent;
    private validateViewport;
    private validateExecutablePath;
    private validateBrowserArgs;
    private validateDownloadsPath;
    private validateUserDataDir;
    private checkPathTraversal;
}
//# sourceMappingURL=config-validator.d.ts.map