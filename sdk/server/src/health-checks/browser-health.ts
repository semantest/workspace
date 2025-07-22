import * as fs from 'fs';
import { execSync } from 'child_process';

/**
 * Browser Health Check - Server Layer
 * ONLY responsible for checking if a browser executable exists
 * Does NOT care about tabs, sessions, or any browser state
 */
export class BrowserHealthCheck {
  private browserPaths = [
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    // Windows (when running in WSL or checking common paths)
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];

  // Cache for browser path (60 seconds TTL)
  private cachedBrowserPath: string | null | undefined;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL_MS = 60 * 1000; // 60 seconds

  // Retry configuration
  private readonly RETRY_DELAYS = [1000, 2000, 4000]; // 1s, 2s, 4s

  /**
   * Check if browser can be launched
   * This is the ONLY responsibility of this health check
   */
  async canLaunchBrowser(): Promise<boolean> {
    try {
      const browserPath = await this.findBrowserExecutable();
      return !!browserPath;
    } catch {
      return false;
    }
  }

  /**
   * Get browser executable path
   */
  async getBrowserPath(): Promise<string | null> {
    return this.findBrowserExecutable();
  }

  /**
   * Find the first available browser executable with caching
   */
  private async findBrowserExecutable(): Promise<string | null> {
    // Check cache first
    const now = Date.now();
    if (this.cachedBrowserPath !== undefined && 
        (now - this.cacheTimestamp) < this.CACHE_TTL_MS) {
      return this.cachedBrowserPath;
    }

    // Try to find browser with retry logic
    for (let attempt = 0; attempt <= this.RETRY_DELAYS.length; attempt++) {
      try {
        const browserPath = await this.findBrowserExecutableOnce();
        
        // Cache the result
        this.cachedBrowserPath = browserPath;
        this.cacheTimestamp = now;
        
        return browserPath;
      } catch (error) {
        // If this isn't the last attempt, wait before retrying
        if (attempt < this.RETRY_DELAYS.length) {
          await this.sleep(this.RETRY_DELAYS[attempt]);
        }
      }
    }

    // All attempts failed, cache the null result
    this.cachedBrowserPath = null;
    this.cacheTimestamp = now;
    
    return null;
  }

  /**
   * Single attempt to find browser executable
   */
  private async findBrowserExecutableOnce(): Promise<string | null> {
    // Check environment variable first
    if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
      return process.env.CHROME_PATH;
    }

    // Check common paths
    for (const browserPath of this.browserPaths) {
      if (fs.existsSync(browserPath)) {
        return browserPath;
      }
    }

    // Try to find chrome/chromium in PATH
    try {
      const whichChrome = execSync('which google-chrome || which chromium || which chrome', {
        encoding: 'utf8'
      }).trim();
      if (whichChrome && fs.existsSync(whichChrome)) {
        return whichChrome;
      }
    } catch {
      // Command failed, continue checking
    }

    return null;
  }

  /**
   * Sleep for the specified number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get health status for this component
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const canLaunch = await this.canLaunchBrowser();
    const browserPath = await this.getBrowserPath();

    return {
      component: 'server',
      healthy: canLaunch,
      message: canLaunch 
        ? `Browser available at: ${browserPath}`
        : 'No browser executable found',
      action: canLaunch
        ? undefined
        : 'Install Chrome or Chromium, or set CHROME_PATH environment variable'
    };
  }
}

/**
 * Health status interface used across all layers
 */
export interface HealthStatus {
  component: 'server' | 'extension' | 'addon';
  healthy: boolean;
  message?: string;
  action?: string;
  childHealth?: HealthStatus;
}