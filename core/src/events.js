"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationFailed = exports.OperationCompleted = exports.OperationStarted = exports.EntityDeleted = exports.EntityUpdated = exports.EntityCreated = exports.IntegrationEvent = exports.DomainEvent = void 0;
class DomainEvent {
    constructor(correlationId, aggregateId) {
        this.correlationId = correlationId;
        this.aggregateId = aggregateId;
        this.timestamp = new Date();
    }
    toJSON() {
        return {
            eventType: this.eventType,
            correlationId: this.correlationId,
            aggregateId: this.aggregateId,
            timestamp: this.timestamp
        };
    }
}
exports.DomainEvent = DomainEvent;
class IntegrationEvent extends DomainEvent {
}
exports.IntegrationEvent = IntegrationEvent;
class EntityCreated extends DomainEvent {
    constructor(correlationId, aggregateId, entityType, entityData) {
        super(correlationId, aggregateId);
        this.entityType = entityType;
        this.entityData = entityData;
        this.eventType = 'EntityCreated';
    }
}
exports.EntityCreated = EntityCreated;
class EntityUpdated extends DomainEvent {
    constructor(correlationId, aggregateId, entityType, changes) {
        super(correlationId, aggregateId);
        this.entityType = entityType;
        this.changes = changes;
        this.eventType = 'EntityUpdated';
    }
}
exports.EntityUpdated = EntityUpdated;
class EntityDeleted extends DomainEvent {
    constructor(correlationId, aggregateId, entityType) {
        super(correlationId, aggregateId);
        this.entityType = entityType;
        this.eventType = 'EntityDeleted';
    }
}
exports.EntityDeleted = EntityDeleted;
class OperationStarted extends DomainEvent {
    constructor(correlationId, operation, parameters) {
        super(correlationId);
        this.operation = operation;
        this.parameters = parameters;
        this.eventType = 'OperationStarted';
    }
}
exports.OperationStarted = OperationStarted;
class OperationCompleted extends DomainEvent {
    constructor(correlationId, operation, result) {
        super(correlationId);
        this.operation = operation;
        this.result = result;
        this.eventType = 'OperationCompleted';
    }
}
exports.OperationCompleted = OperationCompleted;
class OperationFailed extends DomainEvent {
    constructor(correlationId, operation, error, details) {
        super(correlationId);
        this.operation = operation;
        this.error = error;
        this.details = details;
        this.eventType = 'OperationFailed';
    }
}
exports.OperationFailed = OperationFailed;
//# sourceMappingURL=events.js.map