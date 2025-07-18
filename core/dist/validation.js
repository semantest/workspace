"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationUtils = exports.BusinessRuleValidator = exports.ObjectValidator = exports.ArrayValidator = exports.UrlValidator = exports.EmailValidator = exports.NumberValidator = exports.StringValidator = exports.CompositeValidator = exports.BaseValidator = exports.ValidationError = void 0;
class ValidationError extends Error {
    constructor(message, field, code) {
        super(message);
        this.field = field;
        this.code = code;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class BaseValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
    }
    validate(value) {
        this.errors = [];
        this.warnings = [];
        this.performValidation(value);
        return {
            valid: this.errors.length === 0,
            errors: [...this.errors],
            warnings: [...this.warnings]
        };
    }
    addError(message) {
        this.errors.push(message);
    }
    addWarning(message) {
        this.warnings.push(message);
    }
}
exports.BaseValidator = BaseValidator;
class CompositeValidator {
    constructor() {
        this.validators = [];
    }
    addValidator(validator) {
        this.validators.push(validator);
    }
    validate(value) {
        const allErrors = [];
        const allWarnings = [];
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
exports.CompositeValidator = CompositeValidator;
class StringValidator extends BaseValidator {
    constructor() {
        super(...arguments);
        this.required = false;
    }
    setMinLength(length) {
        this.minLength = length;
        return this;
    }
    setMaxLength(length) {
        this.maxLength = length;
        return this;
    }
    setPattern(pattern) {
        this.pattern = pattern;
        return this;
    }
    setRequired(required = true) {
        this.required = required;
        return this;
    }
    performValidation(value) {
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
exports.StringValidator = StringValidator;
class NumberValidator extends BaseValidator {
    constructor() {
        super(...arguments);
        this.integer = false;
        this.positive = false;
    }
    setMin(min) {
        this.min = min;
        return this;
    }
    setMax(max) {
        this.max = max;
        return this;
    }
    setInteger(integer = true) {
        this.integer = integer;
        return this;
    }
    setPositive(positive = true) {
        this.positive = positive;
        return this;
    }
    performValidation(value) {
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
exports.NumberValidator = NumberValidator;
class EmailValidator extends BaseValidator {
    performValidation(value) {
        if (!value) {
            this.addError('Email is required');
            return;
        }
        if (!EmailValidator.EMAIL_REGEX.test(value)) {
            this.addError('Invalid email format');
        }
    }
}
exports.EmailValidator = EmailValidator;
EmailValidator.EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
class UrlValidator extends BaseValidator {
    constructor() {
        super(...arguments);
        this.allowedProtocols = ['http', 'https'];
    }
    setAllowedProtocols(protocols) {
        this.allowedProtocols = protocols;
        return this;
    }
    performValidation(value) {
        if (!value) {
            this.addError('URL is required');
            return;
        }
        try {
            const url = new URL(value);
            if (!this.allowedProtocols.includes(url.protocol.replace(':', ''))) {
                this.addError(`URL protocol must be one of: ${this.allowedProtocols.join(', ')}`);
            }
        }
        catch {
            this.addError('Invalid URL format');
        }
    }
}
exports.UrlValidator = UrlValidator;
class ArrayValidator extends BaseValidator {
    setMinLength(length) {
        this.minLength = length;
        return this;
    }
    setMaxLength(length) {
        this.maxLength = length;
        return this;
    }
    setItemValidator(validator) {
        this.itemValidator = validator;
        return this;
    }
    performValidation(value) {
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
                const result = this.itemValidator.validate(item);
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
exports.ArrayValidator = ArrayValidator;
class ObjectValidator extends BaseValidator {
    constructor() {
        super(...arguments);
        this.fieldValidators = new Map();
        this.requiredFields = new Set();
    }
    addFieldValidator(field, validator) {
        this.fieldValidators.set(field, validator);
        return this;
    }
    setRequiredFields(fields) {
        this.requiredFields = new Set(fields);
        return this;
    }
    performValidation(value) {
        if (!value || typeof value !== 'object') {
            this.addError('Value must be an object');
            return;
        }
        for (const field of this.requiredFields) {
            if (!(field in value) || value[field] === undefined || value[field] === null) {
                this.addError(`Field '${String(field)}' is required`);
            }
        }
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
exports.ObjectValidator = ObjectValidator;
class BusinessRuleValidator {
    constructor() {
        this.rules = [];
    }
    addRule(rule) {
        this.rules.push(rule);
        return this;
    }
    validate(value) {
        const errors = [];
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
exports.BusinessRuleValidator = BusinessRuleValidator;
class ValidationUtils {
    static string() {
        return new StringValidator();
    }
    static number() {
        return new NumberValidator();
    }
    static email() {
        return new EmailValidator();
    }
    static url() {
        return new UrlValidator();
    }
    static array() {
        return new ArrayValidator();
    }
    static object() {
        return new ObjectValidator();
    }
    static businessRule() {
        return new BusinessRuleValidator();
    }
    static composite() {
        return new CompositeValidator();
    }
    static validateAndThrow(validator, value) {
        const result = validator.validate(value);
        if (!result.valid) {
            throw new ValidationError(result.errors.join(', '));
        }
    }
    static required(value, fieldName) {
        if (value === null || value === undefined ||
            (typeof value === 'string' && value.trim().length === 0)) {
            throw new ValidationError(`${fieldName} is required`, fieldName);
        }
    }
    static range(value, min, max, fieldName) {
        if (value < min || value > max) {
            throw new ValidationError(`${fieldName} must be between ${min} and ${max}`, fieldName);
        }
    }
    static enum(value, enumObject, fieldName) {
        const validValues = Object.values(enumObject);
        if (!validValues.includes(value)) {
            throw new ValidationError(`${fieldName} must be one of: ${validValues.join(', ')}`, fieldName);
        }
    }
}
exports.ValidationUtils = ValidationUtils;
//# sourceMappingURL=validation.js.map