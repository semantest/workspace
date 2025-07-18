import { getSyncService } from './sync-service';
import { offlinePatterns } from './offline-first-patterns';

export type NetworkState = 'online' | 'offline' | 'flaky' | 'slow';
export type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

export interface NetworkMetrics {
  rtt: number; // Round-trip time in ms
  downlink: number; // Downlink speed in Mbps
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
  saveData: boolean;
}

export interface NetworkStateListener {
  onStateChange: (state: NetworkState) => void;
  onQualityChange: (quality: NetworkQuality) => void;
  onTransition: (from: NetworkState, to: NetworkState) => void;
}

export class NetworkStateManager {
  private currentState: NetworkState = 'online';
  private currentQuality: NetworkQuality = 'excellent';
  private listeners: Set<NetworkStateListener> = new Set();
  private metrics: NetworkMetrics | null = null;
  private pingInterval: number | null = null;
  private transitionHandlers: Map<string, () => Promise<void>> = new Map();

  constructor() {
    this.initialize();
    this.registerDefaultTransitionHandlers();
  }

  private initialize(): void {
    // Monitor basic online/offline
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Monitor network quality (if supported)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', () => this.updateNetworkMetrics());
      this.updateNetworkMetrics();
    }

    // Start quality monitoring
    this.startQualityMonitoring();

