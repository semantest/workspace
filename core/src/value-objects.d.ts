export declare abstract class ValueObject<T> {
    protected readonly value: T;
    constructor(value: T);
    protected abstract validate(value: T): void;
    getValue(): T;
    equals(other: ValueObject<T>): boolean;
    toJSON(): T;
}
export declare class Id extends ValueObject<string> {
    protected validate(value: string): void;
    static create(value: string): Id;
}
export declare class Email extends ValueObject<string> {
    private static readonly EMAIL_REGEX;
    protected validate(value: string): void;
    static create(value: string): Email;
}
export declare class Url extends ValueObject<string> {
    protected validate(value: string): void;
    static create(value: string): Url;
    getProtocol(): string;
    getHost(): string;
    getPathname(): string;
}
export declare class Timestamp extends ValueObject<Date> {
    protected validate(value: Date): void;
    static create(value: Date | string | number): Timestamp;
    static now(): Timestamp;
    toISOString(): string;
    isBefore(other: Timestamp): boolean;
    isAfter(other: Timestamp): boolean;
}
export declare class Name extends ValueObject<string> {
    protected validate(value: string): void;
    static create(value: string): Name;
}
export declare class Version extends ValueObject<string> {
    private static readonly VERSION_REGEX;
    protected validate(value: string): void;
    static create(value: string): Version;
    getMajor(): number;
    getMinor(): number;
    getPatch(): number;
    getSuffix(): string | null;
}
//# sourceMappingURL=value-objects.d.ts.map