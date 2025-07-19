/**
 * @fileoverview Intrusion Detection System (IDS) for Zero-Trust Architecture
 * @description Real-time intrusion detection with AI-powered threat analysis
 */

import { Request, Response, NextFunction } from 'express';
import * as redis from 'redis';
import * as crypto from 'crypto';

interface IDSConfig {
  enableRealTimeDetection: boolean;
  enableBehavioralAnalysis: boolean;
  alertThreshold: number;
  learningPeriodDays: number;
  maxAnomalyScore: number;
  enableML: boolean;
}

interface SecurityEvent {
  id: string;
  timestamp: number;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: {
    ip: string;
    userAgent: string;
    userId?: string;
    sessionId?: string;
  };
  target: {
    endpoint: string;
    method: string;
    resource?: string;
  };
  payload: any;
  indicators: string[];
  riskScore: number;
  confidence: number;
  mitigated: boolean;
  correlationId?: string;
}

interface BehavioralProfile {
  userId: string;
  baseline: {
    avgRequestsPerHour: number;
    commonPaths: string[];
    typicalHours: number[];
    geoLocations: string[];
    userAgents: string[];
  };
  current: {
    requestsThisHour: number;
    currentPath: string;
    currentHour: number;
    currentGeo: string;
    currentUserAgent: string;
  };
  anomalyScore: number;
  lastUpdated: number;
}

interface ThreatIntelligence {
  type: 'ip' | 'hash' | 'domain' | 'pattern';
  value: string;
  category: string;
  severity: string;
  source: string;
  lastSeen: number;
  confidence: number;
}

export class ZeroTrustIntrusionDetection {
  private redisClient: redis.RedisClient;
  private config: IDSConfig;
  private securityEvents: Map<string, SecurityEvent> = new Map();
  private behavioralProfiles: Map<string, BehavioralProfile> = new Map();
  private threatIntelligence: Map<string, ThreatIntelligence> = new Map();
  private alertQueue: SecurityEvent[] = [];
  private correlationEngine: Map<string, SecurityEvent[]> = new Map();

  constructor(redisClient: redis.RedisClient, config?: Partial<IDSConfig>) {
    this.redisClient = redisClient;
    this.config = {
      enableRealTimeDetection: true,
      enableBehavioralAnalysis: true,
      alertThreshold: 70,
      learningPeriodDays: 7,
      maxAnomalyScore: 90,
      enableML: true,
      ...config
    };

    this.initializeIDS();
  }

  private initializeIDS(): void {
    console.log('🔍 Initializing Intrusion Detection System');
    
    // Load threat intelligence
    this.loadThreatIntelligence();
    
    // Start real-time detection
    if (this.config.enableRealTimeDetection) {
      this.startRealTimeDetection();
    }
    
    // Start behavioral analysis
    if (this.config.enableBehavioralAnalysis) {
      this.startBehavioralAnalysis();
    }
    
    // Start correlation engine
    this.startCorrelationEngine();
    
    console.log('✅ Intrusion Detection System initialized');
  }

