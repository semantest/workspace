import { EventEmitter } from 'events';
import { Logger } from 'winston';
import * as os from 'os';
import { createHash } from 'crypto';

export interface ServiceDiscoveryConfig {
  service: 'etcd' | 'consul' | 'redis';
  endpoints: string[];
  namespace: string;
  serviceName: string;
  serviceVersion: string;
  discovery: {
    ttl: number;
    heartbeatInterval: number;
    deregisterCriticalAfter: number;
    enableHealthCheck: boolean;
    healthCheckInterval: number;
    healthCheckTimeout: number;
  };
  metadata: {
    datacenter?: string;
    region?: string;
    zone?: string;
    environment?: string;
    tags?: string[];
  };
  watch: {
    enabled: boolean;
    services: string[];
    pollInterval: number;
    changeDebounce: number;
  };
  cache: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
}

export interface ServiceInstance {
  id: string;
  name: string;
  address: string;
  port: number;
  version: string;
  metadata: {
    weight?: number;
    priority?: number;
    datacenter?: string;
    region?: string;
    zone?: string;
    tags?: string[];
    capabilities?: string[];
    load?: number;
    connections?: number;
    healthy?: boolean;
    lastHeartbeat?: number;
    [key: string]: any;
  };
  health: {
    status: 'healthy' | 'unhealthy' | 'critical';
    lastCheck: number;
    checksPassed: number;
    checksFailed: number;
    output?: string;
  };
}

interface ServiceRegistry {
  [serviceName: string]: ServiceInstance[];
}

interface DiscoveryClient {
  register(service: ServiceInstance): Promise<void>;
  deregister(serviceId: string): Promise<void>;
  heartbeat(serviceId: string): Promise<void>;
  discover(serviceName: string): Promise<ServiceInstance[]>;
  watch(serviceName: string, callback: (instances: ServiceInstance[]) => void): void;
  updateHealth(serviceId: string, status: string, output?: string): Promise<void>;
}

// Abstract base client
abstract class BaseDiscoveryClient implements DiscoveryClient {
  protected config: ServiceDiscoveryConfig;
  protected logger: Logger;

  constructor(config: ServiceDiscoveryConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  abstract register(service: ServiceInstance): Promise<void>;
  abstract deregister(serviceId: string): Promise<void>;
  abstract heartbeat(serviceId: string): Promise<void>;
  abstract discover(serviceName: string): Promise<ServiceInstance[]>;
  abstract watch(serviceName: string, callback: (instances: ServiceInstance[]) => void): void;
  abstract updateHealth(serviceId: string, status: string, output?: string): Promise<void>;
}

// Etcd Discovery Client
class EtcdDiscoveryClient extends BaseDiscoveryClient {
  private client: any;
  private lease: any;
  private watchers: Map<string, any> = new Map();

  async initialize(endpoints: string[]): Promise<void> {
    const { Etcd3 } = await import('etcd3');
    this.client = new Etcd3({ hosts: endpoints });
    
    // Create lease for TTL
    this.lease = this.client.lease(this.config.discovery.ttl);
  }

  async register(service: ServiceInstance): Promise<void> {
    const key = this.getServiceKey(service);
    const value = JSON.stringify(service);
    
    await this.lease.put(key).value(value);
    
    this.logger.info('Service registered in etcd', { 
      serviceId: service.id,
      key 
    });
  }

  async deregister(serviceId: string): Promise<void> {
    const key = this.getServiceKeyById(serviceId);
    await this.client.delete().key(key);
    
    this.logger.info('Service deregistered from etcd', { serviceId });
  }

  async heartbeat(serviceId: string): Promise<void> {
    // Etcd uses lease keepAlive
    await this.lease.keepAliveOnce();
  }

  async discover(serviceName: string): Promise<ServiceInstance[]> {
    const prefix = `/${this.config.namespace}/services/${serviceName}/`;
    const response = await this.client.getAll().prefix(prefix);
    
    const instances: ServiceInstance[] = [];
    
    for (const [key, value] of Object.entries(response)) {
      try {
        const instance = JSON.parse(value as string);
        instances.push(instance);
      } catch (error) {
        this.logger.error('Failed to parse service instance', { key, error });
      }
    }
    
    return instances;
  }

