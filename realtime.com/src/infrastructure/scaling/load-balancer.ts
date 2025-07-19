import { EventEmitter } from 'events';
import * as net from 'net';
import * as http from 'http';
import * as https from 'https';
import { createHash } from 'crypto';
import { Logger } from 'winston';
import { ServiceInstance, ServiceDiscoveryManager } from './service-discovery-manager';

export interface LoadBalancerConfig {
  mode: 'tcp' | 'http' | 'websocket';
  algorithm: 'round-robin' | 'least-connections' | 'ip-hash' | 'weighted' | 'consistent-hash';
  listen: {
    host: string;
    port: number;
    backlog: number;
    ssl?: {
      enabled: boolean;
      cert: string;
      key: string;
      ca?: string;
    };
  };
  upstream: {
    serviceName: string;
    healthCheck: {
      enabled: boolean;
      interval: number;
      timeout: number;
      unhealthyThreshold: number;
      healthyThreshold: number;
      path?: string; // For HTTP health checks
    };
    connectionTimeout: number;
    requestTimeout: number;
    maxConnections: number;
    maxRequestsPerConnection: number;
  };
  stickySessions: {
    enabled: boolean;
    type: 'ip' | 'cookie' | 'header';
    cookieName?: string;
    headerName?: string;
    ttl: number;
    maxSessions: number;
  };
  circuitBreaker: {
    enabled: boolean;
    threshold: number;
    timeout: number;
    halfOpenRequests: number;
  };
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    keyGenerator?: 'ip' | 'header' | 'custom';
  };
  performance: {
    maxHeaderSize: number;
    keepAliveTimeout: number;
    headersTimeout: number;
    requestBufferSize: number;
    responseBufferSize: number;
  };
}

interface Backend {
  instance: ServiceInstance;
  connections: number;
  requests: number;
  errors: number;
  lastError?: Date;
  circuitBreaker: {
    state: 'closed' | 'open' | 'half-open';
    failures: number;
    lastFailure?: Date;
    nextAttempt?: Date;
  };
  health: {
    status: 'healthy' | 'unhealthy' | 'unknown';
    consecutiveFailures: number;
    consecutiveSuccesses: number;
    lastCheck?: Date;
  };
}

interface StickySession {
  backend: string; // Backend instance ID
  created: Date;
  lastUsed: Date;
  requests: number;
}

interface ConnectionInfo {
  id: string;
  clientSocket: net.Socket;
  backendSocket?: net.Socket;
  backend?: Backend;
  created: Date;
  requests: number;
  bytesIn: number;
  bytesOut: number;
}

export class LoadBalancer extends EventEmitter {
  private config: LoadBalancerConfig;
  private logger: Logger;
  private discoveryManager: ServiceDiscoveryManager;
  private server?: net.Server | http.Server | https.Server;
  private backends: Map<string, Backend> = new Map();
  private connections: Map<string, ConnectionInfo> = new Map();
  private stickySessions: Map<string, StickySession> = new Map();
  private roundRobinIndex: number = 0;
  private consistentHashRing?: ConsistentHashRing;
  private healthCheckInterval?: NodeJS.Timeout;
  private sessionCleanupInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
  private rateLimitMap: Map<string, number[]> = new Map();
  private isStarted: boolean = false;
  private metrics = {
    totalConnections: 0,
    activeConnections: 0,
    totalRequests: 0,
    totalBytes: { in: 0, out: 0 },
    errors: { connection: 0, backend: 0, timeout: 0 },
    latency: [] as number[],
    throughput: { current: 0, peak: 0 }
  };

  constructor(
    config: LoadBalancerConfig,
    discoveryManager: ServiceDiscoveryManager,
    logger: Logger
  ) {
    super();
    this.config = this.validateConfig(config);
    this.discoveryManager = discoveryManager;
    this.logger = logger;

    if (this.config.algorithm === 'consistent-hash') {
      this.consistentHashRing = new ConsistentHashRing(150); // 150 virtual nodes per backend
    }
  }

  private validateConfig(config: LoadBalancerConfig): LoadBalancerConfig {
    if (!config.listen || !config.upstream || !config.algorithm) {
      throw new Error('Invalid load balancer configuration');
    }
    return config;
  }

