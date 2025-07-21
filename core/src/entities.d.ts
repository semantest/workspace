import { DomainEvent } from './events';
export declare abstract class Entity<T = any> {
    protected props: T;
    private _domainEvents;
    constructor(props: T);
    equals(other: Entity<T>): boolean;
    abstract getId(): string;
    getProps(): T;
    protected updateProps(updates: Partial<T>): void;
    protected addDomainEvent(event: DomainEvent): void;
    getDomainEvents(): DomainEvent[];
    clearDomainEvents(): void;
    toJSON(): any;
}
export declare abstract class AggregateRoot<T = any> extends Entity<T> {
    protected applyEvent(event: DomainEvent): void;
    protected abstract apply(event: DomainEvent): void;
}
export interface BaseEntityProps {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare abstract class TimestampedEntity<T extends BaseEntityProps> extends Entity<T> {
    getId(): string;
    getCreatedAt(): Date;
    getUpdatedAt(): Date;
    protected updateProps(updates: Partial<T>): void;
}
//# sourceMappingURL=entities.d.ts.map