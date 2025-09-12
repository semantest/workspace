/**
 * Correlation ID Tracker
 * Tracks and manages correlation IDs across the system
 */

class CorrelationTracker {
  constructor() {
    // Map of correlation IDs to their associated data
    this.correlations = new Map();
    
    // Map of request IDs to correlation IDs
    this.requestToCorrelation = new Map();
    
    // Map of correlation IDs to active sagas
    this.correlationToSagas = new Map();
    
    // Cleanup old correlations after this time
    this.cleanupInterval = 60 * 60 * 1000; // 1 hour
    this.maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    // Start cleanup timer
    this.startCleanup();
  }
  
  /**
   * Create a new correlation context
   */
  createCorrelation(metadata = {}) {
    const correlationId = this.generateCorrelationId();
    
    const context = {
      correlationId,
      createdAt: Date.now(),
      metadata,
      events: [],
      requests: new Set(),
      sagas: new Set(),
      timeline: []
    };
    
    this.correlations.set(correlationId, context);
    
    this.addToTimeline(correlationId, 'correlation_created', {
      metadata
    });
    
    return correlationId;
  }
  
  /**
   * Get or create correlation ID from incoming data
   */
  ensureCorrelationId(data) {
    if (data.correlationId) {
      // Ensure the correlation exists in our tracker
      if (!this.correlations.has(data.correlationId)) {
        this.correlations.set(data.correlationId, {
          correlationId: data.correlationId,
          createdAt: Date.now(),
          metadata: {},
          events: [],
          requests: new Set(),
          sagas: new Set(),
          timeline: []
        });
      }
      return data.correlationId;
    }
    
    // Check if this request already has a correlation
    if (data.requestId && this.requestToCorrelation.has(data.requestId)) {
      return this.requestToCorrelation.get(data.requestId);
    }
    
    // Create new correlation
    return this.createCorrelation(data.metadata || {});
  }
  
  /**
   * Track an event within a correlation
   */
  trackEvent(correlationId, event) {
    const context = this.correlations.get(correlationId);
    if (!context) return;
    
    context.events.push({
      eventId: event.eventId || this.generateEventId(),
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      timestamp: Date.now(),
      payload: event.payload
    });
    
    this.addToTimeline(correlationId, 'event_tracked', {
      eventType: event.eventType,
      aggregateId: event.aggregateId
    });
  }
  
  /**
   * Track a request within a correlation
   */
  trackRequest(correlationId, requestId) {
    const context = this.correlations.get(correlationId);
    if (!context) return;
    
    context.requests.add(requestId);
    this.requestToCorrelation.set(requestId, correlationId);
    
    this.addToTimeline(correlationId, 'request_tracked', {
      requestId
    });
  }
  
  /**
   * Track a saga within a correlation
   */
  trackSaga(correlationId, sagaId) {
    const context = this.correlations.get(correlationId);
    if (!context) return;
    
    context.sagas.add(sagaId);
    
    if (!this.correlationToSagas.has(correlationId)) {
      this.correlationToSagas.set(correlationId, new Set());
    }
    this.correlationToSagas.get(correlationId).add(sagaId);
    
    this.addToTimeline(correlationId, 'saga_tracked', {
      sagaId
    });
  }
  
  /**
   * Add entry to correlation timeline
   */
  addToTimeline(correlationId, action, data) {
    const context = this.correlations.get(correlationId);
    if (!context) return;
    
    context.timeline.push({
      timestamp: Date.now(),
      action,
      data
    });
  }
  
  /**
   * Get correlation context
   */
  getCorrelation(correlationId) {
    return this.correlations.get(correlationId);
  }
  
  /**
   * Get correlation ID for a request
   */
  getCorrelationByRequest(requestId) {
    return this.requestToCorrelation.get(requestId);
  }
  
  /**
   * Get all sagas for a correlation
   */
  getSagasByCorrelation(correlationId) {
    return Array.from(this.correlationToSagas.get(correlationId) || []);
  }
  
  /**
   * Get correlation trace (full history)
   */
  getTrace(correlationId) {
    const context = this.correlations.get(correlationId);
    if (!context) return null;
    
    return {
      correlationId,
      createdAt: context.createdAt,
      age: Date.now() - context.createdAt,
      metadata: context.metadata,
      eventCount: context.events.length,
      requestCount: context.requests.size,
      sagaCount: context.sagas.size,
      events: context.events,
      requests: Array.from(context.requests),
      sagas: Array.from(context.sagas),
      timeline: context.timeline
    };
  }
  
