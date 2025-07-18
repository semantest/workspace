import { ValidationResult, BusinessRule } from './types';
export declare class ValidationError extends Error {
    readonly field?: string | undefined;
    readonly code?: string | undefined;
    constructor(message: string, field?: string | undefined, code?: string | undefined);
}
export interface Validator<T> {
    validate(value: T): ValidationResult;
}
export declare abstract class BaseValidator<T> implements Validator<T> {
    protected errors: string[];
    protected warnings: string[];
    validate(value: T): ValidationResult;
    protected abstract performValidation(value: T): void;
    protected addError(message: string): void;
    protected addWarning(message: string): void;
}
export declare class CompositeValidator<T> implements Validator<T> {
    private validators;
    addValidator(validator: Validator<T>): void;
    validate(value: T): ValidationResult;
}
export declare class StringValidator extends BaseValidator<string> {
    private minLength?;
    private maxLength?;
    private pattern?;
    private required;
    setMinLength(length: number): this;
    setMaxLength(length: number): this;
    setPattern(pattern: RegExp): this;
    setRequired(required?: boolean): this;
    protected performValidation(value: string): void;
}
export declare class NumberValidator extends BaseValidator<number> {
    private min?;
    private max?;
    private integer;
    private positive;
    setMin(min: number): this;
    setMax(max: number): this;
    setInteger(integer?: boolean): this;
    setPositive(positive?: boolean): this;
    protected performValidation(value: number): void;
}
export declare class EmailValidator extends BaseValidator<string> {
    private static readonly EMAIL_REGEX;
    protected performValidation(value: string): void;
}
export declare class UrlValidator extends BaseValidator<string> {
    private allowedProtocols;
    setAllowedProtocols(protocols: string[]): this;
    protected performValidation(value: string): void;
}
export declare class ArrayValidator<T> extends BaseValidator<T[]> {
    private minLength?;
    private maxLength?;
    private itemValidator?;
    setMinLength(length: number): this;
    setMaxLength(length: number): this;
    setItemValidator(validator: Validator<T>): this;
    protected performValidation(value: T[]): void;
}
export declare class ObjectValidator<T extends Record<string, any>> extends BaseValidator<T> {
    private fieldValidators;
    private requiredFields;
    addFieldValidator<K extends keyof T>(field: K, validator: Validator<T[K]>): this;
    setRequiredFields(fields: (keyof T)[]): this;
    protected performValidation(value: T): void;
}
export declare class BusinessRuleValidator<T> implements Validator<T> {
    private rules;
    addRule(rule: BusinessRule<T>): this;
    validate(value: T): ValidationResult;
}
export declare class ValidationUtils {
    static string(): StringValidator;
    static number(): NumberValidator;
    static email(): EmailValidator;
    static url(): UrlValidator;
    static array<T>(): ArrayValidator<T>;
    static object<T extends Record<string, any>>(): ObjectValidator<T>;
    static businessRule<T>(): BusinessRuleValidator<T>;
    static composite<T>(): CompositeValidator<T>;
    static validateAndThrow<T>(validator: Validator<T>, value: T): void;
    static required<T>(value: T, fieldName: string): void;
    static range(value: number, min: number, max: number, fieldName: string): void;
    static enum<T>(value: T, enumObject: Record<string, T>, fieldName: string): void;
}
