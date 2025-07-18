/*
                        Semantest - Core Validation
                        Validation utilities and patterns

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { ValidationResult, BusinessRule } from './types';

/**
 * Validation error
 */
export class ValidationError extends Error {
    constructor(
        message: string,
        public readonly field?: string,
        public readonly code?: string
    ) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * Validator interface
 */
export interface Validator<T> {
    validate(value: T): ValidationResult;
}

/**
 * Base validator class
 */
export abstract class BaseValidator<T> implements Validator<T> {
    protected errors: string[] = [];
    protected warnings: string[] = [];

    validate(value: T): ValidationResult {
        this.errors = [];
        this.warnings = [];
        
        this.performValidation(value);
        
        return {
            valid: this.errors.length === 0,
            errors: [...this.errors],
            warnings: [...this.warnings]
        };
    }

    protected abstract performValidation(value: T): void;

    protected addError(message: string): void {
        this.errors.push(message);
    }

    protected addWarning(message: string): void {
        this.warnings.push(message);
    }
}

/**
 * Composite validator
 */
export class CompositeValidator<T> implements Validator<T> {
    private validators: Validator<T>[] = [];

    addValidator(validator: Validator<T>): void {
        this.validators.push(validator);
    }

    validate(value: T): ValidationResult {
        const allErrors: string[] = [];
        const allWarnings: string[] = [];

        for (const validator of this.validators) {
            const result = validator.validate(value);
            allErrors.push(...result.errors);
            allWarnings.push(...result.warnings);
        }

        return {
            valid: allErrors.length === 0,
            errors: allErrors,
            warnings: allWarnings
        };
    }
}

/**
 * String validator
 */
export class StringValidator extends BaseValidator<string> {
    private minLength?: number;
    private maxLength?: number;
    private pattern?: RegExp;
    private required = false;

    setMinLength(length: number): this {
        this.minLength = length;
        return this;
    }

    setMaxLength(length: number): this {
        this.maxLength = length;
        return this;
    }

    setPattern(pattern: RegExp): this {
        this.pattern = pattern;
        return this;
    }

    setRequired(required = true): this {
        this.required = required;
        return this;
    }

    protected performValidation(value: string): void {
        if (this.required && (!value || value.trim().length === 0)) {
            this.addError('Value is required');
            return;
        }

        if (!value) {
            return;
        }

        if (this.minLength !== undefined && value.length < this.minLength) {
            this.addError(`Value must be at least ${this.minLength} characters long`);
        }

        if (this.maxLength !== undefined && value.length > this.maxLength) {
            this.addError(`Value must be no more than ${this.maxLength} characters long`);
        }

        if (this.pattern && !this.pattern.test(value)) {
            this.addError('Value does not match required pattern');
        }
    }
}

/**
 * Number validator
 */
export class NumberValidator extends BaseValidator<number> {
    private min?: number;
    private max?: number;
    private integer = false;
    private positive = false;

    setMin(min: number): this {
        this.min = min;
        return this;
    }

    setMax(max: number): this {
        this.max = max;
        return this;
    }

    setInteger(integer = true): this {
        this.integer = integer;
        return this;
    }

    setPositive(positive = true): this {
        this.positive = positive;
        return this;
    }

    protected performValidation(value: number): void {
        if (typeof value !== 'number' || isNaN(value)) {
            this.addError('Value must be a valid number');
            return;
        }

        if (this.min !== undefined && value < this.min) {
            this.addError(`Value must be at least ${this.min}`);
        }

        if (this.max !== undefined && value > this.max) {
            this.addError(`Value must be no more than ${this.max}`);
        }

        if (this.integer && !Number.isInteger(value)) {
            this.addError('Value must be an integer');
        }

        if (this.positive && value <= 0) {
            this.addError('Value must be positive');
        }
    }
}

/**
 * Email validator
 */
export class EmailValidator extends BaseValidator<string> {
    private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    protected performValidation(value: string): void {
        if (!value) {
            this.addError('Email is required');
            return;
        }

        if (!EmailValidator.EMAIL_REGEX.test(value)) {
            this.addError('Invalid email format');
        }
    }
}

/**
 * URL validator
 */
export class UrlValidator extends BaseValidator<string> {
    private allowedProtocols: string[] = ['http', 'https'];

    setAllowedProtocols(protocols: string[]): this {
        this.allowedProtocols = protocols;
        return this;
    }

    protected performValidation(value: string): void {
        if (!value) {
            this.addError('URL is required');
            return;
        }

        try {
            const url = new URL(value);
            
            if (!this.allowedProtocols.includes(url.protocol.replace(':', ''))) {
                this.addError(`URL protocol must be one of: ${this.allowedProtocols.join(', ')}`);
            }
        } catch {
            this.addError('Invalid URL format');
        }
    }
}

/**
 * Array validator
 */
export class ArrayValidator<T> extends BaseValidator<T[]> {
    private minLength?: number;
    private maxLength?: number;
    private itemValidator?: Validator<T>;