  watch(serviceName: string, callback: (instances: ServiceInstance[]) => void): void {
    const prefix = `/${this.config.namespace}/services/${serviceName}/`;
    
    const watcher = this.client.watch()
      .prefix(prefix)
      .create();
    
    watcher.on('put', async () => {
      const instances = await this.discover(serviceName);
      callback(instances);
    });
    
    watcher.on('delete', async () => {
      const instances = await this.discover(serviceName);
      callback(instances);
    });
    
    this.watchers.set(serviceName, watcher);
  }

  async updateHealth(serviceId: string, status: string, output?: string): Promise<void> {
    const key = this.getHealthKey(serviceId);
    const health = {
      status,
      lastCheck: Date.now(),
      output
    };
    
    await this.client.put(key).value(JSON.stringify(health));
  }

  private getServiceKey(service: ServiceInstance): string {
    return `/${this.config.namespace}/services/${service.name}/${service.id}`;
  }

  private getServiceKeyById(serviceId: string): string {
    return `/${this.config.namespace}/services/${this.config.serviceName}/${serviceId}`;
  }

  private getHealthKey(serviceId: string): string {
    return `/${this.config.namespace}/health/${serviceId}`;
  }
}

// Consul Discovery Client
class ConsulDiscoveryClient extends BaseDiscoveryClient {
  private client: any;
  private watchers: Map<string, NodeJS.Timeout> = new Map();

  async initialize(endpoints: string[]): Promise<void> {
    const consul = await import('consul');
    this.client = consul({
      host: endpoints[0].split(':')[0],
      port: endpoints[0].split(':')[1] || '8500',
      promisify: true
    });
  }

  async register(service: ServiceInstance): Promise<void> {
    const registration = {
      id: service.id,
      name: service.name,
      address: service.address,
      port: service.port,
      tags: service.metadata.tags || [],
      meta: service.metadata,
      check: {
        ttl: `${this.config.discovery.ttl}s`,
        deregister_critical_service_after: `${this.config.discovery.deregisterCriticalAfter}s`
      }
    };
    
    await this.client.agent.service.register(registration);
    
    this.logger.info('Service registered in consul', { 
      serviceId: service.id 
    });
  }

  async deregister(serviceId: string): Promise<void> {
    await this.client.agent.service.deregister(serviceId);
    
    this.logger.info('Service deregistered from consul', { serviceId });
  }

  async heartbeat(serviceId: string): Promise<void> {
    await this.client.agent.check.pass(`service:${serviceId}`);
  }

  async discover(serviceName: string): Promise<ServiceInstance[]> {
    const services = await this.client.health.service(serviceName);
    
    return services.map((entry: any) => {
      const service = entry.Service;
      const checks = entry.Checks;
      
      const healthStatus = this.determineHealthStatus(checks);
      
      return {
        id: service.ID,
        name: service.Service,
        address: service.Address,
        port: service.Port,
        version: service.Meta?.version || '1.0.0',
        metadata: {
          ...service.Meta,
          tags: service.Tags
        },
        health: {
          status: healthStatus,
          lastCheck: Date.now(),
          checksPassed: checks.filter((c: any) => c.Status === 'passing').length,
          checksFailed: checks.filter((c: any) => c.Status !== 'passing').length
        }
      };
    });
  }

  watch(serviceName: string, callback: (instances: ServiceInstance[]) => void): void {
    // Consul doesn't have native watch, so we poll
    const poll = async () => {
      try {
        const instances = await this.discover(serviceName);
        callback(instances);
      } catch (error) {
        this.logger.error('Watch poll error', { serviceName, error });
      }
    };
    
    const interval = setInterval(poll, this.config.watch.pollInterval);
    this.watchers.set(serviceName, interval);
    
    // Initial poll
    poll();
  }

  async updateHealth(serviceId: string, status: string, output?: string): Promise<void> {
    const checkId = `service:${serviceId}`;
    
    switch (status) {
      case 'healthy':
        await this.client.agent.check.pass(checkId, output);
        break;
      case 'warning':
        await this.client.agent.check.warn(checkId, output);
        break;
      case 'critical':
        await this.client.agent.check.fail(checkId, output);
        break;
    }
  }

  private determineHealthStatus(checks: any[]): 'healthy' | 'unhealthy' | 'critical' {
    const hasFailure = checks.some(check => check.Status === 'critical');
    const hasWarning = checks.some(check => check.Status === 'warning');
    
    if (hasFailure) return 'critical';
    if (hasWarning) return 'unhealthy';
    return 'healthy';
  }
}

// Redis Discovery Client
class RedisDiscoveryClient extends BaseDiscoveryClient {
  private client: any;
  private pubsub: any;
  private watchers: Map<string, Set<(instances: ServiceInstance[]) => void>> = new Map();

