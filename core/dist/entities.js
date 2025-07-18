"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimestampedEntity = exports.AggregateRoot = exports.Entity = void 0;
class Entity {
    constructor(props) {
        this._domainEvents = [];
        this.props = props;
    }
    equals(other) {
        if (!(other instanceof Entity)) {
            return false;
        }
        return this.getId() === other.getId();
    }
    getProps() {
        return { ...this.props };
    }
    updateProps(updates) {
        this.props = { ...this.props, ...updates };
    }
    addDomainEvent(event) {
        this._domainEvents.push(event);
    }
    getDomainEvents() {
        return [...this._domainEvents];
    }
    clearDomainEvents() {
        this._domainEvents = [];
    }
    toJSON() {
        return {
            id: this.getId(),
            ...this.props
        };
    }
}
exports.Entity = Entity;
class AggregateRoot extends Entity {
    applyEvent(event) {
        this.addDomainEvent(event);
        this.apply(event);
    }
}
exports.AggregateRoot = AggregateRoot;
class TimestampedEntity extends Entity {
    getId() {
        return this.props.id;
    }
    getCreatedAt() {
        return this.props.createdAt;
    }
    getUpdatedAt() {
        return this.props.updatedAt;
    }
    updateProps(updates) {
        super.updateProps({
            ...updates,
            updatedAt: new Date()
        });
    }
}
exports.TimestampedEntity = TimestampedEntity;
//# sourceMappingURL=entities.js.map