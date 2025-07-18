export declare abstract class DomainEvent {
    readonly correlationId: string;
    readonly aggregateId?: string | undefined;
    readonly timestamp: Date;
    abstract readonly eventType: string;
    constructor(correlationId: string, aggregateId?: string | undefined);
    toJSON(): any;
}
export declare abstract class IntegrationEvent extends DomainEvent {
    abstract readonly version: string;
    abstract readonly source: string;
}
export interface EventHandler<T extends DomainEvent> {
    handle(event: T): Promise<void>;
}
export interface EventBus {
    publish(event: DomainEvent): Promise<void>;
    subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void;
}
export declare class EntityCreated extends DomainEvent {
    readonly entityType: string;
    readonly entityData: any;
    readonly eventType = "EntityCreated";
    constructor(correlationId: string, aggregateId: string, entityType: string, entityData: any);
}
export declare class EntityUpdated extends DomainEvent {
    readonly entityType: string;
    readonly changes: any;
    readonly eventType = "EntityUpdated";
    constructor(correlationId: string, aggregateId: string, entityType: string, changes: any);
}
export declare class EntityDeleted extends DomainEvent {
    readonly entityType: string;
    readonly eventType = "EntityDeleted";
    constructor(correlationId: string, aggregateId: string, entityType: string);
}
export declare class OperationStarted extends DomainEvent {
    readonly operation: string;
    readonly parameters?: any | undefined;
    readonly eventType = "OperationStarted";
    constructor(correlationId: string, operation: string, parameters?: any | undefined);
}
export declare class OperationCompleted extends DomainEvent {
    readonly operation: string;
    readonly result?: any | undefined;
    readonly eventType = "OperationCompleted";
    constructor(correlationId: string, operation: string, result?: any | undefined);
}
export declare class OperationFailed extends DomainEvent {
    readonly operation: string;
    readonly error: string;
    readonly details?: any | undefined;
    readonly eventType = "OperationFailed";
    constructor(correlationId: string, operation: string, error: string, details?: any | undefined);
}