  /**
   * Express middleware for intrusion detection
   */
  public detectionMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      try {
        // Extract request metadata
        const metadata = this.extractRequestMetadata(req);
        
        // Real-time signature detection
        const signatureAlerts = await this.detectSignatures(req, metadata);
        
        // Behavioral analysis
        const behavioralAlerts = await this.analyzeBehavior(req, metadata);
        
        // Threat intelligence check
        const threatIntelAlerts = await this.checkThreatIntelligence(metadata);
        
        // Combine all alerts
        const allAlerts = [...signatureAlerts, ...behavioralAlerts, ...threatIntelAlerts];
        
        // Process alerts
        for (const alert of allAlerts) {
          await this.processSecurityEvent(alert);
        }
        
        // Check if request should be blocked
        const highSeverityAlerts = allAlerts.filter(alert => 
          alert.severity === 'high' || alert.severity === 'critical'
        );
        
        if (highSeverityAlerts.length > 0) {
          const blockingAlert = highSeverityAlerts[0];
          
          await this.logSecurityEvent('request_blocked', {
            alertId: blockingAlert.id,
            reason: blockingAlert.type,
            riskScore: blockingAlert.riskScore
          });

          return res.status(403).json({
            error: 'Request blocked by intrusion detection system',
            code: 'IDS_BLOCKED',
            alertId: blockingAlert.id,
            reason: blockingAlert.type
          });
        }
        
        // Add security headers
        res.set({
          'X-IDS-Status': 'monitored',
          'X-Security-Score': this.calculateOverallRisk(allAlerts).toString(),
          'X-Alerts-Count': allAlerts.length.toString()
        });

        // Monitor response for anomalies
        res.on('finish', () => {
          const responseTime = Date.now() - startTime;
          this.analyzeResponse(req, res, responseTime, metadata);
        });

        next();
      } catch (error) {
        console.error('❌ IDS detection error:', error);
        // Fail open but log error
        next();
      }
    };
  }

  /**
   * Extract comprehensive request metadata
   */
  private extractRequestMetadata(req: Request): any {
    return {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent') || 'unknown',
      method: req.method,
      path: req.path,
      url: req.url,
      headers: req.headers,
      query: req.query,
      body: req.body,
      timestamp: Date.now(),
      sessionId: req.session?.id,
      userId: req.user?.userId,
      referer: req.get('Referer'),
      contentType: req.get('Content-Type'),
      contentLength: req.get('Content-Length'),
      authorization: req.get('Authorization') ? 'present' : 'absent'
    };
  }

  /**
   * Signature-based detection for known attack patterns
   */
  private async detectSignatures(req: Request, metadata: any): Promise<SecurityEvent[]> {
    const events: SecurityEvent[] = [];
    const indicators: string[] = [];
    let riskScore = 0;

    // SQL Injection Detection
    const sqlPatterns = [
      /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
      /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%23)|(#))/i,
      /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
      /union.*select/i,
      /select.*from/i,
      /insert.*into/i,
      /delete.*from/i,
      /update.*set/i,
      /drop.*table/i
    ];

    const requestString = JSON.stringify(metadata).toLowerCase();
    for (const pattern of sqlPatterns) {
      if (pattern.test(requestString)) {
        indicators.push('sql_injection_attempt');
        riskScore += 30;
        break;
      }
    }

    // XSS Detection
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /eval\(/i,
      /alert\(/i,
      /document\.cookie/i
    ];

    for (const pattern of xssPatterns) {
      if (pattern.test(requestString)) {
        indicators.push('xss_attempt');
        riskScore += 25;
        break;
      }
    }

    // Command Injection Detection
    const cmdPatterns = [
      /\|\s*(cat|ls|pwd|whoami|id|uname)/i,
      /;\s*(cat|ls|pwd|whoami|id|uname)/i,
      /&&\s*(cat|ls|pwd|whoami|id|uname)/i,
      /\$\(.*\)/i,
      /`.*`/i,
      /\|\|/i,
      /&amp;&amp;/i
    ];

    for (const pattern of cmdPatterns) {
      if (pattern.test(requestString)) {
        indicators.push('command_injection_attempt');
        riskScore += 35;
        break;
      }
    }

    // Path Traversal Detection
    const pathTraversalPatterns = [
      /\.\.\//i,
      /\.\.%2f/i,
      /\.\.%5c/i,
      /%2e%2e%2f/i,
      /%2e%2e%5c/i,
      /\.\.\\\/i
    ];

    for (const pattern of pathTraversalPatterns) {
      if (pattern.test(requestString)) {
        indicators.push('path_traversal_attempt');
        riskScore += 20;
        break;
      }
    }

    // LDAP Injection Detection
    const ldapPatterns = [
      /\(\|\(/i,
      /\)\(\&/i,
      /\*\)\(/i,
      /\|\|/i,
      /\&\&/i
    ];

    for (const pattern of ldapPatterns) {
      if (pattern.test(requestString)) {
        indicators.push('ldap_injection_attempt');
        riskScore += 25;
        break;
      }
    }

    // XML Injection Detection
    const xmlPatterns = [
      /<!ENTITY/i,
      /<!DOCTYPE/i,
      /<\?xml/i,
      /SYSTEM\s+["']/i
    ];

    for (const pattern of xmlPatterns) {
      if (pattern.test(requestString)) {
        indicators.push('xml_injection_attempt');
        riskScore += 20;
        break;
      }
    }

    // File Upload Attacks
    if (req.files || metadata.contentType?.includes('multipart')) {
      const dangerousExtensions = ['.php', '.jsp', '.asp', '.exe', '.bat', '.cmd', '.sh'];
      const filename = req.files ? Object.keys(req.files)[0] : '';
      
      if (dangerousExtensions.some(ext => filename.toLowerCase().endsWith(ext))) {
        indicators.push('malicious_file_upload');
        riskScore += 40;
      }
    }

    // Suspicious User Agents
    const maliciousUserAgents = [
      /sqlmap/i,
      /nikto/i,
      /nmap/i,
      /masscan/i,
      /nessus/i,
      /openvas/i,
      /w3af/i,
      /dirb/i,
      /dirbuster/i,
      /gobuster/i,
      /wfuzz/i,
      /burp/i,
      /wget/i,
      /curl\/[0-9]/i
    ];

    for (const pattern of maliciousUserAgents) {
      if (pattern.test(metadata.userAgent)) {
        indicators.push('malicious_user_agent');
        riskScore += 15;
        break;
      }
    }

    // Create security event if signatures detected
    if (indicators.length > 0) {
      const event: SecurityEvent = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'signature_detection',
        severity: this.calculateSeverity(riskScore),
        source: {
          ip: metadata.ip,
          userAgent: metadata.userAgent,
          userId: metadata.userId,
          sessionId: metadata.sessionId
        },
        target: {
          endpoint: metadata.path,
          method: metadata.method
        },
        payload: metadata,
        indicators,
        riskScore,
        confidence: Math.min(95, indicators.length * 20),
        mitigated: false
      };

      events.push(event);
    }

    return events;
  }

  /**
   * Behavioral analysis for anomaly detection
   */
  private async analyzeBehavior(req: Request, metadata: any): Promise<SecurityEvent[]> {
    const events: SecurityEvent[] = [];
    
    if (!metadata.userId) {
      return events; // Can't analyze behavior without user context
    }

    // Get or create behavioral profile
    let profile = this.behavioralProfiles.get(metadata.userId);
    if (!profile) {
      profile = await this.createBehavioralProfile(metadata.userId);
    }

    const indicators: string[] = [];
    let anomalyScore = 0;

    // Analyze request frequency
    if (profile.current.requestsThisHour > profile.baseline.avgRequestsPerHour * 5) {
      indicators.push('unusual_request_frequency');
      anomalyScore += 20;
    }

    // Analyze access patterns
    if (!profile.baseline.commonPaths.includes(metadata.path)) {
      indicators.push('unusual_path_access');
      anomalyScore += 10;
    }

    // Analyze time patterns
    const currentHour = new Date().getHours();
    if (!profile.baseline.typicalHours.includes(currentHour)) {
      indicators.push('unusual_time_access');
      anomalyScore += 15;
    }

    // Analyze geographic patterns
    const currentGeo = await this.getGeolocation(metadata.ip);
    if (currentGeo && !profile.baseline.geoLocations.includes(currentGeo)) {
      indicators.push('unusual_geographic_access');
      anomalyScore += 25;
    }

    // Analyze user agent patterns
    if (!profile.baseline.userAgents.includes(metadata.userAgent)) {
      indicators.push('unusual_user_agent');
      anomalyScore += 10;
    }

    // Update profile
    profile.current = {
      requestsThisHour: profile.current.requestsThisHour + 1,
      currentPath: metadata.path,
      currentHour,
      currentGeo: currentGeo || 'unknown',
      currentUserAgent: metadata.userAgent
    };
    profile.anomalyScore = anomalyScore;
    profile.lastUpdated = Date.now();

    this.behavioralProfiles.set(metadata.userId, profile);
    await this.storeBehavioralProfile(profile);

    // Create security event if anomalies detected
    if (anomalyScore > this.config.alertThreshold) {
      const event: SecurityEvent = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'behavioral_anomaly',
        severity: this.calculateSeverity(anomalyScore),
        source: {
          ip: metadata.ip,
          userAgent: metadata.userAgent,
          userId: metadata.userId,
          sessionId: metadata.sessionId
        },
        target: {
          endpoint: metadata.path,
          method: metadata.method
        },
        payload: { profile, metadata },
        indicators,
        riskScore: anomalyScore,
        confidence: Math.min(90, anomalyScore),
        mitigated: false
      };

      events.push(event);
    }

    return events;
  }

  /**
   * Check against threat intelligence feeds
   */
  private async checkThreatIntelligence(metadata: any): Promise<SecurityEvent[]> {
    const events: SecurityEvent[] = [];
    const indicators: string[] = [];
    let riskScore = 0;

    // Check IP against threat intel
    const ipThreat = this.threatIntelligence.get(metadata.ip);
    if (ipThreat) {
      indicators.push(`malicious_ip_${ipThreat.category}`);
      riskScore += 50;
    }

    // Check user agent hash
    const userAgentHash = crypto.createHash('md5').update(metadata.userAgent).digest('hex');
    const uaThreat = this.threatIntelligence.get(userAgentHash);
    if (uaThreat) {
      indicators.push(`malicious_user_agent_${uaThreat.category}`);
      riskScore += 30;
    }

    // Check for known malicious patterns in request
    for (const [value, threat] of this.threatIntelligence) {
      if (threat.type === 'pattern' && JSON.stringify(metadata).includes(value)) {
        indicators.push(`malicious_pattern_${threat.category}`);
        riskScore += threat.confidence;
      }
    }

    // Create security event if threats detected
    if (indicators.length > 0) {
      const event: SecurityEvent = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'threat_intelligence_match',
        severity: this.calculateSeverity(riskScore),
        source: {
          ip: metadata.ip,
          userAgent: metadata.userAgent,
          userId: metadata.userId,
          sessionId: metadata.sessionId
        },
        target: {
          endpoint: metadata.path,
          method: metadata.method
        },
        payload: metadata,
        indicators,
        riskScore,
        confidence: 95,
        mitigated: false
      };

      events.push(event);
    }

    return events;
  }

  /**
   * Process and correlate security events
   */
  private async processSecurityEvent(event: SecurityEvent): Promise<void> {
    // Store event
    this.securityEvents.set(event.id, event);
    await this.storeSecurityEvent(event);

    // Add to correlation engine
    const correlationKey = `${event.source.ip}_${event.type}`;
    if (!this.correlationEngine.has(correlationKey)) {
      this.correlationEngine.set(correlationKey, []);
    }
    this.correlationEngine.get(correlationKey)!.push(event);

    // Check for correlated events
    await this.checkEventCorrelation(event);

    // Add to alert queue if severity is high enough
    if (event.severity === 'high' || event.severity === 'critical') {
      this.alertQueue.push(event);
    }

    await this.logSecurityEvent('security_event_processed', {
      eventId: event.id,
      type: event.type,
      severity: event.severity,
      riskScore: event.riskScore
    });
  }

  /**
   * Check for event correlation and attack patterns
   */
  private async checkEventCorrelation(event: SecurityEvent): Promise<void> {
    const correlationKey = `${event.source.ip}_${event.type}`;
    const relatedEvents = this.correlationEngine.get(correlationKey) || [];

    // Check for event clustering (multiple similar events)
    const recentEvents = relatedEvents.filter(e => 
      Date.now() - e.timestamp < 300000 // Last 5 minutes
    );

    if (recentEvents.length >= 3) {
      // Create correlation event
      const correlationEvent: SecurityEvent = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'correlated_attack_pattern',
        severity: 'critical',
        source: event.source,
        target: event.target,
        payload: {
          correlatedEvents: recentEvents.map(e => e.id),
          pattern: event.type,
          eventCount: recentEvents.length
        },
        indicators: ['event_clustering', 'persistent_attack'],
        riskScore: 95,
        confidence: 90,
        mitigated: false,
        correlationId: crypto.randomUUID()
      };

      await this.processSecurityEvent(correlationEvent);
    }

    // Check for multi-vector attacks
    const allRecentEvents = Array.from(this.securityEvents.values())
      .filter(e => 
        e.source.ip === event.source.ip && 
        Date.now() - e.timestamp < 600000 // Last 10 minutes
      );

    const uniqueTypes = new Set(allRecentEvents.map(e => e.type));
    if (uniqueTypes.size >= 3) {
      // Multiple attack types from same IP
      const multiVectorEvent: SecurityEvent = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'multi_vector_attack',
        severity: 'critical',
        source: event.source,
        target: event.target,
        payload: {
          attackTypes: Array.from(uniqueTypes),
          eventCount: allRecentEvents.length
        },
        indicators: ['multi_vector_attack', 'coordinated_attack'],
        riskScore: 100,
        confidence: 95,
        mitigated: false,
        correlationId: crypto.randomUUID()
      };

      await this.processSecurityEvent(multiVectorEvent);
    }
  }

  /**
   * Analyze response for additional indicators
   */
  private async analyzeResponse(req: Request, res: Response, responseTime: number, metadata: any): Promise<void> {
    const indicators: string[] = [];
    let riskScore = 0;

    // Analyze response code patterns
    if (res.statusCode === 404 && metadata.path.includes('admin')) {
      indicators.push('admin_area_scanning');
      riskScore += 10;
    }

    if (res.statusCode === 401 && responseTime < 100) {
      indicators.push('authentication_bypass_attempt');
      riskScore += 20;
    }

    if (res.statusCode === 500 && metadata.query && Object.keys(metadata.query).length > 10) {
      indicators.push('parameter_pollution');
      riskScore += 15;
    }

    // Analyze response time anomalies
    if (responseTime > 5000) { // Greater than 5 seconds
      indicators.push('slow_response_anomaly');
      riskScore += 5;
    }

    // Create event if indicators found
    if (indicators.length > 0) {
      const responseEvent: SecurityEvent = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'response_analysis',
        severity: this.calculateSeverity(riskScore),
        source: {
          ip: metadata.ip,
          userAgent: metadata.userAgent,
          userId: metadata.userId,
          sessionId: metadata.sessionId
        },
        target: {
          endpoint: metadata.path,
          method: metadata.method
        },
        payload: {
          statusCode: res.statusCode,
          responseTime,
          metadata
        },
        indicators,
        riskScore,
        confidence: 70,
        mitigated: false
      };

      await this.processSecurityEvent(responseEvent);
    }
  }

  // Helper methods
  private calculateSeverity(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }

  private calculateOverallRisk(events: SecurityEvent[]): number {
    if (events.length === 0) return 0;
    
    const totalRisk = events.reduce((sum, event) => sum + event.riskScore, 0);
    return Math.round(totalRisk / events.length);
  }

  private async createBehavioralProfile(userId: string): Promise<BehavioralProfile> {
    // TODO: Implement profile creation from historical data
    const profile: BehavioralProfile = {
      userId,
      baseline: {
        avgRequestsPerHour: 50,
        commonPaths: ['/api/user', '/api/data', '/dashboard'],
        typicalHours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
        geoLocations: ['US'],
        userAgents: ['Mozilla/5.0']
      },
      current: {
        requestsThisHour: 0,
        currentPath: '',
        currentHour: new Date().getHours(),
        currentGeo: '',
        currentUserAgent: ''
      },
      anomalyScore: 0,
      lastUpdated: Date.now()
    };

    return profile;
  }

  private async getGeolocation(ip: string): Promise<string | null> {
    // TODO: Implement geolocation lookup
    return 'US'; // Placeholder
  }

  private loadThreatIntelligence(): void {
    // TODO: Load threat intelligence from external feeds
    // Example entries
    this.threatIntelligence.set('192.168.1.100', {
      type: 'ip',
      value: '192.168.1.100',
      category: 'botnet',
      severity: 'high',
      source: 'threatfeed',
      lastSeen: Date.now(),
      confidence: 85
    });
  }

  private startRealTimeDetection(): void {
    console.log('🔍 Starting real-time detection engine');
    // Real-time detection is handled in the middleware
  }

  private startBehavioralAnalysis(): void {
    console.log('🧠 Starting behavioral analysis engine');
    
    // Update behavioral baselines periodically
    setInterval(async () => {
      await this.updateBehavioralBaselines();
    }, 3600000); // Every hour
  }

  private startCorrelationEngine(): void {
    console.log('🔗 Starting event correlation engine');
    
    // Process correlation queue
    setInterval(async () => {
      await this.processCorrelationQueue();
    }, 30000); // Every 30 seconds
  }

  private async updateBehavioralBaselines(): Promise<void> {
    // TODO: Implement baseline updates based on learning period
  }

  private async processCorrelationQueue(): Promise<void> {
    // TODO: Implement correlation processing
  }

  private async storeSecurityEvent(event: SecurityEvent): Promise<void> {
    const key = `ids:event:${event.id}`;
    await this.redisClient.setex(key, 86400, JSON.stringify(event)); // 24 hour retention
  }

  private async storeBehavioralProfile(profile: BehavioralProfile): Promise<void> {
    const key = `ids:profile:${profile.userId}`;
    await this.redisClient.setex(key, 604800, JSON.stringify(profile)); // 1 week retention
  }

  private async logSecurityEvent(eventType: string, details: any): Promise<void> {
    const event = {
      timestamp: new Date().toISOString(),
      eventType,
      details,
      source: 'intrusion-detection'
    };

    console.log(`🔍 IDS EVENT: ${eventType}`, event);
    
    const key = `ids:logs:${Date.now()}:${crypto.randomUUID()}`;
    await this.redisClient.setex(key, 86400, JSON.stringify(event));
  }

  /**
   * Get current security status and statistics
   */
  public async getSecurityStatus(): Promise<{
    activeThreats: number;
    eventsLast24h: number;
    topAttackTypes: Array<{ type: string; count: number }>;
    riskDistribution: Record<string, number>;
    correlatedAttacks: number;
  }> {
    const now = Date.now();
    const last24h = now - 86400000;

    const recentEvents = Array.from(this.securityEvents.values())
      .filter(event => event.timestamp > last24h);

    const activeThreats = recentEvents.filter(event => 
      event.severity === 'high' || event.severity === 'critical'
    ).length;

    const attackTypes = new Map<string, number>();
    const riskDistribution = { low: 0, medium: 0, high: 0, critical: 0 };

    recentEvents.forEach(event => {
      // Count attack types
      const count = attackTypes.get(event.type) || 0;
      attackTypes.set(event.type, count + 1);
      
      // Count risk distribution
      riskDistribution[event.severity]++;
    });

    const topAttackTypes = Array.from(attackTypes.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));

    const correlatedAttacks = recentEvents.filter(event => 
      event.correlationId
    ).length;

    return {
      activeThreats,
      eventsLast24h: recentEvents.length,
      topAttackTypes,
      riskDistribution,
      correlatedAttacks
    };
  }

  /**
   * Health check for IDS
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    eventsProcessed: number;
    profilesActive: number;
    threatIntelEntries: number;
    redisConnected: boolean;
  }> {
    try {
      const eventsProcessed = this.securityEvents.size;
      const profilesActive = this.behavioralProfiles.size;
      const threatIntelEntries = this.threatIntelligence.size;
      const redisConnected = this.redisClient.connected;

      const status = redisConnected ? 'healthy' : 'unhealthy';

      return {
        status,
        eventsProcessed,
        profilesActive,
        threatIntelEntries,
        redisConnected
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        eventsProcessed: 0,
        profilesActive: 0,
        threatIntelEntries: 0,
        redisConnected: false
      };
    }
  }

  public async shutdown(): Promise<void> {
    console.log('🔍 Shutting down Intrusion Detection System');
    // Cleanup and save state
  }
}

// Factory function
export const createIntrusionDetection = (redisClient: redis.RedisClient, config?: Partial<IDSConfig>) => {
  return new ZeroTrustIntrusionDetection(redisClient, config);
};

// Express.js integration
export const setupIntrusionDetection = (app: any, ids: ZeroTrustIntrusionDetection) => {
  // Apply IDS middleware globally
  app.use(ids.detectionMiddleware());

  // IDS management endpoints
  app.get('/admin/ids/status', async (req, res) => {
    try {
      const status = await ids.getSecurityStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get IDS status' });
    }
  });

  app.get('/admin/ids/health', async (req, res) => {
    try {
      const health = await ids.healthCheck();
      res.json(health);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get IDS health' });
    }
  });
};