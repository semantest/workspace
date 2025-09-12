/**
 * Event Domain Model
 * Base class for all domain events in the system
 */

class DomainEvent {
  constructor(aggregateId, eventType, payload, metadata = {}) {
    this.eventId = this.generateEventId();
    this.aggregateId = aggregateId;
    this.eventType = eventType;
    this.eventVersion = 1; // Default version, can be overridden
    this.payload = payload;
    this.metadata = {
      ...metadata,
      correlationId: metadata.correlationId || this.generateCorrelationId(),
      causationId: metadata.causationId || null,
      userId: metadata.userId || 'system',
      timestamp: new Date().toISOString(),
      sequenceNumber: null // Will be set by event store
    };
  }

  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateCorrelationId() {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  toJSON() {
    return {
      eventId: this.eventId,
      aggregateId: this.aggregateId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      payload: this.payload,
      metadata: this.metadata
    };
  }

  static fromJSON(json) {
    const event = new DomainEvent(
      json.aggregateId,
      json.eventType,
      json.payload,
      json.metadata
    );
    event.eventId = json.eventId;
    event.eventVersion = json.eventVersion;
    return event;
  }
}

/**
 * Event Envelope
 * Wraps events with store metadata
 */
class EventEnvelope {
  constructor(event, streamPosition, globalPosition, committedAt) {
    this.event = event;
    this.streamPosition = streamPosition;
    this.globalPosition = globalPosition;
    this.committedAt = committedAt;
  }

  toJSON() {
    return {
      event: this.event.toJSON(),
      streamPosition: this.streamPosition,
      globalPosition: this.globalPosition,
      committedAt: this.committedAt
    };
  }
}

/**
 * Snapshot
 * Aggregate state at a specific point in time
 */
class Snapshot {
  constructor(aggregateId, aggregateType, data, version, timestamp = new Date().toISOString()) {
    this.snapshotId = this.generateSnapshotId();
    this.aggregateId = aggregateId;
    this.aggregateType = aggregateType;
    this.data = data;
    this.version = version;
    this.timestamp = timestamp;
  }

  generateSnapshotId() {
    return `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  toJSON() {
    return {
      snapshotId: this.snapshotId,
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      data: this.data,
      version: this.version,
      timestamp: this.timestamp
    };
  }
}

module.exports = { DomainEvent, EventEnvelope, Snapshot };