    // Initial state check
    this.updateState(navigator.onLine ? 'online' : 'offline');
  }

  private registerDefaultTransitionHandlers(): void {
    // Offline → Online transition
    this.registerTransitionHandler('offline-online', async () => {
      console.log('Transitioning from offline to online');
      
      // 1. Show reconnection notification
      this.notifyReconnection();
      
      // 2. Start sync process
      const syncService = getSyncService();
      await syncService.syncAll();
      
      // 3. Refresh stale data
      await this.refreshStaleData();
      
      // 4. Resume paused operations
      await this.resumePausedOperations();
    });

    // Online → Offline transition
    this.registerTransitionHandler('online-offline', async () => {
      console.log('Transitioning from online to offline');
      
      // 1. Show offline notification
      this.notifyOffline();
      
      // 2. Enable aggressive caching
      offlinePatterns.setupNetworkHandlers();
      
      // 3. Pause non-critical operations
      await this.pauseNonCriticalOperations();
      
      // 4. Prefetch critical data
      await this.prefetchCriticalData();
    });

    // Flaky → Online transition
    this.registerTransitionHandler('flaky-online', async () => {
      console.log('Network stabilized');
      
      // Resume normal operations
      await this.resumeNormalOperations();
    });

    // Online → Flaky transition
    this.registerTransitionHandler('online-flaky', async () => {
      console.log('Flaky connection detected');
      
      // Enable retry mechanisms
      await this.enableRetryMechanisms();
      
      // Reduce payload sizes
      await this.enableDataSaving();
    });
  }

  // Public API
  addListener(listener: NetworkStateListener): void {
    this.listeners.add(listener);
  }

  removeListener(listener: NetworkStateListener): void {
    this.listeners.delete(listener);
  }

  getState(): NetworkState {
    return this.currentState;
  }

  getQuality(): NetworkQuality {
    return this.currentQuality;
  }

  getMetrics(): NetworkMetrics | null {
    return this.metrics;
  }

  registerTransitionHandler(
    transition: string,
    handler: () => Promise<void>
  ): void {
    this.transitionHandlers.set(transition, handler);
  }

  // Force a state check
  async checkNetworkState(): Promise<NetworkState> {
    if (!navigator.onLine) {
      this.updateState('offline');
      return 'offline';
    }

    // Ping test for flaky detection
    const pingResult = await this.performPingTest();
    
    if (pingResult.success && pingResult.avgRtt < 100) {
      this.updateState('online');
    } else if (pingResult.success && pingResult.avgRtt < 500) {
      this.updateState('slow');
    } else if (pingResult.successRate > 0.5) {
      this.updateState('flaky');
    } else {
      this.updateState('offline');
    }

    return this.currentState;
  }

  // Private methods
  private updateState(newState: NetworkState): void {
    if (newState === this.currentState) return;

    const oldState = this.currentState;
    this.currentState = newState;

    // Update quality based on state
    this.updateQuality();

    // Notify listeners
    this.listeners.forEach(listener => {
      listener.onStateChange(newState);
      listener.onTransition(oldState, newState);
    });

    // Execute transition handler
    const transitionKey = `${oldState}-${newState}`;
    const handler = this.transitionHandlers.get(transitionKey);
    if (handler) {
      handler().catch(console.error);
    }
  }

  private updateQuality(): void {
    let quality: NetworkQuality = 'excellent';

    if (this.currentState === 'offline') {
      quality = 'offline';
    } else if (this.currentState === 'flaky') {
      quality = 'poor';
    } else if (this.currentState === 'slow') {
      quality = 'fair';
    } else if (this.metrics) {
      // Use metrics for fine-grained quality
      if (this.metrics.rtt > 300 || this.metrics.downlink < 1) {
        quality = 'poor';
      } else if (this.metrics.rtt > 150 || this.metrics.downlink < 5) {
        quality = 'fair';
      } else if (this.metrics.rtt > 50 || this.metrics.downlink < 10) {
        quality = 'good';
      }
    }

    if (quality !== this.currentQuality) {
      this.currentQuality = quality;
      this.listeners.forEach(listener => listener.onQualityChange(quality));
    }
  }

  private updateNetworkMetrics(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.metrics = {
        rtt: connection.rtt || 0,
        downlink: connection.downlink || 0,
        effectiveType: connection.effectiveType || '4g',
        saveData: connection.saveData || false,
      };
      this.updateQuality();
    }
  }

  private startQualityMonitoring(): void {
    // Monitor quality every 30 seconds
    this.pingInterval = window.setInterval(() => {
      if (navigator.onLine) {
        this.checkNetworkState();
      }
    }, 30000);
  }

  private async performPingTest(): Promise<{
    success: boolean;
    avgRtt: number;
    successRate: number;
  }> {
    const attempts = 3;
    const rtts: number[] = [];
    let successful = 0;

    for (let i = 0; i < attempts; i++) {
      const start = performance.now();
      
      try {
        const response = await fetch('/api/ping', {
          method: 'HEAD',
          cache: 'no-store',
          signal: AbortSignal.timeout(5000), // 5s timeout
        });
        
        if (response.ok) {
          const rtt = performance.now() - start;
          rtts.push(rtt);
          successful++;
        }
      } catch (error) {
        // Failed ping
      }
      
      // Small delay between pings
      if (i < attempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const avgRtt = rtts.length > 0 
      ? rtts.reduce((a, b) => a + b, 0) / rtts.length 
      : Infinity;

    return {
      success: successful > 0,
      avgRtt,
      successRate: successful / attempts,
    };
  }

  private handleOnline(): void {
    this.checkNetworkState();
  }

  private handleOffline(): void {
    this.updateState('offline');
  }

  // Transition helper methods
  private notifyReconnection(): void {
    // Trigger UI notification
    window.dispatchEvent(new CustomEvent('network-reconnected'));
  }

  private notifyOffline(): void {
    // Trigger UI notification
    window.dispatchEvent(new CustomEvent('network-offline'));
  }

  private async refreshStaleData(): Promise<void> {
    // Refresh data older than 5 minutes
    const staleThreshold = 5 * 60 * 1000;
    
    // Implementation would refresh cached data
    console.log('Refreshing stale data...');
  }

  private async resumePausedOperations(): Promise<void> {
    // Resume any operations paused during offline
    console.log('Resuming paused operations...');
  }

  private async pauseNonCriticalOperations(): Promise<void> {
    // Pause analytics, telemetry, etc.
    console.log('Pausing non-critical operations...');
  }

  private async prefetchCriticalData(): Promise<void> {
    // Prefetch data likely to be needed offline
    console.log('Prefetching critical data...');
  }

  private async resumeNormalOperations(): Promise<void> {
    // Resume all normal operations
    console.log('Resuming normal operations...');
  }

  private async enableRetryMechanisms(): Promise<void> {
    // Enable exponential backoff retries
    console.log('Enabling retry mechanisms...');
  }

  private async enableDataSaving(): Promise<void> {
    // Reduce payload sizes, disable images, etc.
    console.log('Enabling data saving mode...');
  }

  // Cleanup
  destroy(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    this.listeners.clear();
  }
}

// Export singleton instance
export const networkStateManager = new NetworkStateManager();