  async initialize(endpoints: string[]): Promise<void> {
    const { createClient } = await import('redis');
    
    this.client = createClient({ url: endpoints[0] });
    this.pubsub = createClient({ url: endpoints[0] });
    
    await this.client.connect();
    await this.pubsub.connect();
    
    // Subscribe to service changes
    await this.pubsub.subscribe(
      `${this.config.namespace}:service:changes`,
      this.handleServiceChange.bind(this)
    );
  }

  async register(service: ServiceInstance): Promise<void> {
    const key = this.getServiceKey(service);
    const value = JSON.stringify(service);
    
    // Set with TTL
    await this.client.setEx(key, this.config.discovery.ttl, value);
    
    // Add to service set
    await this.client.sAdd(
      `${this.config.namespace}:services:${service.name}`,
      service.id
    );
    
    // Publish change event
    await this.client.publish(
      `${this.config.namespace}:service:changes`,
      JSON.stringify({ action: 'register', service })
    );
    
    this.logger.info('Service registered in redis', { 
      serviceId: service.id 
    });
  }

  async deregister(serviceId: string): Promise<void> {
    const key = this.getServiceKeyById(serviceId);
    
    // Get service info before deletion
    const serviceData = await this.client.get(key);
    if (serviceData) {
      const service = JSON.parse(serviceData);
      
      // Remove from set
      await this.client.sRem(
        `${this.config.namespace}:services:${service.name}`,
        serviceId
      );
    }
    
    // Delete service key
    await this.client.del(key);
    
    // Publish change event
    await this.client.publish(
      `${this.config.namespace}:service:changes`,
      JSON.stringify({ action: 'deregister', serviceId })
    );
    
    this.logger.info('Service deregistered from redis', { serviceId });
  }

  async heartbeat(serviceId: string): Promise<void> {
    const key = this.getServiceKeyById(serviceId);
    
    // Get current data
    const data = await this.client.get(key);
    if (data) {
      const service = JSON.parse(data);
      service.metadata.lastHeartbeat = Date.now();
      
      // Update with new TTL
      await this.client.setEx(key, this.config.discovery.ttl, JSON.stringify(service));
    }
  }

  async discover(serviceName: string): Promise<ServiceInstance[]> {
    const serviceIds = await this.client.sMembers(
      `${this.config.namespace}:services:${serviceName}`
    );
    
    const instances: ServiceInstance[] = [];
    
    for (const serviceId of serviceIds) {
      const key = `${this.config.namespace}:service:${serviceId}`;
      const data = await this.client.get(key);
      
      if (data) {
        try {
          const instance = JSON.parse(data);
          instances.push(instance);
        } catch (error) {
          this.logger.error('Failed to parse service instance', { 
            serviceId, 
            error 
          });
        }
      }
    }
    
    return instances;
  }

  watch(serviceName: string, callback: (instances: ServiceInstance[]) => void): void {
    if (!this.watchers.has(serviceName)) {
      this.watchers.set(serviceName, new Set());
    }
    
    this.watchers.get(serviceName)!.add(callback);
    
    // Initial callback
    this.discover(serviceName).then(callback);
  }

  async updateHealth(serviceId: string, status: string, output?: string): Promise<void> {
    const key = this.getHealthKey(serviceId);
    const health = {
      status,
      lastCheck: Date.now(),
      output
    };
    
    await this.client.setEx(
      key,
      this.config.discovery.ttl,
      JSON.stringify(health)
    );
  }

  private async handleServiceChange(message: string): Promise<void> {
    try {
      const change = JSON.parse(message);
      
      // Notify watchers
      for (const [serviceName, callbacks] of this.watchers) {
        const instances = await this.discover(serviceName);
        callbacks.forEach(callback => callback(instances));
      }
    } catch (error) {
      this.logger.error('Failed to handle service change', { error });
    }
  }

  private getServiceKey(service: ServiceInstance): string {
    return `${this.config.namespace}:service:${service.id}`;
  }

  private getServiceKeyById(serviceId: string): string {
    return `${this.config.namespace}:service:${serviceId}`;
  }

  private getHealthKey(serviceId: string): string {
    return `${this.config.namespace}:health:${serviceId}`;
  }
}

export class ServiceDiscoveryManager extends EventEmitter {
  private config: ServiceDiscoveryConfig;
  private logger: Logger;
  private client: DiscoveryClient;
  private registeredServices: Map<string, ServiceInstance> = new Map();
  private discoveredServices: ServiceRegistry = {};
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;
  private cache: Map<string, { data: ServiceInstance[]; timestamp: number }> = new Map();
  private isStarted: boolean = false;