  async start(): Promise<void> {
    if (this.isStarted) {
      throw new Error('Load balancer already started');
    }

    this.logger.info('Starting load balancer', {
      mode: this.config.mode,
      algorithm: this.config.algorithm,
      port: this.config.listen.port
    });

    // Discover initial backends
    await this.discoverBackends();

    // Watch for backend changes
    this.discoveryManager.watchService(
      this.config.upstream.serviceName,
      this.handleBackendChanges.bind(this)
    );

    // Create server based on mode
    switch (this.config.mode) {
      case 'tcp':
        this.server = this.createTcpServer();
        break;
      case 'http':
        this.server = this.createHttpServer();
        break;
      case 'websocket':
        this.server = this.createWebSocketServer();
        break;
    }

    // Start server
    await new Promise<void>((resolve, reject) => {
      this.server!.listen(
        this.config.listen.port,
        this.config.listen.host,
        this.config.listen.backlog,
        () => {
          resolve();
        }
      );

      this.server!.once('error', reject);
    });

    // Start health checks
    if (this.config.upstream.healthCheck.enabled) {
      this.startHealthChecks();
    }

    // Start session cleanup
    if (this.config.stickySessions.enabled) {
      this.startSessionCleanup();
    }

    // Start metrics collection
    this.startMetricsCollection();

    this.isStarted = true;
    this.logger.info('Load balancer started', {
      address: `${this.config.listen.host}:${this.config.listen.port}`
    });
  }

  private createTcpServer(): net.Server {
    const server = net.createServer({
      allowHalfOpen: false,
      pauseOnConnect: false
    });

    server.on('connection', this.handleTcpConnection.bind(this));
    server.on('error', this.handleServerError.bind(this));

    return server;
  }

  private createHttpServer(): http.Server | https.Server {
    const serverOptions = {
      maxHeaderSize: this.config.performance.maxHeaderSize,
      keepAliveTimeout: this.config.performance.keepAliveTimeout,
      headersTimeout: this.config.performance.headersTimeout
    };

    let server: http.Server | https.Server;

    if (this.config.listen.ssl?.enabled) {
      server = https.createServer({
        ...serverOptions,
        cert: this.config.listen.ssl.cert,
        key: this.config.listen.ssl.key,
        ca: this.config.listen.ssl.ca
      });
    } else {
      server = http.createServer(serverOptions);
    }

    server.on('request', this.handleHttpRequest.bind(this));
    server.on('upgrade', this.handleWebSocketUpgrade.bind(this));
    server.on('error', this.handleServerError.bind(this));

    return server;
  }

  private createWebSocketServer(): http.Server {
    const server = http.createServer({
      maxHeaderSize: this.config.performance.maxHeaderSize
    });

    server.on('upgrade', this.handleWebSocketUpgrade.bind(this));
    server.on('error', this.handleServerError.bind(this));

    return server;
  }

