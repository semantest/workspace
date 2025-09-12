/**
 * Aggregate Root Base Class
 * Foundation for event-sourced aggregates
 */

const { DomainEvent } = require('./event');

class AggregateRoot {
  constructor(id) {
    this.id = id;
    this.version = 0;
    this.uncommittedEvents = [];
    this.eventHandlers = new Map();
  }

  /**
   * Apply an event to the aggregate
   * This method is used both for replaying history and applying new events
   */
  applyEvent(event, isNew = true) {
    // Look for a handler method named 'on' + eventType
    const handlerName = `on${event.eventType}`;
    const handler = this[handlerName] || this.eventHandlers.get(event.eventType);
    
    if (handler) {
      handler.call(this, event.payload, event.metadata);
    }
    
    if (isNew) {
      this.uncommittedEvents.push(event);
    }
    
    this.version++;
  }

  /**
   * Raise a new domain event
   */
  raiseEvent(eventType, payload, metadata = {}) {
    const event = new DomainEvent(
      this.id,
      eventType,
      payload,
      metadata
    );
    
    this.applyEvent(event, true);
    return event;
  }

  /**
   * Register an event handler
   */
  registerEventHandler(eventType, handler) {
    this.eventHandlers.set(eventType, handler);
  }

  /**
   * Get uncommitted events and mark them as committed
   */
  getUncommittedEvents() {
    const events = [...this.uncommittedEvents];
    return events;
  }

  /**
   * Mark all events as committed
   */
  markEventsAsCommitted() {
    this.uncommittedEvents = [];
  }

  /**
   * Load aggregate from event history
   */
  static loadFromHistory(events) {
    if (!events || events.length === 0) {
      return null;
    }

    // Create new instance - derived class should override this
    const aggregate = new this(events[0].aggregateId);
    
    // Replay all events
    for (const event of events) {
      aggregate.applyEvent(event, false);
    }
    
    return aggregate;
  }

  /**
   * Create snapshot of current state
   */
  createSnapshot() {
    return {
      id: this.id,
      version: this.version,
      state: this.getSnapshotData()
    };
  }

  /**
   * Load aggregate from snapshot and subsequent events
   */
  static loadFromSnapshot(snapshot, events = []) {
    const aggregate = new this(snapshot.aggregateId);
    aggregate.restoreFromSnapshot(snapshot);
    
    // Apply events that occurred after the snapshot
    for (const event of events) {
      aggregate.applyEvent(event, false);
    }
    
    return aggregate;
  }

  /**
   * Override in derived classes to provide snapshot data
   */
  getSnapshotData() {
    throw new Error('getSnapshotData must be implemented by derived class');
  }

  /**
   * Override in derived classes to restore from snapshot
   */
  restoreFromSnapshot(snapshot) {
    throw new Error('restoreFromSnapshot must be implemented by derived class');
  }
}

module.exports = AggregateRoot;