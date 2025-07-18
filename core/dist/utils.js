"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EitherUtils = exports.OptionUtils = exports.ResultUtils = exports.Utils = void 0;
class Utils {
    static generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    static generateCorrelationId() {
        return this.generateUUID();
    }
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item));
        }
        if (typeof obj === 'object') {
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = this.deepClone(obj[key]);
                }
            }
            return cloned;
        }
        return obj;
    }
    static deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                const sourceValue = source[key];
                const targetValue = result[key];
                if (this.isObject(sourceValue) && this.isObject(targetValue)) {
                    result[key] = this.deepMerge(targetValue, sourceValue);
                }
                else {
                    result[key] = sourceValue;
                }
            }
        }
        return result;
    }
    static isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }
    static isEmpty(value) {
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
    static sanitizeFilename(filename) {
        return filename.replace(/[^a-z0-9.-]/gi, '_');
    }
    static formatDate(date) {
        return date.toISOString();
    }
    static parseDate(dateString) {
        return new Date(dateString);
    }
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    static async retry(operation, maxRetries = 3, baseDelay = 1000) {
        let lastError;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                if (attempt === maxRetries - 1) {
                    throw lastError;
                }
                const delay = baseDelay * Math.pow(2, attempt);
                await this.sleep(delay);
            }
        }
        throw lastError;
    }
    static debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }
    static throttle(func, wait) {
        let lastTime = 0;
        return (...args) => {
            const now = Date.now();
            if (now - lastTime >= wait) {
                lastTime = now;
                func(...args);
            }
        };
    }
    static chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
    static groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = String(item[key]);
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    }
    static unique(array) {
        return [...new Set(array)];
    }
    static flatten(array) {
        return array.reduce((acc, val) => {
            return acc.concat(Array.isArray(val) ? this.flatten(val) : val);
        }, []);
    }
}
exports.Utils = Utils;
class ResultUtils {
    static success(data) {
        return { success: true, data };
    }
    static error(error) {
        return { success: false, error };
    }
    static map(result, mapper) {
        if (result.success) {
            return this.success(mapper(result.data));
        }
        return result;
    }
    static flatMap(result, mapper) {
        if (result.success) {
            return mapper(result.data);
        }
        return result;
    }
    static isSuccess(result) {
        return result.success;
    }
    static isError(result) {
        return !result.success;
    }
}
exports.ResultUtils = ResultUtils;
class OptionUtils {
    static some(value) {
        return value;
    }
    static none() {
        return null;
    }
    static isSome(option) {
        return option !== null && option !== undefined;
    }
    static isNone(option) {
        return option === null || option === undefined;
    }
    static map(option, mapper) {
        return this.isSome(option) ? mapper(option) : null;
    }
    static flatMap(option, mapper) {
        return this.isSome(option) ? mapper(option) : null;
    }
    static getOrElse(option, defaultValue) {
        return this.isSome(option) ? option : defaultValue;
    }
}
exports.OptionUtils = OptionUtils;
class EitherUtils {
    static left(value) {
        return { kind: 'left', value };
    }
    static right(value) {
        return { kind: 'right', value };
    }
    static isLeft(either) {
        return either.kind === 'left';
    }
    static isRight(either) {
        return either.kind === 'right';
    }
    static map(either, mapper) {
        if (this.isRight(either)) {
            return this.right(mapper(either.value));
        }
        return either;
    }
    static flatMap(either, mapper) {
        if (this.isRight(either)) {
            return mapper(either.value);
        }
        return either;
    }
}
exports.EitherUtils = EitherUtils;
//# sourceMappingURL=utils.js.map