  constructor(config: ServiceDiscoveryConfig, logger: Logger) {
    super();
    this.config = this.validateConfig(config);
    this.logger = logger;
  }

  private validateConfig(config: ServiceDiscoveryConfig): ServiceDiscoveryConfig {
    if (!config.service || !config.endpoints || !config.serviceName) {
      throw new Error('Invalid service discovery configuration');
    }
    return config;
  }

  async start(): Promise<void> {
    if (this.isStarted) {
      throw new Error('Service discovery already started');
    }

    this.logger.info('Starting service discovery manager', {
      service: this.config.service,
      endpoints: this.config.endpoints
    });

    // Initialize discovery client
    switch (this.config.service) {
      case 'etcd':
        this.client = new EtcdDiscoveryClient(this.config, this.logger);
        await (this.client as EtcdDiscoveryClient).initialize(this.config.endpoints);
        break;
      case 'consul':
        this.client = new ConsulDiscoveryClient(this.config, this.logger);
        await (this.client as ConsulDiscoveryClient).initialize(this.config.endpoints);
        break;
      case 'redis':
        this.client = new RedisDiscoveryClient(this.config, this.logger);
        await (this.client as RedisDiscoveryClient).initialize(this.config.endpoints);
        break;
    }

    // Start health checks if enabled
    if (this.config.discovery.enableHealthCheck) {
      this.startHealthChecks();
    }

    // Start watching services if enabled
    if (this.config.watch.enabled) {
      this.startWatching();
    }

    this.isStarted = true;
    this.logger.info('Service discovery manager started');
  }

  async registerService(
    port: number, 
    metadata: any = {}
  ): Promise<ServiceInstance> {
    const serviceId = this.generateServiceId();
    
    const service: ServiceInstance = {
      id: serviceId,
      name: this.config.serviceName,
      address: this.getServiceAddress(),
      port,
      version: this.config.serviceVersion,
      metadata: {
        ...this.config.metadata,
        ...metadata,
        startTime: Date.now(),
        pid: process.pid
      },
      health: {
        status: 'healthy',
        lastCheck: Date.now(),
        checksPassed: 0,
        checksFailed: 0
      }
    };

    // Register with discovery service
    await this.client.register(service);
    
    // Store locally
    this.registeredServices.set(serviceId, service);
    
    // Setup heartbeat
    this.setupHeartbeat(serviceId);
    
    this.emit('service-registered', service);
    this.logger.info('Service registered', { serviceId, port });
    
    return service;
  }

  async deregisterService(serviceId: string): Promise<void> {
    const service = this.registeredServices.get(serviceId);
    if (!service) {
      throw new Error(`Service ${serviceId} not found`);
    }

    // Stop heartbeat
    const heartbeatInterval = this.heartbeatIntervals.get(serviceId);
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      this.heartbeatIntervals.delete(serviceId);
    }

    // Deregister from discovery service
    await this.client.deregister(serviceId);
    
    // Remove locally
    this.registeredServices.delete(serviceId);
    
    this.emit('service-deregistered', { serviceId });
    this.logger.info('Service deregistered', { serviceId });
  }

