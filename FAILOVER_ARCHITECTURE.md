# Failover Architecture: Local vs Cloud Server Strategy

## Overview
A resilient failover system that seamlessly switches between local development server and cloud services, ensuring continuous operation with minimal user disruption.

## Architecture Pattern: Active-Passive with Health Monitoring

### Server Configuration

```typescript
interface ServerConfig {
  id: string;
  type: 'local' | 'cloud';
  priority: number;
  endpoints: {
    websocket: string;
    rest: string;
    health: string;
  };
  features: string[];
  rateLimit?: number;
}

const serverConfigs: ServerConfig[] = [
  {
    id: 'local-dev',
    type: 'local',
    priority: 1,
    endpoints: {
      websocket: 'ws://localhost:3004',
      rest: 'http://localhost:3000',
      health: 'http://localhost:3000/health'
    },
    features: ['all']
  },
  {
    id: 'cloud-primary',
    type: 'cloud',
    priority: 2,
    endpoints: {
      websocket: 'wss://api.semantest.com',
      rest: 'https://api.semantest.com',
      health: 'https://api.semantest.com/health'
    },
    features: ['all'],
    rateLimit: 100 // requests per minute
  },
  {
    id: 'cloud-fallback',
    type: 'cloud',
    priority: 3,
    endpoints: {
      websocket: 'wss://fallback.semantest.com',
      rest: 'https://fallback.semantest.com',
      health: 'https://fallback.semantest.com/health'
    },
    features: ['basic'], // Limited features
    rateLimit: 50
  }
];
```

### Health Monitoring System

```typescript
class HealthMonitor {
  private serverStatus: Map<string, ServerHealth> = new Map();
  private readonly CHECK_INTERVAL = 5000; // 5 seconds
  private readonly TIMEOUT = 3000; // 3 seconds
  
  async startMonitoring() {
    // Initial health check
    await this.checkAllServers();
    
    // Periodic monitoring
    setInterval(() => this.checkAllServers(), this.CHECK_INTERVAL);
  }
  
  private async checkAllServers() {
    const checks = serverConfigs.map(server => 
      this.checkServer(server)
    );
    
    await Promise.allSettled(checks);
    this.emit('health:updated', this.getHealthSummary());
  }
  
  private async checkServer(config: ServerConfig): Promise<void> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(config.endpoints.health, {
        signal: AbortSignal.timeout(this.TIMEOUT)
      });
      
      const data = await response.json();
      const latency = Date.now() - startTime;
      
      this.serverStatus.set(config.id, {
        available: response.ok,
        latency,
        lastCheck: Date.now(),
        features: data.features || config.features,
        load: data.load || 0
      });
    } catch (error) {
      this.serverStatus.set(config.id, {
        available: false,
        latency: -1,
        lastCheck: Date.now(),
        error: error.message
      });
    }
  }
}
```

### Intelligent Failover Manager

```typescript
class FailoverManager {
  private currentServer: ServerConfig | null = null;
  private healthMonitor: HealthMonitor;
  private connectionManager: ConnectionManager;
  
  async initialize() {
    // Start health monitoring
    await this.healthMonitor.startMonitoring();
    
    // Select initial server
    this.currentServer = await this.selectBestServer();
    
    // Establish connection
    await this.connectionManager.connect(this.currentServer);
    
    // Monitor for failures
    this.setupFailureDetection();
  }
  
  private async selectBestServer(): Promise<ServerConfig> {
    const healthSummary = this.healthMonitor.getHealthSummary();
    
    // Sort by priority and health
    const availableServers = serverConfigs
      .filter(server => {
        const health = healthSummary.get(server.id);
        return health && health.available;
      })
      .sort((a, b) => {
        const healthA = healthSummary.get(a.id);
        const healthB = healthSummary.get(b.id);
        
        // Prefer lower latency for same priority
        if (a.priority === b.priority) {
          return healthA.latency - healthB.latency;
        }
        
        return a.priority - b.priority;
      });
    
    if (availableServers.length === 0) {
      throw new Error('No available servers');
    }
    
    return availableServers[0];
  }
  
  private setupFailureDetection() {
    // WebSocket connection failure
    this.connectionManager.on('disconnect', async (error) => {
      this.emit('failover:triggered', {
        from: this.currentServer,
        reason: error
      });
      
      await this.performFailover();
    });
    
    // REST API failures
    this.connectionManager.on('api:error', async (error) => {
      if (this.shouldTriggerFailover(error)) {
        await this.performFailover();
      }
    });
    
    // Health check failures
    this.healthMonitor.on('server:unhealthy', async (serverId) => {
      if (serverId === this.currentServer?.id) {
        await this.performFailover();
      }
    });
  }
}
```

### Connection State Management

```typescript
class ConnectionManager {
  private websocket: WebSocket | null = null;
  private restClient: RestClient;
  private messageQueue: Message[] = [];
  private reconnectAttempts = 0;
  
  async connect(server: ServerConfig) {
    // Store current state
    const previousState = await this.captureState();
    
    try {
      // Establish WebSocket connection
      await this.connectWebSocket(server);
      
      // Configure REST client
      this.restClient.configure(server);
      
      // Restore state
      await this.restoreState(previousState);
      
      // Flush queued messages
      await this.flushQueue();
      
      this.emit('connected', server);
    } catch (error) {
      this.emit('connection:failed', { server, error });
      throw error;
    }
  }
  
  private async captureState(): Promise<ConnectionState> {
    return {
      subscriptions: this.getActiveSubscriptions(),
      pendingRequests: this.getPendingRequests(),
      sessionData: this.getSessionData()
    };
  }
  
  private async restoreState(state: ConnectionState) {
    // Re-establish subscriptions
    for (const sub of state.subscriptions) {
      await this.subscribe(sub.event, sub.handler);
    }
    
    // Restore session
    if (state.sessionData) {
      await this.restoreSession(state.sessionData);
    }
  }
}
```