  private async handleTcpConnection(clientSocket: net.Socket): Promise<void> {
    const connectionId = this.generateConnectionId();
    const clientAddress = `${clientSocket.remoteAddress}:${clientSocket.remotePort}`;

    this.logger.debug('New TCP connection', { connectionId, clientAddress });

    // Rate limiting
    if (this.config.rateLimiting.enabled && !this.checkRateLimit(clientAddress)) {
      this.logger.warn('Rate limit exceeded', { clientAddress });
      clientSocket.end();
      return;
    }

    // Select backend
    const backend = await this.selectBackend(clientAddress);
    if (!backend) {
      this.logger.error('No backend available', { connectionId });
      clientSocket.end();
      this.metrics.errors.backend++;
      return;
    }

    // Create connection info
    const connectionInfo: ConnectionInfo = {
      id: connectionId,
      clientSocket,
      backend,
      created: new Date(),
      requests: 0,
      bytesIn: 0,
      bytesOut: 0
    };

    this.connections.set(connectionId, connectionInfo);
    this.metrics.totalConnections++;
    this.metrics.activeConnections++;

    // Connect to backend
    const backendSocket = new net.Socket();
    connectionInfo.backendSocket = backendSocket;

    // Set up timeouts
    const connectionTimeout = setTimeout(() => {
      this.logger.error('Backend connection timeout', { connectionId });
      this.cleanupConnection(connectionId);
      this.metrics.errors.timeout++;
    }, this.config.upstream.connectionTimeout);

    backendSocket.once('connect', () => {
      clearTimeout(connectionTimeout);
      this.logger.debug('Connected to backend', { 
        connectionId, 
        backend: backend.instance.id 
      });

      // Pipe data between client and backend
      clientSocket.pipe(backendSocket);
      backendSocket.pipe(clientSocket);

      // Track bytes
      clientSocket.on('data', (data) => {
        connectionInfo.bytesIn += data.length;
        this.metrics.totalBytes.in += data.length;
      });

      backendSocket.on('data', (data) => {
        connectionInfo.bytesOut += data.length;
        this.metrics.totalBytes.out += data.length;
      });
    });

    backendSocket.on('error', (error) => {
      this.logger.error('Backend socket error', { connectionId, error });
      this.handleBackendError(backend);
      this.cleanupConnection(connectionId);
    });

    // Handle disconnections
    clientSocket.on('close', () => {
      this.cleanupConnection(connectionId);
    });

    clientSocket.on('error', (error) => {
      this.logger.error('Client socket error', { connectionId, error });
      this.cleanupConnection(connectionId);
    });

    // Connect to backend
    backendSocket.connect(
      backend.instance.port,
      backend.instance.address
    );

    // Update backend stats
    backend.connections++;
    backend.requests++;
  }

  private async handleHttpRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    const startTime = Date.now();
    const clientAddress = req.socket.remoteAddress || '';

    // Rate limiting
    if (this.config.rateLimiting.enabled && !this.checkRateLimit(clientAddress)) {
      res.writeHead(429, { 'Content-Type': 'text/plain' });
      res.end('Too Many Requests');
      return;
    }

    // Select backend
    const sessionKey = this.getSessionKey(req);
    const backend = await this.selectBackend(sessionKey || clientAddress);
    
    if (!backend) {
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      res.end('Service Unavailable');
      this.metrics.errors.backend++;
      return;
    }

