import { Result, Option, Either } from './types';
export declare class Utils {
    static generateUUID(): string;
    static generateCorrelationId(): string;
    static deepClone<T>(obj: T): T;
    static deepMerge<T>(target: T, source: Partial<T>): T;
    static isObject(value: any): boolean;
    static isEmpty(value: any): boolean;
    static sanitizeFilename(filename: string): string;
    static formatDate(date: Date): string;
    static parseDate(dateString: string): Date;
    static sleep(ms: number): Promise<void>;
    static retry<T>(operation: () => Promise<T>, maxRetries?: number, baseDelay?: number): Promise<T>;
    static debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void;
    static throttle<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void;
    static chunk<T>(array: T[], size: number): T[][];
    static groupBy<T, K extends keyof T>(array: T[], key: K): Record<string, T[]>;
    static unique<T>(array: T[]): T[];
    static flatten<T>(array: (T | T[])[]): T[];
}
export declare class ResultUtils {
    static success<T>(data: T): Result<T>;
    static error<E = Error>(error: E): Result<never, E>;
    static map<T, U>(result: Result<T>, mapper: (value: T) => U): Result<U>;
    static flatMap<T, U>(result: Result<T>, mapper: (value: T) => Result<U>): Result<U>;
    static isSuccess<T>(result: Result<T>): result is {
        success: true;
        data: T;
    };
    static isError<T>(result: Result<T>): result is {
        success: false;
        error: any;
    };
}
export declare class OptionUtils {
    static some<T>(value: T): Option<T>;
    static none<T>(): Option<T>;
    static isSome<T>(option: Option<T>): option is T;
    static isNone<T>(option: Option<T>): option is null | undefined;
    static map<T, U>(option: Option<T>, mapper: (value: T) => U): Option<U>;
    static flatMap<T, U>(option: Option<T>, mapper: (value: T) => Option<U>): Option<U>;
    static getOrElse<T>(option: Option<T>, defaultValue: T): T;
}
export declare class EitherUtils {
    static left<L, R>(value: L): Either<L, R>;
    static right<L, R>(value: R): Either<L, R>;
    static isLeft<L, R>(either: Either<L, R>): either is {
        kind: 'left';
        value: L;
    };
    static isRight<L, R>(either: Either<L, R>): either is {
        kind: 'right';
        value: R;
    };
    static map<L, R, U>(either: Either<L, R>, mapper: (value: R) => U): Either<L, U>;
    static flatMap<L, R, U>(either: Either<L, R>, mapper: (value: R) => Either<L, U>): Either<L, U>;
}
//# sourceMappingURL=utils.d.ts.map