### Graceful Degradation Strategy

```typescript
class GracefulDegradation {
  private featureFlags: Map<string, boolean> = new Map();
  
  configureForServer(server: ServerConfig) {
    const features = new Set(server.features);
    
    // Core features (always available)
    this.featureFlags.set('basic-search', true);
    this.featureFlags.set('message-viewing', true);
    
    // Advanced features (may be limited)
    this.featureFlags.set('image-download', features.has('all'));
    this.featureFlags.set('batch-operations', features.has('all'));
    this.featureFlags.set('real-time-sync', features.has('all'));
    
    // Notify UI of feature availability
    this.emit('features:updated', Object.fromEntries(this.featureFlags));
  }
  
  canUseFeature(feature: string): boolean {
    return this.featureFlags.get(feature) || false;
  }
  
  async executeWithFallback<T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (this.isFeatureUnavailable(error)) {
        return await fallback();
      }
      throw error;
    }
  }
}
```

### Queue Synchronization During Failover

```typescript
class QueueSynchronizer {
  async syncQueues(
    fromServer: ServerConfig,
    toServer: ServerConfig
  ): Promise<void> {
    // Get queue state from old server (if available)
    let queueState: QueueState | null = null;
    
    try {
      queueState = await this.fetchQueueState(fromServer);
    } catch {
      // Use local cache if server unavailable
      queueState = await this.loadLocalQueueCache();
    }
    
    if (queueState) {
      // Push state to new server
      await this.pushQueueState(toServer, queueState);
      
      // Verify synchronization
      const verified = await this.verifySync(toServer, queueState);
      if (!verified) {
        throw new Error('Queue synchronization failed');
      }
    }
  }
  
  private async fetchQueueState(server: ServerConfig): Promise<QueueState> {
    const response = await fetch(`${server.endpoints.rest}/queue/export`);
    return response.json();
  }
  
  private async pushQueueState(
    server: ServerConfig,
    state: QueueState
  ): Promise<void> {
    await fetch(`${server.endpoints.rest}/queue/import`, {
      method: 'POST',
      body: JSON.stringify(state)
    });
  }
}
```

### User Notification System

```typescript
class FailoverNotification {
  notifyUser(failoverEvent: FailoverEvent) {
    const notification = this.createNotification(failoverEvent);
    
    // In-extension notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: notification.title,
      message: notification.message,
      priority: notification.priority
    });
    
    // Update popup UI
    this.emit('ui:notification', notification);
  }
  
  private createNotification(event: FailoverEvent): Notification {
    if (event.toServer.type === 'local') {
      return {
        title: 'Connected to Local Server',
        message: 'Using local development server for better performance',
        priority: 0
      };
    }
    
    if (event.toServer.type === 'cloud' && event.fromServer?.type === 'local') {
      return {
        title: 'Switched to Cloud Server',
        message: 'Local server unavailable, using cloud backup',
        priority: 1
      };
    }
    
    return {
      title: 'Server Switch',
      message: `Now connected to ${event.toServer.id}`,
      priority: 0
    };
  }
}
```

## Failover Scenarios

### Scenario 1: Local Server Crashes
```
1. Health check detects local server down
2. Failover manager selects cloud-primary
3. Connection manager captures current state
4. WebSocket/REST clients switch to cloud
5. State is restored, queues synchronized
6. User notified of switch
```

### Scenario 2: Cloud Rate Limit Exceeded
```
1. REST client receives 429 (Too Many Requests)
2. Failover manager checks for alternatives
3. Switches to cloud-fallback with reduced features
4. Graceful degradation applied
5. Non-critical features disabled
6. User warned about limitations
```

### Scenario 3: Network Partition
```
1. All servers become unreachable
2. Extension enters offline mode
3. Operations queued locally
4. Periodic reconnection attempts
5. When connected, queues synchronized
6. Normal operation resumed
```

## Configuration

```typescript
const failoverConfig = {
  healthCheck: {
    interval: 5000,
    timeout: 3000,
    retries: 2
  },
  failover: {
    cooldown: 30000, // Prevent flapping
    maxAttempts: 5,
    backoffMultiplier: 2
  },
  queue: {
    maxOfflineSize: 1000,
    syncBatchSize: 100
  },
  features: {
    degradationMode: 'gradual', // or 'immediate'
    essentialOnly: false
  }
};
```

## Monitoring & Alerts

```typescript
// Real-time failover metrics
const metrics = {
  currentServer: 'local-dev',
  uptime: 3600000, // 1 hour
  failoverCount: 0,
  lastFailover: null,
  serverHealth: {
    'local-dev': { status: 'healthy', latency: 5 },
    'cloud-primary': { status: 'healthy', latency: 45 },
    'cloud-fallback': { status: 'degraded', latency: 120 }
  }
};
```