    setMinLength(length: number): this {
        this.minLength = length;
        return this;
    }

    setMaxLength(length: number): this {
        this.maxLength = length;
        return this;
    }

    setItemValidator(validator: Validator<T>): this {
        this.itemValidator = validator;
        return this;
    }

    protected performValidation(value: T[]): void {
        if (!Array.isArray(value)) {
            this.addError('Value must be an array');
            return;
        }

        if (this.minLength !== undefined && value.length < this.minLength) {
            this.addError(`Array must have at least ${this.minLength} items`);
        }

        if (this.maxLength !== undefined && value.length > this.maxLength) {
            this.addError(`Array must have no more than ${this.maxLength} items`);
        }

        if (this.itemValidator) {
            value.forEach((item, index) => {
                const result = this.itemValidator!.validate(item);
                result.errors.forEach(error => {
                    this.addError(`Item at index ${index}: ${error}`);
                });
                result.warnings.forEach(warning => {
                    this.addWarning(`Item at index ${index}: ${warning}`);
                });
            });
        }
    }
}

/**
 * Object validator
 */
export class ObjectValidator<T extends Record<string, any>> extends BaseValidator<T> {
    private fieldValidators: Map<keyof T, Validator<any>> = new Map();
    private requiredFields: Set<keyof T> = new Set();

    addFieldValidator<K extends keyof T>(field: K, validator: Validator<T[K]>): this {
        this.fieldValidators.set(field, validator);
        return this;
    }

    setRequiredFields(fields: (keyof T)[]): this {
        this.requiredFields = new Set(fields);
        return this;
    }

    protected performValidation(value: T): void {
        if (!value || typeof value !== 'object') {
            this.addError('Value must be an object');
            return;
        }

        // Check required fields
        for (const field of this.requiredFields) {
            if (!(field in value) || value[field] === undefined || value[field] === null) {
                this.addError(`Field '${String(field)}' is required`);
            }
        }

        // Validate fields
        for (const [field, validator] of this.fieldValidators) {
            if (field in value) {
                const result = validator.validate(value[field]);
                result.errors.forEach(error => {
                    this.addError(`Field '${String(field)}': ${error}`);
                });
                result.warnings.forEach(warning => {
                    this.addWarning(`Field '${String(field)}': ${warning}`);
                });
            }
        }
    }
}

/**
 * Business rule validator
 */
export class BusinessRuleValidator<T> implements Validator<T> {
    private rules: BusinessRule<T>[] = [];

    addRule(rule: BusinessRule<T>): this {
        this.rules.push(rule);
        return this;
    }

    validate(value: T): ValidationResult {
        const errors: string[] = [];

        for (const rule of this.rules) {
            if (!rule.isSatisfied(value)) {
                errors.push(rule.getMessage());
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings: []
        };
    }
}

/**
 * Validation utilities
 */
export class ValidationUtils {
    /**
     * Create string validator
     */
    static string(): StringValidator {
        return new StringValidator();
    }

    /**
     * Create number validator
     */
    static number(): NumberValidator {
        return new NumberValidator();
    }

    /**
     * Create email validator
     */
    static email(): EmailValidator {
        return new EmailValidator();
    }

    /**
     * Create URL validator
     */
    static url(): UrlValidator {
        return new UrlValidator();
    }

    /**
     * Create array validator
     */
    static array<T>(): ArrayValidator<T> {
        return new ArrayValidator<T>();
    }

    /**
     * Create object validator
     */
    static object<T extends Record<string, any>>(): ObjectValidator<T> {
        return new ObjectValidator<T>();
    }

    /**
     * Create business rule validator
     */
    static businessRule<T>(): BusinessRuleValidator<T> {
        return new BusinessRuleValidator<T>();
    }

    /**
     * Create composite validator
     */
    static composite<T>(): CompositeValidator<T> {
        return new CompositeValidator<T>();
    }

    /**
     * Validate and throw on error
     */
    static validateAndThrow<T>(validator: Validator<T>, value: T): void {
        const result = validator.validate(value);
        if (!result.valid) {
            throw new ValidationError(result.errors.join(', '));
        }
    }

    /**
     * Validate required field
     */
    static required<T>(value: T, fieldName: string): void {
        if (value === null || value === undefined || 
            (typeof value === 'string' && value.trim().length === 0)) {
            throw new ValidationError(`${fieldName} is required`, fieldName);
        }
    }

    /**
     * Validate range
     */
    static range(value: number, min: number, max: number, fieldName: string): void {
        if (value < min || value > max) {
            throw new ValidationError(
                `${fieldName} must be between ${min} and ${max}`,
                fieldName
            );
        }
    }

    /**
     * Validate enum value
     */
    static enum<T>(value: T, enumObject: Record<string, T>, fieldName: string): void {
        const validValues = Object.values(enumObject);
        if (!validValues.includes(value)) {
            throw new ValidationError(
                `${fieldName} must be one of: ${validValues.join(', ')}`,
                fieldName
            );
        }
    }
}