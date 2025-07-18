/*
                        Semantest - Core Utils
                        Common utility functions

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { Result, Option, Maybe, Either } from './types';

/**
 * Utility functions for common operations
 */
export class Utils {
    /**
     * Generate UUID v4
     */
    static generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Generate correlation ID
     */
    static generateCorrelationId(): string {
        return this.generateUUID();
    }

    /**
     * Deep clone object
     */
    static deepClone<T>(obj: T): T {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (obj instanceof Date) {
            return new Date(obj.getTime()) as any;
        }

        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item)) as any;
        }

        if (typeof obj === 'object') {
            const cloned = {} as any;
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = this.deepClone(obj[key]);
                }
            }
            return cloned;
        }

        return obj;
    }

    /**
     * Deep merge objects
     */
    static deepMerge<T>(target: T, source: Partial<T>): T {
        const result = { ...target };
        
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                const sourceValue = source[key];
                const targetValue = result[key];
                
                if (this.isObject(sourceValue) && this.isObject(targetValue)) {
                    result[key] = this.deepMerge(targetValue, sourceValue);
                } else {
                    result[key] = sourceValue as any;
                }
            }
        }
        
        return result;
    }

    /**
     * Check if value is object
     */
    static isObject(value: any): boolean {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    /**
     * Check if value is empty
     */
    static isEmpty(value: any): boolean {
        if (value === null || value === undefined) {
            return true;
        }
        
        if (typeof value === 'string') {
            return value.trim().length === 0;
        }
        
        if (Array.isArray(value)) {
            return value.length === 0;
        }
        
        if (typeof value === 'object') {
            return Object.keys(value).length === 0;
        }
        
        return false;
    }

    /**
     * Sanitize filename
     */
    static sanitizeFilename(filename: string): string {
        return filename.replace(/[^a-z0-9.-]/gi, '_');
    }

    /**
     * Format date to ISO string
     */
    static formatDate(date: Date): string {
        return date.toISOString();
    }

    /**
     * Parse date from string
     */
    static parseDate(dateString: string): Date {
        return new Date(dateString);
    }

    /**
     * Sleep for specified milliseconds
     */
    static sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Retry operation with exponential backoff
     */
    static async retry<T>(
        operation: () => Promise<T>,
        maxRetries: number = 3,
        baseDelay: number = 1000
    ): Promise<T> {
        let lastError: Error;
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;
                
                if (attempt === maxRetries - 1) {
                    throw lastError;
                }
                
                const delay = baseDelay * Math.pow(2, attempt);
                await this.sleep(delay);
            }
        }
        
        throw lastError!;
    }

    /**
     * Debounce function
     */
    static debounce<T extends (...args: any[]) => any>(
        func: T,
        wait: number
    ): (...args: Parameters<T>) => void {
        let timeout: NodeJS.Timeout;
        
        return (...args: Parameters<T>) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    /**
     * Throttle function
     */
    static throttle<T extends (...args: any[]) => any>(
        func: T,
        wait: number
    ): (...args: Parameters<T>) => void {
        let lastTime = 0;
        
        return (...args: Parameters<T>) => {
            const now = Date.now();
            
            if (now - lastTime >= wait) {
                lastTime = now;
                func(...args);
            }
        };
    }

    /**
     * Chunk array into smaller arrays
     */
    static chunk<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = [];
        
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        
        return chunks;
    }

    /**
     * Group array by key
     */
    static groupBy<T, K extends keyof T>(array: T[], key: K): Record<string, T[]> {
        return array.reduce((groups, item) => {
            const group = String(item[key]);
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {} as Record<string, T[]>);
    }

    /**
     * Remove duplicates from array
     */
    static unique<T>(array: T[]): T[] {
        return [...new Set(array)];
    }

    /**
     * Flatten nested array
     */
    static flatten<T>(array: (T | T[])[]): T[] {
        return array.reduce<T[]>((acc, val) => {
            return acc.concat(Array.isArray(val) ? this.flatten(val) : val);
        }, []);
    }
}

/**
 * Result utility functions
 */
export class ResultUtils {
    /**
     * Create success result
     */
    static success<T>(data: T): Result<T> {
        return { success: true, data };
    }

    /**
     * Create error result
     */
    static error<E = Error>(error: E): Result<never, E> {
        return { success: false, error };
    }

    /**
     * Map result value
     */
    static map<T, U>(result: Result<T>, mapper: (value: T) => U): Result<U> {
        if (result.success) {
            return this.success(mapper(result.data));
        }
        return result;
    }

    /**
     * Flat map result
     */
    static flatMap<T, U>(result: Result<T>, mapper: (value: T) => Result<U>): Result<U> {
        if (result.success) {
            return mapper(result.data);
        }
        return result;
    }

    /**
     * Check if result is success
     */
    static isSuccess<T>(result: Result<T>): result is { success: true; data: T } {
        return result.success;
    }

    /**
     * Check if result is error
     */
    static isError<T>(result: Result<T>): result is { success: false; error: any } {
        return !result.success;
    }
}

/**
 * Option utility functions
 */
export class OptionUtils {
    /**
     * Create Some option
     */
    static some<T>(value: T): Option<T> {
        return value;
    }

    /**
     * Create None option
     */
    static none<T>(): Option<T> {
        return null;
    }

    /**
     * Check if option has value
     */
    static isSome<T>(option: Option<T>): option is T {
        return option !== null && option !== undefined;
    }

    /**
     * Check if option is empty
     */
    static isNone<T>(option: Option<T>): option is null | undefined {
        return option === null || option === undefined;
    }

    /**
     * Map option value
     */
    static map<T, U>(option: Option<T>, mapper: (value: T) => U): Option<U> {
        return this.isSome(option) ? mapper(option) : null;
    }

    /**
     * Flat map option
     */
    static flatMap<T, U>(option: Option<T>, mapper: (value: T) => Option<U>): Option<U> {
        return this.isSome(option) ? mapper(option) : null;
    }

    /**
     * Get value or default
     */
    static getOrElse<T>(option: Option<T>, defaultValue: T): T {
        return this.isSome(option) ? option : defaultValue;
    }
}

/**
 * Either utility functions
 */
export class EitherUtils {
    /**
     * Create Left either
     */
    static left<L, R>(value: L): Either<L, R> {
        return { kind: 'left', value };
    }

    /**
     * Create Right either
     */
    static right<L, R>(value: R): Either<L, R> {
        return { kind: 'right', value };
    }

    /**
     * Check if either is left
     */
    static isLeft<L, R>(either: Either<L, R>): either is { kind: 'left'; value: L } {
        return either.kind === 'left';
    }

    /**
     * Check if either is right
     */
    static isRight<L, R>(either: Either<L, R>): either is { kind: 'right'; value: R } {
        return either.kind === 'right';
    }

    /**
     * Map either value
     */
    static map<L, R, U>(either: Either<L, R>, mapper: (value: R) => U): Either<L, U> {
        if (this.isRight(either)) {
            return this.right(mapper(either.value));
        }
        return either;
    }

    /**
     * Flat map either
     */
    static flatMap<L, R, U>(either: Either<L, R>, mapper: (value: R) => Either<L, U>): Either<L, U> {
        if (this.isRight(either)) {
            return mapper(either.value);
        }
        return either;
    }
}