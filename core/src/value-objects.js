"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Version = exports.Name = exports.Timestamp = exports.Url = exports.Email = exports.Id = exports.ValueObject = void 0;
class ValueObject {
    constructor(value) {
        this.validate(value);
        this.value = value;
    }
    getValue() {
        return this.value;
    }
    equals(other) {
        if (!(other instanceof ValueObject)) {
            return false;
        }
        return JSON.stringify(this.value) === JSON.stringify(other.value);
    }
    toJSON() {
        return this.value;
    }
}
exports.ValueObject = ValueObject;
class Id extends ValueObject {
    validate(value) {
        if (!value || typeof value !== 'string' || value.trim().length === 0) {
            throw new Error('ID must be a non-empty string');
        }
    }
    static create(value) {
        return new Id(value);
    }
}
exports.Id = Id;
class Email extends ValueObject {
    validate(value) {
        if (!value || !Email.EMAIL_REGEX.test(value)) {
            throw new Error('Invalid email format');
        }
    }
    static create(value) {
        return new Email(value.toLowerCase());
    }
}
exports.Email = Email;
Email.EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
class Url extends ValueObject {
    validate(value) {
        try {
            new URL(value);
        }
        catch {
            throw new Error('Invalid URL format');
        }
    }
    static create(value) {
        return new Url(value);
    }
    getProtocol() {
        return new URL(this.value).protocol;
    }
    getHost() {
        return new URL(this.value).host;
    }
    getPathname() {
        return new URL(this.value).pathname;
    }
}
exports.Url = Url;
class Timestamp extends ValueObject {
    validate(value) {
        if (!(value instanceof Date) || isNaN(value.getTime())) {
            throw new Error('Invalid timestamp');
        }
    }
    static create(value) {
        const date = value instanceof Date ? value : new Date(value);
        return new Timestamp(date);
    }
    static now() {
        return new Timestamp(new Date());
    }
    toISOString() {
        return this.value.toISOString();
    }
    isBefore(other) {
        return this.value < other.value;
    }
    isAfter(other) {
        return this.value > other.value;
    }
}
exports.Timestamp = Timestamp;
class Name extends ValueObject {
    validate(value) {
        if (!value || typeof value !== 'string' || value.trim().length === 0) {
            throw new Error('Name must be a non-empty string');
        }
        if (value.length > 255) {
            throw new Error('Name cannot exceed 255 characters');
        }
    }
    static create(value) {
        return new Name(value.trim());
    }
}
exports.Name = Name;
class Version extends ValueObject {
    validate(value) {
        if (!value || !Version.VERSION_REGEX.test(value)) {
            throw new Error('Invalid version format. Expected format: X.Y.Z or X.Y.Z-suffix');
        }
    }
    static create(value) {
        return new Version(value);
    }
    getMajor() {
        return parseInt(this.value.split('.')[0], 10);
    }
    getMinor() {
        return parseInt(this.value.split('.')[1], 10);
    }
    getPatch() {
        return parseInt(this.value.split('.')[2].split('-')[0], 10);
    }
    getSuffix() {
        const parts = this.value.split('-');
        return parts.length > 1 ? parts[1] : null;
    }
}
exports.Version = Version;
Version.VERSION_REGEX = /^\d+\.\d+\.\d+(-[\w\d\-]+)?$/;
//# sourceMappingURL=value-objects.js.map