    // Proxy request
    const proxyReq = http.request({
      hostname: backend.instance.address,
      port: backend.instance.port,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        'X-Forwarded-For': clientAddress,
        'X-Forwarded-Host': req.headers.host || '',
        'X-Forwarded-Proto': 'http',
        'X-Real-IP': clientAddress
      }
    });

    // Set timeout
    proxyReq.setTimeout(this.config.upstream.requestTimeout);

    proxyReq.on('response', (proxyRes) => {
      // Copy status and headers
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      
      // Pipe response
      proxyRes.pipe(res);

      // Track latency
      const latency = Date.now() - startTime;
      this.metrics.latency.push(latency);
      
      // Update backend stats
      backend.requests++;
    });

    proxyReq.on('error', (error) => {
      this.logger.error('Proxy request error', { error });
      
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad Gateway');
      }
      
      this.handleBackendError(backend);
    });

    proxyReq.on('timeout', () => {
      this.logger.error('Proxy request timeout');
      proxyReq.abort();
      
      if (!res.headersSent) {
        res.writeHead(504, { 'Content-Type': 'text/plain' });
        res.end('Gateway Timeout');
      }
      
      this.metrics.errors.timeout++;
    });

    // Pipe request
    req.pipe(proxyReq);

    this.metrics.totalRequests++;
  }

  private async handleWebSocketUpgrade(
    req: http.IncomingMessage,
    socket: net.Socket,
    head: Buffer
  ): Promise<void> {
    const clientAddress = req.socket.remoteAddress || '';

    // Rate limiting
    if (this.config.rateLimiting.enabled && !this.checkRateLimit(clientAddress)) {
      socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
      socket.destroy();
      return;
    }

    // Select backend
    const sessionKey = this.getSessionKey(req);
    const backend = await this.selectBackend(sessionKey || clientAddress);
    
    if (!backend) {
      socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
      socket.destroy();
      this.metrics.errors.backend++;
      return;
    }

    // Create backend connection
    const backendSocket = net.connect(
      backend.instance.port,
      backend.instance.address
    );

    backendSocket.on('connect', () => {
      // Forward upgrade request
      const headers = [
        `${req.method} ${req.url} HTTP/${req.httpVersion}`,
        ...Object.entries(req.headers).map(([key, value]) => 
          `${key}: ${value}`
        ),
        '', ''
      ].join('\r\n');

      backendSocket.write(headers);
      backendSocket.write(head);

      // Pipe sockets
      socket.pipe(backendSocket);
      backendSocket.pipe(socket);

      // Update backend stats
      backend.connections++;
      backend.requests++;
    });

    backendSocket.on('error', (error) => {
      this.logger.error('WebSocket backend error', { error });
      socket.destroy();
      this.handleBackendError(backend);
    });

    socket.on('error', (error) => {
      this.logger.error('WebSocket client error', { error });
      backendSocket.destroy();
    });

    socket.on('close', () => {
      backendSocket.destroy();
      backend.connections--;
    });
  }

  private async selectBackend(key: string): Promise<Backend | null> {
    const healthyBackends = Array.from(this.backends.values()).filter(
      backend => this.isBackendHealthy(backend)
    );

    if (healthyBackends.length === 0) {
      return null;
    }

    // Check sticky sessions
    if (this.config.stickySessions.enabled) {
      const session = this.stickySessions.get(key);
      if (session) {
        const backend = this.backends.get(session.backend);
        if (backend && this.isBackendHealthy(backend)) {
          session.lastUsed = new Date();
          session.requests++;
          return backend;
        }
      }
    }

    // Select based on algorithm
    let selectedBackend: Backend | null = null;

    switch (this.config.algorithm) {
      case 'round-robin':
        selectedBackend = this.selectRoundRobin(healthyBackends);
        break;
      
      case 'least-connections':
        selectedBackend = this.selectLeastConnections(healthyBackends);
        break;
      
      case 'ip-hash':
        selectedBackend = this.selectIpHash(key, healthyBackends);
        break;
      
      case 'weighted':
        selectedBackend = this.selectWeighted(healthyBackends);
        break;
      
      case 'consistent-hash':
        selectedBackend = this.selectConsistentHash(key, healthyBackends);
        break;
    }

    // Create sticky session if enabled
    if (selectedBackend && this.config.stickySessions.enabled) {
      this.createStickySession(key, selectedBackend);
    }

    return selectedBackend;
  }

  private selectRoundRobin(backends: Backend[]): Backend {
    const backend = backends[this.roundRobinIndex % backends.length];
    this.roundRobinIndex++;
    return backend;
  }

  private selectLeastConnections(backends: Backend[]): Backend {
    return backends.reduce((least, current) =>
      current.connections < least.connections ? current : least
    );
  }

  private selectIpHash(key: string, backends: Backend[]): Backend {
    const hash = createHash('md5').update(key).digest();
    const index = hash.readUInt32BE(0) % backends.length;
    return backends[index];
  }

  private selectWeighted(backends: Backend[]): Backend {
    const totalWeight = backends.reduce(
      (sum, backend) => sum + (backend.instance.metadata.weight || 1),
      0
    );

    let random = Math.random() * totalWeight;
    
    for (const backend of backends) {
      const weight = backend.instance.metadata.weight || 1;
      if (random < weight) {
        return backend;
      }
      random -= weight;
    }

    return backends[0];
  }

  private selectConsistentHash(key: string, backends: Backend[]): Backend {
    if (!this.consistentHashRing) {
      return backends[0];
    }

    // Ensure all backends are in the ring
    for (const backend of backends) {
      if (!this.consistentHashRing.hasNode(backend.instance.id)) {
        this.consistentHashRing.addNode(backend.instance.id, backend);
      }
    }

    return this.consistentHashRing.getNode(key);
  }

  private isBackendHealthy(backend: Backend): boolean {
    // Check circuit breaker
    if (backend.circuitBreaker.state === 'open') {
      if (backend.circuitBreaker.nextAttempt && 
          Date.now() < backend.circuitBreaker.nextAttempt.getTime()) {
        return false;
      }
      // Move to half-open state
      backend.circuitBreaker.state = 'half-open';
    }

    // Check health status
    if (backend.health.status === 'unhealthy') {
      return false;
    }

    // Check connection limit
    if (backend.connections >= this.config.upstream.maxConnections) {
      return false;
    }

    return true;
  }

  private createStickySession(key: string, backend: Backend): void {
    // Clean up old sessions if at limit
    if (this.stickySessions.size >= this.config.stickySessions.maxSessions) {
      // Remove oldest session
      let oldestKey = '';
      let oldestTime = Date.now();
      
      for (const [k, session] of this.stickySessions) {
        if (session.lastUsed.getTime() < oldestTime) {
          oldestKey = k;
          oldestTime = session.lastUsed.getTime();
        }
      }
      
      if (oldestKey) {
        this.stickySessions.delete(oldestKey);
      }
    }

    this.stickySessions.set(key, {
      backend: backend.instance.id,
      created: new Date(),
      lastUsed: new Date(),
      requests: 1
    });
  }

  private getSessionKey(req: http.IncomingMessage): string | null {
    if (!this.config.stickySessions.enabled) {
      return null;
    }

    switch (this.config.stickySessions.type) {
      case 'ip':
        return req.socket.remoteAddress || null;
      
      case 'cookie':
        const cookies = this.parseCookies(req.headers.cookie || '');
        return cookies[this.config.stickySessions.cookieName || 'session'] || null;
      
      case 'header':
        const headerValue = req.headers[this.config.stickySessions.headerName || 'x-session-id'];
        return Array.isArray(headerValue) ? headerValue[0] : headerValue || null;
      
      default:
        return null;
    }
  }

  private parseCookies(cookieString: string): { [key: string]: string } {
    const cookies: { [key: string]: string } = {};
    
    cookieString.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = value;
      }
    });
    
    return cookies;
  }

  private checkRateLimit(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.config.rateLimiting.windowMs;
    
    // Get or create request timestamps
    let timestamps = this.rateLimitMap.get(key) || [];
    
    // Remove old timestamps
    timestamps = timestamps.filter(time => time > windowStart);
    
    // Check limit
    if (timestamps.length >= this.config.rateLimiting.maxRequests) {
      return false;
    }
    
    // Add current timestamp
    timestamps.push(now);
    this.rateLimitMap.set(key, timestamps);
    
    // Clean up old entries periodically
    if (this.rateLimitMap.size > 10000) {
      const oldestAllowed = now - this.config.rateLimiting.windowMs * 2;
      for (const [k, times] of this.rateLimitMap) {
        if (times[times.length - 1] < oldestAllowed) {
          this.rateLimitMap.delete(k);
        }
      }
    }
    
    return true;
  }

  private handleBackendError(backend: Backend): void {
    backend.errors++;
    backend.lastError = new Date();
    backend.circuitBreaker.failures++;
    backend.circuitBreaker.lastFailure = new Date();

    // Check circuit breaker threshold
    if (backend.circuitBreaker.failures >= this.config.circuitBreaker.threshold) {
      backend.circuitBreaker.state = 'open';
      backend.circuitBreaker.nextAttempt = new Date(
        Date.now() + this.config.circuitBreaker.timeout
      );
      
      this.logger.warn('Circuit breaker opened', {
        backend: backend.instance.id,
        failures: backend.circuitBreaker.failures
      });
      
      this.emit('circuit-breaker-open', backend);
    }
  }

  private cleanupConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Close sockets
    if (connection.clientSocket && !connection.clientSocket.destroyed) {
      connection.clientSocket.destroy();
    }
    
    if (connection.backendSocket && !connection.backendSocket.destroyed) {
      connection.backendSocket.destroy();
    }

    // Update backend stats
    if (connection.backend) {
      connection.backend.connections--;
    }

    // Remove connection
    this.connections.delete(connectionId);
    this.metrics.activeConnections--;
  }

  private async discoverBackends(): Promise<void> {
    const instances = await this.discoveryManager.discoverServices(
      this.config.upstream.serviceName
    );

    this.handleBackendChanges(instances);
  }

  private handleBackendChanges(instances: ServiceInstance[]): void {
    const currentIds = new Set(instances.map(i => i.id));
    const existingIds = new Set(this.backends.keys());

    // Add new backends
    for (const instance of instances) {
      if (!this.backends.has(instance.id)) {
        const backend: Backend = {
          instance,
          connections: 0,
          requests: 0,
          errors: 0,
          circuitBreaker: {
            state: 'closed',
            failures: 0
          },
          health: {
            status: 'healthy',
            consecutiveFailures: 0,
            consecutiveSuccesses: 0
          }
        };

        this.backends.set(instance.id, backend);
        
        // Add to consistent hash ring if using
        if (this.consistentHashRing) {
          this.consistentHashRing.addNode(instance.id, backend);
        }

        this.logger.info('Backend added', { 
          id: instance.id, 
          address: `${instance.address}:${instance.port}` 
        });
      }
    }

    // Remove old backends
    for (const id of existingIds) {
      if (!currentIds.has(id)) {
        this.backends.delete(id);
        
        // Remove from consistent hash ring
        if (this.consistentHashRing) {
          this.consistentHashRing.removeNode(id);
        }

        // Remove sticky sessions for this backend
        for (const [key, session] of this.stickySessions) {
          if (session.backend === id) {
            this.stickySessions.delete(key);
          }
        }

        this.logger.info('Backend removed', { id });
      }
    }

    this.emit('backends-changed', { count: this.backends.size });
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(
      () => this.performHealthChecks(),
      this.config.upstream.healthCheck.interval
    );
  }

  private async performHealthChecks(): Promise<void> {
    const checks = Array.from(this.backends.values()).map(backend =>
      this.checkBackendHealth(backend)
    );

    await Promise.all(checks);
  }

  private async checkBackendHealth(backend: Backend): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (this.config.mode === 'http' && this.config.upstream.healthCheck.path) {
        // HTTP health check
        await this.performHttpHealthCheck(backend);
      } else {
        // TCP health check
        await this.performTcpHealthCheck(backend);
      }

      // Success
      backend.health.consecutiveSuccesses++;
      backend.health.consecutiveFailures = 0;
      backend.health.lastCheck = new Date();

      if (backend.health.status === 'unhealthy' &&
          backend.health.consecutiveSuccesses >= this.config.upstream.healthCheck.healthyThreshold) {
        backend.health.status = 'healthy';
        this.logger.info('Backend became healthy', { id: backend.instance.id });
      }

      // Reset circuit breaker on success
      if (backend.circuitBreaker.state === 'half-open') {
        backend.circuitBreaker.state = 'closed';
        backend.circuitBreaker.failures = 0;
      }

    } catch (error) {
      // Failure
      backend.health.consecutiveFailures++;
      backend.health.consecutiveSuccesses = 0;
      backend.health.lastCheck = new Date();

      if (backend.health.status === 'healthy' &&
          backend.health.consecutiveFailures >= this.config.upstream.healthCheck.unhealthyThreshold) {
        backend.health.status = 'unhealthy';
        this.logger.warn('Backend became unhealthy', { 
          id: backend.instance.id,
          error: error.message 
        });
      }
    }
  }

  private async performTcpHealthCheck(backend: Backend): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error('Health check timeout'));
      }, this.config.upstream.healthCheck.timeout);

      socket.once('connect', () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve();
      });

      socket.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      socket.connect(backend.instance.port, backend.instance.address);
    });
  }

  private async performHttpHealthCheck(backend: Backend): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: backend.instance.address,
        port: backend.instance.port,
        path: this.config.upstream.healthCheck.path,
        method: 'GET',
        timeout: this.config.upstream.healthCheck.timeout
      });

      req.on('response', (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`Health check failed with status ${res.statusCode}`));
        }
        res.resume(); // Consume response
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.abort();
        reject(new Error('Health check timeout'));
      });

      req.end();
    });
  }

  private startSessionCleanup(): void {
    this.sessionCleanupInterval = setInterval(() => {
      const now = Date.now();
      const ttl = this.config.stickySessions.ttl * 1000;

      for (const [key, session] of this.stickySessions) {
        if (now - session.lastUsed.getTime() > ttl) {
          this.stickySessions.delete(key);
        }
      }
    }, 60000); // Clean up every minute
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, 5000); // Collect every 5 seconds
  }

  private collectMetrics(): void {
    // Calculate throughput
    const currentThroughput = this.metrics.totalRequests;
    this.metrics.throughput.current = currentThroughput;
    
    if (currentThroughput > this.metrics.throughput.peak) {
      this.metrics.throughput.peak = currentThroughput;
    }

    // Calculate average latency
    const avgLatency = this.metrics.latency.length > 0
      ? this.metrics.latency.reduce((a, b) => a + b, 0) / this.metrics.latency.length
      : 0;

    // Emit metrics
    this.emit('metrics', {
      connections: {
        total: this.metrics.totalConnections,
        active: this.metrics.activeConnections
      },
      requests: {
        total: this.metrics.totalRequests,
        throughput: this.metrics.throughput
      },
      bytes: this.metrics.totalBytes,
      errors: this.metrics.errors,
      latency: {
        average: avgLatency,
        samples: this.metrics.latency.length
      },
      backends: {
        total: this.backends.size,
        healthy: Array.from(this.backends.values()).filter(b => 
          b.health.status === 'healthy'
        ).length
      },
      stickySessions: this.stickySessions.size
    });

    // Reset latency array to prevent memory growth
    this.metrics.latency = [];
  }

  private handleServerError(error: Error): void {
    this.logger.error('Server error', { error });
    this.emit('error', error);
    this.metrics.errors.connection++;
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down load balancer');

    // Stop accepting new connections
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
    }

    // Stop intervals
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    if (this.sessionCleanupInterval) clearInterval(this.sessionCleanupInterval);
    if (this.metricsInterval) clearInterval(this.metricsInterval);

    // Close all active connections
    for (const connectionId of this.connections.keys()) {
      this.cleanupConnection(connectionId);
    }

    this.isStarted = false;
    this.logger.info('Load balancer shut down');
  }

  getMetrics(): any {
    return {
      ...this.metrics,
      backends: Array.from(this.backends.values()).map(backend => ({
        id: backend.instance.id,
        address: `${backend.instance.address}:${backend.instance.port}`,
        connections: backend.connections,
        requests: backend.requests,
        errors: backend.errors,
        health: backend.health.status,
        circuitBreaker: backend.circuitBreaker.state
      }))
    };
  }
}

