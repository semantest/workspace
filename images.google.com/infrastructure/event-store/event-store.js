/**
 * Event Store Implementation
 * Append-only event log with snapshot support
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const { EventEnvelope, Snapshot } = require('../../domain/events/event');

class EventStore extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.storePath = options.storePath || './data/events';
    this.snapshotPath = options.snapshotPath || './data/snapshots';
    this.snapshotFrequency = options.snapshotFrequency || 100; // Create snapshot every N events
    
    // In-memory indexes for performance
    this.streams = new Map(); // aggregateId -> array of events
    this.globalEventLog = []; // All events in order
    this.snapshots = new Map(); // aggregateId -> latest snapshot
    this.projections = new Map(); // projectionName -> projection state
    
    // Event versioning registry
    this.eventSchemas = new Map();
    this.eventUpgraders = new Map();
    
    this.globalSequence = 0;
    this.isInitialized = false;
  }

  /**
   * Initialize the event store
   */
  async initialize() {
    if (this.isInitialized) return;
    
    // Create directories if they don't exist
    await this.ensureDirectories();
    
    // Load existing events from disk
    await this.loadEventsFromDisk();
    
    // Load snapshots
    await this.loadSnapshotsFromDisk();
    
    this.isInitialized = true;
    this.emit('initialized');
  }

  async ensureDirectories() {
    await fs.mkdir(this.storePath, { recursive: true });
    await fs.mkdir(this.snapshotPath, { recursive: true });
  }

  /**
   * Append events to the store
   */
  async appendEvents(streamId, events, expectedVersion = null) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const stream = this.streams.get(streamId) || [];
    
    // Optimistic concurrency check
    if (expectedVersion !== null && stream.length !== expectedVersion) {
      throw new Error(`Concurrency conflict: expected version ${expectedVersion}, but stream is at version ${stream.length}`);
    }

    const envelopes = [];
    
    for (const event of events) {
      const streamPosition = stream.length;
      const globalPosition = this.globalSequence++;
      
      // Set sequence number in metadata
      event.metadata.sequenceNumber = globalPosition;
      
      const envelope = new EventEnvelope(
        event,
        streamPosition,
        globalPosition,
        new Date().toISOString()
      );
      
      envelopes.push(envelope);
      stream.push(envelope);
      this.globalEventLog.push(envelope);
      
      // Persist to disk
      await this.persistEvent(envelope);
      
      // Emit for projections and subscribers
      this.emit('eventAppended', envelope);
      this.emit(`stream:${streamId}`, envelope);
      this.emit(`eventType:${event.eventType}`, envelope);
    }
    
    this.streams.set(streamId, stream);
    
    // Check if we should create a snapshot
    if (stream.length % this.snapshotFrequency === 0) {
      this.emit('snapshotRequired', streamId, stream.length);
    }
    
    return envelopes;
  }

  /**
   * Read events from a stream
   */
  async readStream(streamId, fromVersion = 0, toVersion = null) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const stream = this.streams.get(streamId) || [];
    
    if (fromVersion < 0) {
      fromVersion = Math.max(0, stream.length + fromVersion);
    }
    
    const to = toVersion === null ? stream.length : Math.min(toVersion, stream.length);
    
    return stream.slice(fromVersion, to).map(envelope => envelope.event);
  }

  /**
   * Read all events from the global log
   */
  async readAllEvents(fromPosition = 0, limit = null) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const events = limit === null 
      ? this.globalEventLog.slice(fromPosition)
      : this.globalEventLog.slice(fromPosition, fromPosition + limit);
      
    return events.map(envelope => envelope.event);
  }

  /**
   * Get events by correlation ID
   */
  async getEventsByCorrelationId(correlationId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return this.globalEventLog
      .filter(envelope => envelope.event.metadata.correlationId === correlationId)
      .map(envelope => envelope.event);
  }

  /**
   * Save a snapshot
   */
  async saveSnapshot(snapshot) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.snapshots.set(snapshot.aggregateId, snapshot);
    
    // Persist to disk
    const filename = `${snapshot.aggregateId}_${snapshot.version}.json`;
    const filepath = path.join(this.snapshotPath, filename);
    
    await fs.writeFile(filepath, JSON.stringify(snapshot.toJSON(), null, 2));
    
    this.emit('snapshotSaved', snapshot);
    
    return snapshot;
  }

  /**
   * Get the latest snapshot for an aggregate
   */
  async getSnapshot(aggregateId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return this.snapshots.get(aggregateId);
  }

  /**
   * Get events since a snapshot
   */
  async getEventsSinceSnapshot(aggregateId, snapshotVersion) {
    const stream = this.streams.get(aggregateId) || [];
    return stream
      .filter(envelope => envelope.streamPosition >= snapshotVersion)
      .map(envelope => envelope.event);
  }

  /**
   * Register an event schema for versioning
   */
  registerEventSchema(eventType, version, schema) {
    if (!this.eventSchemas.has(eventType)) {
      this.eventSchemas.set(eventType, new Map());
    }
    this.eventSchemas.get(eventType).set(version, schema);
  }

  /**
   * Register an event upgrader
   */
  registerEventUpgrader(eventType, fromVersion, toVersion, upgrader) {
    const key = `${eventType}_${fromVersion}_${toVersion}`;
    this.eventUpgraders.set(key, upgrader);
  }

  /**
   * Upgrade an event to the latest version
   */
  upgradeEvent(event) {
    const currentVersion = event.eventVersion;
    const latestVersion = this.getLatestEventVersion(event.eventType);
    
    if (currentVersion === latestVersion) {
      return event;
    }
    
    let upgradedEvent = event;
    for (let v = currentVersion; v < latestVersion; v++) {
      const upgraderKey = `${event.eventType}_${v}_${v + 1}`;
      const upgrader = this.eventUpgraders.get(upgraderKey);
      
      if (upgrader) {
        upgradedEvent = upgrader(upgradedEvent);
        upgradedEvent.eventVersion = v + 1;
      }
    }
    
    return upgradedEvent;
  }

  getLatestEventVersion(eventType) {
    const versions = this.eventSchemas.get(eventType);
    if (!versions) return 1;
    return Math.max(...versions.keys());
  }

  /**
   * Persist event to disk
   */
  async persistEvent(envelope) {
    const date = new Date().toISOString().split('T')[0];
    const filename = `events_${date}.jsonl`;
    const filepath = path.join(this.storePath, filename);
    
    const line = JSON.stringify(envelope.toJSON()) + '\n';
    await fs.appendFile(filepath, line);
  }

  /**
   * Load events from disk
   */
  async loadEventsFromDisk() {
    try {
      const files = await fs.readdir(this.storePath);
      const eventFiles = files.filter(f => f.startsWith('events_')).sort();
      
      for (const file of eventFiles) {
        const filepath = path.join(this.storePath, file);
        const content = await fs.readFile(filepath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            const envelope = this.deserializeEnvelope(data);
            
            // Rebuild in-memory indexes
            const streamId = envelope.event.aggregateId;
            if (!this.streams.has(streamId)) {
              this.streams.set(streamId, []);
            }
            this.streams.get(streamId).push(envelope);
            this.globalEventLog.push(envelope);
            
            // Update global sequence
            this.globalSequence = Math.max(this.globalSequence, envelope.globalPosition + 1);
          } catch (err) {
            console.error('Error parsing event:', err);
          }
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  }

  /**
   * Load snapshots from disk
   */
  async loadSnapshotsFromDisk() {
    try {
      const files = await fs.readdir(this.snapshotPath);
      
      // Group files by aggregateId and find latest version for each
      const latestSnapshots = new Map();
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filepath = path.join(this.snapshotPath, file);
        const content = await fs.readFile(filepath, 'utf-8');
        const snapshot = new Snapshot();
        Object.assign(snapshot, JSON.parse(content));
        
        const existing = latestSnapshots.get(snapshot.aggregateId);
        if (!existing || snapshot.version > existing.version) {
          latestSnapshots.set(snapshot.aggregateId, snapshot);
        }
      }
      
      this.snapshots = latestSnapshots;
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  }

  deserializeEnvelope(data) {
    const { DomainEvent } = require('../../domain/events/event');
    const event = DomainEvent.fromJSON(data.event);
    return new EventEnvelope(
      event,
      data.streamPosition,
      data.globalPosition,
      data.committedAt
    );
  }

  /**
   * Create a projection
   */
  createProjection(name, handlers) {
    const projection = {
      name,
      handlers,
      state: {},
      position: 0
    };
    
    this.projections.set(name, projection);
    
    // Replay existing events through the projection
    this.replayProjection(projection);
    
    return projection;
  }

  /**
   * Replay events through a projection
   */
  async replayProjection(projection) {
    for (let i = projection.position; i < this.globalEventLog.length; i++) {
      const envelope = this.globalEventLog[i];
      const handler = projection.handlers[envelope.event.eventType];
      
      if (handler) {
        projection.state = await handler(projection.state, envelope.event);
      }
      
      projection.position = i + 1;
    }
  }

  /**
   * Get projection state
   */
  getProjectionState(name) {
    const projection = this.projections.get(name);
    return projection ? projection.state : null;
  }

  /**
   * Update all projections with a new event
   */
  updateProjections(envelope) {
    this.projections.forEach(async (projection) => {
      const handler = projection.handlers[envelope.event.eventType] || projection.handlers['*'];
      
      if (handler) {
        projection.state = await handler(projection.state, envelope.event);
        projection.position = envelope.globalPosition + 1;
      }
    });
  }
}

module.exports = EventStore;