  /**
   * Generate correlation report
   */
  generateReport(correlationId) {
    const trace = this.getTrace(correlationId);
    if (!trace) return null;
    
    const report = {
      correlationId,
      summary: {
        createdAt: new Date(trace.createdAt).toISOString(),
        duration: `${Math.round(trace.age / 1000)}s`,
        eventCount: trace.eventCount,
        requestCount: trace.requestCount,
        sagaCount: trace.sagaCount
      },
      timeline: trace.timeline.map(entry => ({
        time: new Date(entry.timestamp).toISOString(),
        action: entry.action,
        data: entry.data
      })),
      events: trace.events.map(e => ({
        time: new Date(e.timestamp).toISOString(),
        type: e.eventType,
        aggregateId: e.aggregateId
      }))
    };
    
    return report;
  }
  
  /**
   * Clean up old correlations
   */
  cleanup() {
    const now = Date.now();
    const toDelete = [];
    
    this.correlations.forEach((context, correlationId) => {
      if (now - context.createdAt > this.maxAge) {
        toDelete.push(correlationId);
      }
    });
    
    toDelete.forEach(correlationId => {
      const context = this.correlations.get(correlationId);
      
      // Clean up request mappings
      context.requests.forEach(requestId => {
        this.requestToCorrelation.delete(requestId);
      });
      
      // Clean up saga mappings
      this.correlationToSagas.delete(correlationId);
      
      // Delete the correlation
      this.correlations.delete(correlationId);
    });
    
    if (toDelete.length > 0) {
      console.log(`[CorrelationTracker] Cleaned up ${toDelete.length} old correlations`);
    }
  }
  
  /**
   * Start cleanup timer
   */
  startCleanup() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }
  
  /**
   * Generate a correlation ID
   */
  generateCorrelationId() {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Generate an event ID
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get statistics
   */
  getStats() {
    return {
      activeCorrelations: this.correlations.size,
      trackedRequests: this.requestToCorrelation.size,
      activeSagas: this.correlationToSagas.size,
      oldestCorrelation: this.getOldestCorrelation(),
      newestCorrelation: this.getNewestCorrelation()
    };
  }
  
  getOldestCorrelation() {
    let oldest = null;
    let oldestTime = Date.now();
    
    this.correlations.forEach((context, id) => {
      if (context.createdAt < oldestTime) {
        oldestTime = context.createdAt;
        oldest = id;
      }
    });
    
    return oldest;
  }
  
  getNewestCorrelation() {
    let newest = null;
    let newestTime = 0;
    
    this.correlations.forEach((context, id) => {
      if (context.createdAt > newestTime) {
        newestTime = context.createdAt;
        newest = id;
      }
    });
    
    return newest;
  }
}

/**
 * Correlation middleware for WebSocket messages
 */
class CorrelationMiddleware {
  constructor(tracker) {
    this.tracker = tracker;
  }
  
  /**
   * Process incoming message
   */
  processIncoming(message, clientId) {
    // Ensure correlation ID exists
    const correlationId = this.tracker.ensureCorrelationId(message);
    
    // Add correlation ID to message if not present
    if (!message.correlationId) {
      message.correlationId = correlationId;
    }
    
    // Track the message
    this.tracker.addToTimeline(correlationId, 'message_received', {
      type: message.type,
      clientId,
      hasRequestId: !!message.requestId
    });
    
    // Track request if present
    if (message.requestId) {
      this.tracker.trackRequest(correlationId, message.requestId);
    }
    
    return message;
  }
  
  /**
   * Process outgoing message
   */
  processOutgoing(message, clientId) {
    // Ensure correlation ID is included
    if (message.correlationId) {
      this.tracker.addToTimeline(message.correlationId, 'message_sent', {
        type: message.type,
        clientId,
        hasRequestId: !!message.requestId
      });
    }
    
    return message;
  }
  
  /**
   * Process event store event
   */
  processEvent(event) {
    const correlationId = event.metadata?.correlationId;
    if (correlationId) {
      this.tracker.trackEvent(correlationId, event);
    }
    return event;
  }
  
  /**
   * Process saga lifecycle
   */
  processSaga(sagaId, correlationId) {
    if (correlationId) {
      this.tracker.trackSaga(correlationId, sagaId);
    }
  }
}

module.exports = {
  CorrelationTracker,
  CorrelationMiddleware
};