  async discoverServices(serviceName: string): Promise<ServiceInstance[]> {
    // Check cache first
    if (this.config.cache.enabled) {
      const cached = this.cache.get(serviceName);
      if (cached && Date.now() - cached.timestamp < this.config.cache.ttl * 1000) {
        return cached.data;
      }
    }

    // Discover from service
    const instances = await this.client.discover(serviceName);
    
    // Filter healthy instances
    const healthyInstances = instances.filter(
      instance => instance.health.status === 'healthy'
    );

    // Update cache
    if (this.config.cache.enabled) {
      this.cache.set(serviceName, {
        data: healthyInstances,
        timestamp: Date.now()
      });
      
      // Limit cache size
      if (this.cache.size > this.config.cache.maxSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
    }

    // Update discovered services
    this.discoveredServices[serviceName] = healthyInstances;
    
    return healthyInstances;
  }

  async getServiceInstance(
    serviceName: string, 
    strategy: 'random' | 'round-robin' | 'least-connections' = 'random'
  ): Promise<ServiceInstance | null> {
    const instances = await this.discoverServices(serviceName);
    
    if (instances.length === 0) {
      return null;
    }

    switch (strategy) {
      case 'random':
        return instances[Math.floor(Math.random() * instances.length)];
      
      case 'round-robin':
        // Simple round-robin implementation
        const key = `rr_${serviceName}`;
        const current = (this as any)[key] || 0;
        const instance = instances[current % instances.length];
        (this as any)[key] = current + 1;
        return instance;
      
      case 'least-connections':
        // Sort by connection count
        return instances.sort((a, b) => 
          (a.metadata.connections || 0) - (b.metadata.connections || 0)
        )[0];
      
      default:
        return instances[0];
    }
  }

  watchService(serviceName: string, callback: (instances: ServiceInstance[]) => void): void {
    this.client.watch(serviceName, (instances) => {
      // Filter healthy instances
      const healthyInstances = instances.filter(
        instance => instance.health.status === 'healthy'
      );
      
      // Update cache
      this.discoveredServices[serviceName] = healthyInstances;
      
      // Notify callback
      callback(healthyInstances);
      
      // Emit event
      this.emit('service-changed', { serviceName, instances: healthyInstances });
    });
  }

  private setupHeartbeat(serviceId: string): void {
    const interval = setInterval(async () => {
      try {
        await this.client.heartbeat(serviceId);
        
        // Update local health
        const service = this.registeredServices.get(serviceId);
        if (service) {
          service.metadata.lastHeartbeat = Date.now();
        }
      } catch (error) {
        this.logger.error('Heartbeat failed', { serviceId, error });
        this.emit('heartbeat-failed', { serviceId, error });
      }
    }, this.config.discovery.heartbeatInterval * 1000);

    this.heartbeatIntervals.set(serviceId, interval);
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      for (const [serviceId, service] of this.registeredServices) {
        try {
          const health = await this.performHealthCheck(service);
          
          // Update health status
          service.health = health;
          
          // Update in discovery service
          await this.client.updateHealth(
            serviceId,
            health.status,
            health.output
          );
          
          this.emit('health-check', { serviceId, health });
        } catch (error) {
          this.logger.error('Health check failed', { serviceId, error });
        }
      }
    }, this.config.discovery.healthCheckInterval * 1000);
  }

  private async performHealthCheck(service: ServiceInstance): Promise<any> {
    // Basic health check - can be extended
    const startTime = Date.now();
    
    try {
      // Check process health
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      const health = {
        status: 'healthy' as const,
        lastCheck: Date.now(),
        checksPassed: service.health.checksPassed + 1,
        checksFailed: service.health.checksFailed,
        output: JSON.stringify({
          memory: memoryUsage,
          cpu: cpuUsage,
          uptime: process.uptime(),
          responseTime: Date.now() - startTime
        })
      };
      
      // Check thresholds
      if (memoryUsage.heapUsed > 1024 * 1024 * 1024) { // 1GB
        health.status = 'unhealthy';
      }
      
      return health;
    } catch (error) {
      return {
        status: 'critical' as const,
        lastCheck: Date.now(),
        checksPassed: service.health.checksPassed,
        checksFailed: service.health.checksFailed + 1,
        output: error.message
      };
    }
  }

  private startWatching(): void {
    for (const serviceName of this.config.watch.services) {
      this.watchService(serviceName, (instances) => {
        this.logger.debug('Service instances updated', {
          serviceName,
          count: instances.length
        });
      });
    }
  }

  private generateServiceId(): string {
    const hostname = os.hostname();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    
    return `${this.config.serviceName}-${hostname}-${timestamp}-${random}`;
  }

  private getServiceAddress(): string {
    // Get the first non-internal IPv4 address
    const interfaces = os.networkInterfaces();
    
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]!) {
        if ('IPv4' !== iface.family || iface.internal) continue;
        return iface.address;
      }
    }
    
    return '127.0.0.1';
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down service discovery manager');
    
    // Stop health checks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Deregister all services
    const deregisterPromises = Array.from(this.registeredServices.keys()).map(
      serviceId => this.deregisterService(serviceId)
    );
    
    await Promise.all(deregisterPromises);
    
    this.isStarted = false;
    this.logger.info('Service discovery manager shut down');
  }

  getRegisteredServices(): ServiceInstance[] {
    return Array.from(this.registeredServices.values());
  }

  getDiscoveredServices(): ServiceRegistry {
    return { ...this.discoveredServices };
  }
}

export default ServiceDiscoveryManager;