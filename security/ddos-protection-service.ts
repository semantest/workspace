/**
 * @fileoverview DDoS Protection Service for Zero-Trust Architecture
 * @description Advanced DDoS detection and mitigation with traffic analysis
 */

import { Request, Response, NextFunction } from 'express';
import * as redis from 'redis';
import * as geoip from 'geoip-lite';

interface DDoSConfig {
  detectionThreshold: number;
  blockDuration: number;
  whitelistEnabled: boolean;
  geoBlocking: boolean;
  adaptiveLearning: boolean;
  trafficAnalysisWindow: number;
}

interface TrafficPattern {
  ip: string;
  requestCount: number;
  requestRate: number;
  avgResponseTime: number;
  errorRate: number;
  userAgent: string;
  geoLocation?: any;
  suspicious: boolean;
  riskScore: number;
  lastSeen: number;
  patterns: string[];
}

interface AttackVector {
  type: 'volumetric' | 'protocol' | 'application';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  indicators: string[];
  mitigationActions: string[];
}

export class ZeroTrustDDoSProtection {
  private redisClient: redis.RedisClient;
  private config: DDoSConfig;
  private suspiciousIPs = new Set<string>();
  private blockedIPs = new Set<string>();
  private trafficPatterns = new Map<string, TrafficPattern>();
  private attackVectors: AttackVector[] = [];

  constructor(redisClient: redis.RedisClient, config?: Partial<DDoSConfig>) {
    this.redisClient = redisClient;
    this.config = {
      detectionThreshold: 100, // requests per minute
      blockDuration: 3600, // 1 hour
      whitelistEnabled: true,
      geoBlocking: true,
      adaptiveLearning: true,
      trafficAnalysisWindow: 300, // 5 minutes
      ...config
    };

    this.initializeProtection();
  }

  private initializeProtection(): void {
    console.log('🛡️ Initializing DDoS Protection Service');
    
    // Start traffic analysis
    this.startTrafficAnalysis();
    
    // Start adaptive learning
    if (this.config.adaptiveLearning) {
      this.startAdaptiveLearning();
    }
    
    // Load existing patterns from Redis
    this.loadTrafficPatterns();
    
    console.log('✅ DDoS Protection Service initialized');
  }