// Consistent Hash Ring implementation
class ConsistentHashRing {
  private ring: Map<string, any> = new Map();
  private sortedKeys: string[] = [];
  private virtualNodes: number;

  constructor(virtualNodes: number) {
    this.virtualNodes = virtualNodes;
  }

  addNode(nodeId: string, data: any): void {
    for (let i = 0; i < this.virtualNodes; i++) {
      const virtualKey = `${nodeId}-${i}`;
      const hash = createHash('md5').update(virtualKey).digest('hex');
      this.ring.set(hash, data);
    }
    this.updateSortedKeys();
  }

  removeNode(nodeId: string): void {
    const keysToRemove: string[] = [];
    
    for (const [hash, data] of this.ring) {
      if (data.instance.id === nodeId) {
        keysToRemove.push(hash);
      }
    }

    keysToRemove.forEach(key => this.ring.delete(key));
    this.updateSortedKeys();
  }

  hasNode(nodeId: string): boolean {
    for (const data of this.ring.values()) {
      if (data.instance.id === nodeId) {
        return true;
      }
    }
    return false;
  }

  getNode(key: string): any {
    if (this.ring.size === 0) {
      throw new Error('No nodes in hash ring');
    }

    const hash = createHash('md5').update(key).digest('hex');
    
    // Binary search for the next node
    let left = 0;
    let right = this.sortedKeys.length - 1;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (this.sortedKeys[mid] < hash) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    // Wrap around if necessary
    const selectedKey = this.sortedKeys[left] || this.sortedKeys[0];
    return this.ring.get(selectedKey);
  }

  private updateSortedKeys(): void {
    this.sortedKeys = Array.from(this.ring.keys()).sort();
  }
}

export default LoadBalancer;