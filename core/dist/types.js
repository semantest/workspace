"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorType = exports.Adapter = exports.Version = exports.Name = exports.Timestamp = exports.Url = exports.Email = exports.Id = exports.ValueObject = exports.IntegrationEvent = exports.DomainEvent = exports.TimestampedEntity = exports.AggregateRoot = exports.Entity = void 0;
var entities_1 = require("./entities");
Object.defineProperty(exports, "Entity", { enumerable: true, get: function () { return entities_1.Entity; } });
Object.defineProperty(exports, "AggregateRoot", { enumerable: true, get: function () { return entities_1.AggregateRoot; } });
Object.defineProperty(exports, "TimestampedEntity", { enumerable: true, get: function () { return entities_1.TimestampedEntity; } });
var events_1 = require("./events");
Object.defineProperty(exports, "DomainEvent", { enumerable: true, get: function () { return events_1.DomainEvent; } });
Object.defineProperty(exports, "IntegrationEvent", { enumerable: true, get: function () { return events_1.IntegrationEvent; } });
var value_objects_1 = require("./value-objects");
Object.defineProperty(exports, "ValueObject", { enumerable: true, get: function () { return value_objects_1.ValueObject; } });
Object.defineProperty(exports, "Id", { enumerable: true, get: function () { return value_objects_1.Id; } });
Object.defineProperty(exports, "Email", { enumerable: true, get: function () { return value_objects_1.Email; } });
Object.defineProperty(exports, "Url", { enumerable: true, get: function () { return value_objects_1.Url; } });
Object.defineProperty(exports, "Timestamp", { enumerable: true, get: function () { return value_objects_1.Timestamp; } });
Object.defineProperty(exports, "Name", { enumerable: true, get: function () { return value_objects_1.Name; } });
Object.defineProperty(exports, "Version", { enumerable: true, get: function () { return value_objects_1.Version; } });
var adapters_1 = require("./adapters");
Object.defineProperty(exports, "Adapter", { enumerable: true, get: function () { return adapters_1.Adapter; } });
var ErrorType;
(function (ErrorType) {
    ErrorType["VALIDATION"] = "VALIDATION";
    ErrorType["BUSINESS_RULE"] = "BUSINESS_RULE";
    ErrorType["NOT_FOUND"] = "NOT_FOUND";
    ErrorType["CONFLICT"] = "CONFLICT";
    ErrorType["UNAUTHORIZED"] = "UNAUTHORIZED";
    ErrorType["FORBIDDEN"] = "FORBIDDEN";
    ErrorType["INTERNAL"] = "INTERNAL";
    ErrorType["EXTERNAL"] = "EXTERNAL";
})(ErrorType || (exports.ErrorType = ErrorType = {}));
//# sourceMappingURL=types.js.map