  /**
   * Express middleware for DDoS protection
   */
  public protectionMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      try {
        const clientIP = this.getClientIP(req);
        const userAgent = req.get('User-Agent') || 'unknown';
        
        // Check if IP is whitelisted
        if (await this.isWhitelisted(clientIP)) {
          return next();
        }

        // Check if IP is blocked
        if (await this.isBlocked(clientIP)) {
          await this.logAttackEvent('blocked_request', {
            ip: clientIP,
            path: req.path,
            method: req.method,
            userAgent
          });

          return res.status(429).json({
            error: 'IP address blocked due to suspicious activity',
            code: 'IP_BLOCKED',
            retryAfter: await this.getBlockTimeRemaining(clientIP)
          });
        }

        // Analyze traffic pattern
        const pattern = await this.analyzeTrafficPattern(req, clientIP, userAgent);
        
        // Check for suspicious activity
        const threatLevel = await this.assessThreatLevel(pattern);
        
        if (threatLevel.block) {
          await this.blockIP(clientIP, threatLevel.reason, threatLevel.duration);
          
          await this.logAttackEvent('ddos_detected', {
            ip: clientIP,
            threatLevel: threatLevel.level,
            reason: threatLevel.reason,
            riskScore: pattern.riskScore
          });

          return res.status(429).json({
            error: 'Request blocked due to suspicious activity',
            code: 'THREAT_DETECTED',
            threatLevel: threatLevel.level
          });
        }

        // Add protection headers
        res.set({
          'X-DDoS-Protection': 'active',
          'X-Client-Risk-Score': pattern.riskScore.toString(),
          'X-Request-Rate': pattern.requestRate.toString()
        });

        // Monitor response time
        res.on('finish', () => {
          const responseTime = Date.now() - startTime;
          this.updateResponseTimeMetrics(clientIP, responseTime);
        });

        next();
      } catch (error) {
        console.error('❌ DDoS protection error:', error);
        // Fail open but log error
        next();
      }
    };
  }

  /**
   * Analyze traffic pattern for suspicious behavior
   */
  private async analyzeTrafficPattern(req: Request, clientIP: string, userAgent: string): Promise<TrafficPattern> {
    const now = Date.now();
    const windowStart = now - (this.config.trafficAnalysisWindow * 1000);

    // Get existing pattern or create new one
    let pattern = this.trafficPatterns.get(clientIP) || {
      ip: clientIP,
      requestCount: 0,
      requestRate: 0,
      avgResponseTime: 0,
      errorRate: 0,
      userAgent,
      suspicious: false,
      riskScore: 0,
      lastSeen: now,
      patterns: []
    };

    // Update request count and rate
    const requestKey = `ddos:requests:${clientIP}`;
    await this.redisClient.zadd(requestKey, now, `${now}-${Math.random()}`);
    await this.redisClient.zremrangebyscore(requestKey, 0, windowStart);
    await this.redisClient.expire(requestKey, this.config.trafficAnalysisWindow);

    const requestCount = await this.redisClient.zcard(requestKey);
    const requestRate = requestCount / (this.config.trafficAnalysisWindow / 60); // per minute

    // Get geolocation
    const geoLocation = geoip.lookup(clientIP);

    // Update pattern
    pattern = {
      ...pattern,
      requestCount,
      requestRate,
      geoLocation,
      lastSeen: now,
      patterns: this.detectRequestPatterns(req, pattern.patterns)
    };

    // Calculate risk score
    pattern.riskScore = await this.calculateRiskScore(pattern, req);
    pattern.suspicious = pattern.riskScore > 70;

    // Store updated pattern
    this.trafficPatterns.set(clientIP, pattern);
    await this.storeTrafficPattern(pattern);

    return pattern;
  }

  /**
   * Assess threat level based on traffic pattern
   */
  private async assessThreatLevel(pattern: TrafficPattern): Promise<{
    block: boolean;
    level: 'low' | 'medium' | 'high' | 'critical';
    reason: string;
    duration: number;
  }> {
    let level: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let block = false;
    let reason = '';
    let duration = this.config.blockDuration;

    // Rate-based detection
    if (pattern.requestRate > this.config.detectionThreshold) {
      level = 'high';
      block = true;
      reason = 'High request rate detected';
      duration = 1800; // 30 minutes
    }

    // Burst detection
    if (pattern.requestRate > this.config.detectionThreshold * 2) {
      level = 'critical';
      block = true;
      reason = 'Request flood detected';
      duration = 7200; // 2 hours
    }

    // Pattern-based detection
    if (pattern.patterns.includes('bot_behavior')) {
      level = 'medium';
      block = true;
      reason = 'Bot-like behavior detected';
      duration = 900; // 15 minutes
    }

    // Geographic anomalies
    if (this.config.geoBlocking && await this.isGeoAnomalous(pattern)) {
      level = 'medium';
      block = true;
      reason = 'Geographic anomaly detected';
      duration = 3600; // 1 hour
    }

    // Risk score threshold
    if (pattern.riskScore > 90) {
      level = 'critical';
      block = true;
      reason = 'High risk score';
      duration = 14400; // 4 hours
    }

    return { block, level, reason, duration };
  }

  /**
   * Calculate risk score based on multiple factors
   */
  private async calculateRiskScore(pattern: TrafficPattern, req: Request): Promise<number> {
    let score = 0;

    // Request rate factor (0-40 points)
    const rateRatio = pattern.requestRate / this.config.detectionThreshold;
    score += Math.min(40, rateRatio * 20);

    // User agent factor (0-20 points)
    if (this.isSuspiciousUserAgent(pattern.userAgent)) {
      score += 20;
    }

    // Geographic factor (0-15 points)
    if (pattern.geoLocation && await this.isHighRiskCountry(pattern.geoLocation.country)) {
      score += 15;
    }

    // Request pattern factor (0-15 points)
    if (pattern.patterns.includes('bot_behavior')) score += 10;
    if (pattern.patterns.includes('scanning')) score += 15;
    if (pattern.patterns.includes('brute_force')) score += 15;

    // Error rate factor (0-10 points)
    if (pattern.errorRate > 0.5) {
      score += pattern.errorRate * 10;
    }

    // Time-based anomalies (0-10 points)
    if (await this.hasTimeAnomalies(pattern)) {
      score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * Detect specific request patterns
   */
  private detectRequestPatterns(req: Request, existingPatterns: string[]): string[] {
    const patterns = [...existingPatterns];
    const path = req.path.toLowerCase();
    const userAgent = req.get('User-Agent')?.toLowerCase() || '';

    // Bot behavior detection
    const botIndicators = ['bot', 'crawler', 'spider', 'scraper', 'python', 'curl', 'wget'];
    if (botIndicators.some(indicator => userAgent.includes(indicator))) {
      if (!patterns.includes('bot_behavior')) {
        patterns.push('bot_behavior');
      }
    }

    // Scanning behavior
    const scanPaths = ['/admin', '/.env', '/config', '/wp-admin', '/phpmyadmin'];
    if (scanPaths.some(scanPath => path.includes(scanPath))) {
      if (!patterns.includes('scanning')) {
        patterns.push('scanning');
      }
    }

    // Brute force attempts
    if (path.includes('/login') || path.includes('/auth')) {
      if (!patterns.includes('brute_force')) {
        patterns.push('brute_force');
      }
    }

    // SQL injection attempts
    const sqlPatterns = ['union', 'select', 'drop', 'insert', 'update', 'delete'];
    const queryString = req.url.toLowerCase();
    if (sqlPatterns.some(sqlPattern => queryString.includes(sqlPattern))) {
      if (!patterns.includes('sql_injection')) {
        patterns.push('sql_injection');
      }
    }

    // XSS attempts
    if (queryString.includes('<script') || queryString.includes('javascript:')) {
      if (!patterns.includes('xss_attempt')) {
        patterns.push('xss_attempt');
      }
    }

    return patterns;
  }

  /**
   * Block IP address
   */
  private async blockIP(ip: string, reason: string, duration: number): Promise<void> {
    const blockKey = `ddos:blocked:${ip}`;
    const blockData = {
      reason,
      blockedAt: Date.now(),
      duration,
      expiresAt: Date.now() + (duration * 1000)
    };

    await this.redisClient.setex(blockKey, duration, JSON.stringify(blockData));
    this.blockedIPs.add(ip);

    // Add to global blocked IPs list
    await this.redisClient.sadd('ddos:global:blocked', ip);

    console.log(`🚫 Blocked IP ${ip} for ${duration}s: ${reason}`);
  }

  /**
   * Check if IP is blocked
   */
  private async isBlocked(ip: string): Promise<boolean> {
    const blockKey = `ddos:blocked:${ip}`;
    return await this.redisClient.exists(blockKey) === 1;
  }

  /**
   * Get remaining block time for IP
   */
  private async getBlockTimeRemaining(ip: string): Promise<number> {
    const blockKey = `ddos:blocked:${ip}`;
    return await this.redisClient.ttl(blockKey);
  }

  /**
   * Check if IP is whitelisted
   */
  private async isWhitelisted(ip: string): Promise<boolean> {
    if (!this.config.whitelistEnabled) return false;
    
    const whitelistKey = `ddos:whitelist:${ip}`;
    return await this.redisClient.exists(whitelistKey) === 1;
  }

  /**
   * Add IP to whitelist
   */
  public async addToWhitelist(ip: string, duration: number = 0): Promise<void> {
    const whitelistKey = `ddos:whitelist:${ip}`;
    
    if (duration > 0) {
      await this.redisClient.setex(whitelistKey, duration, '1');
    } else {
      await this.redisClient.set(whitelistKey, '1');
    }

    await this.logAttackEvent('ip_whitelisted', { ip, duration });
    console.log(`✅ Added IP ${ip} to whitelist`);
  }

  /**
   * Remove IP from whitelist
   */
  public async removeFromWhitelist(ip: string): Promise<void> {
    const whitelistKey = `ddos:whitelist:${ip}`;
    await this.redisClient.del(whitelistKey);
    
    await this.logAttackEvent('ip_removed_from_whitelist', { ip });
    console.log(`❌ Removed IP ${ip} from whitelist`);
  }

  /**
   * Unblock IP address
   */
  public async unblockIP(ip: string): Promise<void> {
    const blockKey = `ddos:blocked:${ip}`;
    await this.redisClient.del(blockKey);
    this.blockedIPs.delete(ip);
    
    await this.redisClient.srem('ddos:global:blocked', ip);
    
    await this.logAttackEvent('ip_unblocked', { ip });
    console.log(`✅ Unblocked IP ${ip}`);
  }

  /**
   * Get traffic statistics
   */
  public async getTrafficStatistics(timeWindow: number = 3600): Promise<{
    totalRequests: number;
    blockedRequests: number;
    uniqueIPs: number;
    topAttackers: Array<{ ip: string; requests: number; riskScore: number }>;
    attackVectors: AttackVector[];
    geoDistribution: Record<string, number>;
  }> {
    const now = Date.now();
    const windowStart = now - (timeWindow * 1000);

    const patterns = Array.from(this.trafficPatterns.values())
      .filter(pattern => pattern.lastSeen > windowStart);

    const totalRequests = patterns.reduce((sum, pattern) => sum + pattern.requestCount, 0);
    const blockedRequests = patterns.filter(pattern => pattern.suspicious).length;
    const uniqueIPs = patterns.length;

    const topAttackers = patterns
      .filter(pattern => pattern.suspicious)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10)
      .map(pattern => ({
        ip: pattern.ip,
        requests: pattern.requestCount,
        riskScore: pattern.riskScore
      }));

    const geoDistribution: Record<string, number> = {};
    patterns.forEach(pattern => {
      if (pattern.geoLocation?.country) {
        geoDistribution[pattern.geoLocation.country] = 
          (geoDistribution[pattern.geoLocation.country] || 0) + 1;
      }
    });

    return {
      totalRequests,
      blockedRequests,
      uniqueIPs,
      topAttackers,
      attackVectors: this.attackVectors,
      geoDistribution
    };
  }

  /**
   * Start traffic analysis background process
   */
  private startTrafficAnalysis(): void {
    setInterval(async () => {
      await this.analyzeGlobalTrafficPatterns();
      await this.detectAttackVectors();
      await this.cleanupOldData();
    }, 30000); // Every 30 seconds
  }

  /**
   * Analyze global traffic patterns for anomalies
   */
  private async analyzeGlobalTrafficPatterns(): Promise<void> {
    const now = Date.now();
    const patterns = Array.from(this.trafficPatterns.values())
      .filter(pattern => now - pattern.lastSeen < 300000); // Last 5 minutes

    if (patterns.length === 0) return;

    // Calculate baseline metrics
    const totalRequests = patterns.reduce((sum, p) => sum + p.requestCount, 0);
    const avgRequestRate = totalRequests / patterns.length;
    const avgRiskScore = patterns.reduce((sum, p) => sum + p.riskScore, 0) / patterns.length;

    // Detect anomalies
    const suspiciousPatterns = patterns.filter(p => 
      p.requestRate > avgRequestRate * 3 || p.riskScore > avgRiskScore * 2
    );

    if (suspiciousPatterns.length > patterns.length * 0.1) { // More than 10% suspicious
      await this.logAttackEvent('traffic_anomaly_detected', {
        totalPatterns: patterns.length,
        suspiciousPatterns: suspiciousPatterns.length,
        avgRequestRate,
        avgRiskScore
      });
    }
  }

  /**
   * Detect attack vectors based on traffic patterns
   */
  private async detectAttackVectors(): Promise<void> {
    const patterns = Array.from(this.trafficPatterns.values())
      .filter(p => p.suspicious);

    // Clear previous attack vectors
    this.attackVectors = [];

    // Volumetric attacks
    const highVolumePatterns = patterns.filter(p => p.requestRate > this.config.detectionThreshold);
    if (highVolumePatterns.length > 0) {
      this.attackVectors.push({
        type: 'volumetric',
        severity: highVolumePatterns.length > 10 ? 'critical' : 'high',
        confidence: Math.min(95, highVolumePatterns.length * 10),
        indicators: ['high_request_rate', 'multiple_sources'],
        mitigationActions: ['rate_limiting', 'ip_blocking']
      });
    }

    // Application layer attacks
    const appLayerPatterns = patterns.filter(p => 
      p.patterns.includes('scanning') || p.patterns.includes('sql_injection')
    );
    if (appLayerPatterns.length > 0) {
      this.attackVectors.push({
        type: 'application',
        severity: appLayerPatterns.length > 5 ? 'high' : 'medium',
        confidence: Math.min(90, appLayerPatterns.length * 15),
        indicators: ['scanning_behavior', 'injection_attempts'],
        mitigationActions: ['waf_filtering', 'payload_inspection']
      });
    }

    // Protocol attacks
    const protocolPatterns = patterns.filter(p => p.errorRate > 0.8);
    if (protocolPatterns.length > 0) {
      this.attackVectors.push({
        type: 'protocol',
        severity: protocolPatterns.length > 3 ? 'high' : 'medium',
        confidence: Math.min(85, protocolPatterns.length * 20),
        indicators: ['high_error_rate', 'malformed_requests'],
        mitigationActions: ['connection_limiting', 'protocol_validation']
      });
    }
  }

  // Helper methods
  private getClientIP(req: Request): string {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           'unknown';
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      'sqlmap', 'nmap', 'masscan', 'nikto', 'dirb', 'gobuster',
      'python-requests', 'curl/7', 'wget/', 'libwww-perl'
    ];
    
    return suspiciousPatterns.some(pattern => 
      userAgent.toLowerCase().includes(pattern)
    );
  }

  private async isHighRiskCountry(country: string): Promise<boolean> {
    // TODO: Implement country risk assessment based on threat intelligence
    const highRiskCountries = ['CN', 'RU', 'KP', 'IR']; // Example
    return highRiskCountries.includes(country);
  }

  private async isGeoAnomalous(pattern: TrafficPattern): Promise<boolean> {
    if (!pattern.geoLocation) return false;
    
    // Check if country is in unusual location compared to normal traffic
    const normalCountries = await this.getNormalTrafficCountries();
    return !normalCountries.includes(pattern.geoLocation.country);
  }

  private async getNormalTrafficCountries(): Promise<string[]> {
    // TODO: Implement normal traffic country analysis
    return ['US', 'GB', 'CA', 'AU', 'DE']; // Example baseline
  }

  private async hasTimeAnomalies(pattern: TrafficPattern): Promise<boolean> {
    // Check if requests are coming at unusual times
    const hour = new Date().getHours();
    return hour < 6 || hour > 22; // Simple night-time check
  }

  private updateResponseTimeMetrics(ip: string, responseTime: number): void {
    const pattern = this.trafficPatterns.get(ip);
    if (pattern) {
      pattern.avgResponseTime = (pattern.avgResponseTime + responseTime) / 2;
    }
  }

  private async storeTrafficPattern(pattern: TrafficPattern): Promise<void> {
    const key = `ddos:pattern:${pattern.ip}`;
    await this.redisClient.setex(key, this.config.trafficAnalysisWindow, 
      JSON.stringify(pattern));
  }

  private async loadTrafficPatterns(): Promise<void> {
    // TODO: Load existing patterns from Redis on startup
  }

  private async cleanupOldData(): Promise<void> {
    const now = Date.now();
    const cutoff = now - (this.config.trafficAnalysisWindow * 1000);

    // Remove old traffic patterns
    for (const [ip, pattern] of this.trafficPatterns.entries()) {
      if (pattern.lastSeen < cutoff) {
        this.trafficPatterns.delete(ip);
      }
    }
  }

  private startAdaptiveLearning(): void {
    // TODO: Implement machine learning for adaptive threat detection
    setInterval(async () => {
      await this.updateDetectionThresholds();
    }, 300000); // Every 5 minutes
  }

  private async updateDetectionThresholds(): Promise<void> {
    // TODO: Implement adaptive threshold adjustment based on traffic patterns
  }

  private async logAttackEvent(eventType: string, details: any): Promise<void> {
    const event = {
      timestamp: new Date().toISOString(),
      eventType,
      details,
      source: 'ddos-protection'
    };

    console.log(`🛡️ DDOS EVENT: ${eventType}`, event);
    
    const key = `ddos:events:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    await this.redisClient.setex(key, 86400, JSON.stringify(event));
  }

  /**
   * Health check for DDoS protection service
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    activeBlocks: number;
    trafficPatternsCount: number;
    redisConnected: boolean;
  }> {
    try {
      const activeBlocks = this.blockedIPs.size;
      const trafficPatternsCount = this.trafficPatterns.size;
      const redisConnected = this.redisClient.connected;

      const status = redisConnected ? 'healthy' : 'unhealthy';

      return {
        status,
        activeBlocks,
        trafficPatternsCount,
        redisConnected
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        activeBlocks: 0,
        trafficPatternsCount: 0,
        redisConnected: false
      };
    }
  }

  public async shutdown(): Promise<void> {
    console.log('🛡️ Shutting down DDoS protection service');
    // Cleanup timers and connections
  }
}

// Factory function
export const createDDoSProtection = (redisClient: redis.RedisClient, config?: Partial<DDoSConfig>) => {
  return new ZeroTrustDDoSProtection(redisClient, config);
};

// Express.js integration
export const setupDDoSProtection = (app: any, ddosProtection: ZeroTrustDDoSProtection) => {
  // Apply DDoS protection middleware globally
  app.use(ddosProtection.protectionMiddleware());

  // DDoS management endpoints
  app.get('/admin/ddos/statistics', async (req, res) => {
    try {
      const timeWindow = parseInt(req.query.window as string) || 3600;
      const stats = await ddosProtection.getTrafficStatistics(timeWindow);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get DDoS statistics' });
    }
  });

  app.post('/admin/ddos/whitelist', async (req, res) => {
    try {
      const { ip, duration } = req.body;
      await ddosProtection.addToWhitelist(ip, duration);
      res.json({ message: 'IP added to whitelist' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to add IP to whitelist' });
    }
  });

  app.delete('/admin/ddos/whitelist/:ip', async (req, res) => {
    try {
      await ddosProtection.removeFromWhitelist(req.params.ip);
      res.json({ message: 'IP removed from whitelist' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to remove IP from whitelist' });
    }
  });

  app.post('/admin/ddos/unblock', async (req, res) => {
    try {
      const { ip } = req.body;
      await ddosProtection.unblockIP(ip);
      res.json({ message: 'IP unblocked' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to unblock IP' });
    }
  });

  app.get('/admin/ddos/health', async (req, res) => {
    try {
      const health = await ddosProtection.healthCheck();
      res.json(health);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get health status' });
    }
  });
};