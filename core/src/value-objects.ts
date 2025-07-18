/*
                        Semantest - Core Value Objects
                        Base value object classes

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

/**
 * Base Value Object class
 */
export abstract class ValueObject<T> {
    protected readonly value: T;

    constructor(value: T) {
        this.validate(value);
        this.value = value;
    }

    /**
     * Validate value object
     */
    protected abstract validate(value: T): void;

    /**
     * Get the value
     */
    getValue(): T {
        return this.value;
    }

    /**
     * Check if two value objects are equal
     */
    equals(other: ValueObject<T>): boolean {
        if (!(other instanceof ValueObject)) {
            return false;
        }
        return JSON.stringify(this.value) === JSON.stringify(other.value);
    }

    /**
     * Convert to JSON
     */
    toJSON(): T {
        return this.value;
    }
}

/**
 * Common ID value object
 */
export class Id extends ValueObject<string> {
    protected validate(value: string): void {
        if (!value || typeof value !== 'string' || value.trim().length === 0) {
            throw new Error('ID must be a non-empty string');
        }
    }

    static create(value: string): Id {
        return new Id(value);
    }
}

/**
 * Email value object
 */
export class Email extends ValueObject<string> {
    private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    protected validate(value: string): void {
        if (!value || !Email.EMAIL_REGEX.test(value)) {
            throw new Error('Invalid email format');
        }
    }

    static create(value: string): Email {
        return new Email(value.toLowerCase());
    }
}

/**
 * URL value object
 */
export class Url extends ValueObject<string> {
    protected validate(value: string): void {
        try {
            new URL(value);
        } catch {
            throw new Error('Invalid URL format');
        }
    }

    static create(value: string): Url {
        return new Url(value);
    }

    getProtocol(): string {
        return new URL(this.value).protocol;
    }

    getHost(): string {
        return new URL(this.value).host;
    }

    getPathname(): string {
        return new URL(this.value).pathname;
    }
}

/**
 * Timestamp value object
 */
export class Timestamp extends ValueObject<Date> {
    protected validate(value: Date): void {
        if (!(value instanceof Date) || isNaN(value.getTime())) {
            throw new Error('Invalid timestamp');
        }
    }

    static create(value: Date | string | number): Timestamp {
        const date = value instanceof Date ? value : new Date(value);
        return new Timestamp(date);
    }

    static now(): Timestamp {
        return new Timestamp(new Date());
    }

    toISOString(): string {
        return this.value.toISOString();
    }

    isBefore(other: Timestamp): boolean {
        return this.value < other.value;
    }

    isAfter(other: Timestamp): boolean {
        return this.value > other.value;
    }
}

/**
 * Name value object
 */
export class Name extends ValueObject<string> {
    protected validate(value: string): void {
        if (!value || typeof value !== 'string' || value.trim().length === 0) {
            throw new Error('Name must be a non-empty string');
        }
        if (value.length > 255) {
            throw new Error('Name cannot exceed 255 characters');
        }
    }

    static create(value: string): Name {
        return new Name(value.trim());
    }
}

/**
 * Version value object
 */
export class Version extends ValueObject<string> {
    private static readonly VERSION_REGEX = /^\d+\.\d+\.\d+(-[\w\d\-]+)?$/;

    protected validate(value: string): void {
        if (!value || !Version.VERSION_REGEX.test(value)) {
            throw new Error('Invalid version format. Expected format: X.Y.Z or X.Y.Z-suffix');
        }
    }

    static create(value: string): Version {
        return new Version(value);
    }

    getMajor(): number {
        return parseInt(this.value.split('.')[0], 10);
    }

    getMinor(): number {
        return parseInt(this.value.split('.')[1], 10);
    }

    getPatch(): number {
        return parseInt(this.value.split('.')[2].split('-')[0], 10);
    }

    getSuffix(): string | null {
        const parts = this.value.split('-');
        return parts.length > 1 ? parts[1] : null;
    }
}