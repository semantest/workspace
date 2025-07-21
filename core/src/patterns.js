"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectPool = exports.Registry = exports.Facade = exports.Proxy = exports.RealSubject = exports.Adapter = exports.Adaptee = exports.BaseDecorator = exports.ConcreteComponent = exports.Mediator = exports.Caretaker = exports.Handler = exports.TemplateMethod = exports.StrategyContext = exports.StateMachine = exports.Observable = exports.CommandInvoker = exports.Builder = exports.Factory = exports.Singleton = void 0;
class Singleton {
    constructor() { }
    static getInstance() {
        const className = this.name;
        if (!Singleton.instances.has(className)) {
            Singleton.instances.set(className, new this());
        }
        return Singleton.instances.get(className);
    }
}
exports.Singleton = Singleton;
Singleton.instances = new Map();
class Factory {
    create(...args) {
        return this.createInstance(...args);
    }
}
exports.Factory = Factory;
class Builder {
}
exports.Builder = Builder;
class CommandInvoker {
    constructor() {
        this.history = [];
        this.currentPosition = -1;
    }
    async execute(command) {
        await command.execute();
        this.history = this.history.slice(0, this.currentPosition + 1);
        this.history.push(command);
        this.currentPosition++;
    }
    async undo() {
        if (this.canUndo()) {
            const command = this.history[this.currentPosition];
            if (command.undo) {
                await command.undo();
            }
            this.currentPosition--;
        }
    }
    async redo() {
        if (this.canRedo()) {
            this.currentPosition++;
            const command = this.history[this.currentPosition];
            await command.execute();
        }
    }
    canUndo() {
        return this.currentPosition >= 0 &&
            this.history[this.currentPosition]?.canUndo?.() !== false;
    }
    canRedo() {
        return this.currentPosition < this.history.length - 1;
    }
    clear() {
        this.history = [];
        this.currentPosition = -1;
    }
}
exports.CommandInvoker = CommandInvoker;
class Observable {
    constructor() {
        this.observers = [];
    }
    subscribe(observer) {
        this.observers.push(observer);
    }
    unsubscribe(observer) {
        const index = this.observers.indexOf(observer);
        if (index >= 0) {
            this.observers.splice(index, 1);
        }
    }
    notify(data) {
        this.observers.forEach(observer => observer.update(data));
    }
}
exports.Observable = Observable;
class StateMachine {
    constructor(initialState, context) {
        this.currentState = initialState;
        this.context = context;
    }
    setState(state) {
        this.currentState = state;
    }
    getCurrentState() {
        return this.currentState;
    }
    handle() {
        this.currentState.handle(this.context);
    }
}
exports.StateMachine = StateMachine;
class StrategyContext {
    constructor(strategy) {
        this.strategy = strategy;
    }
    setStrategy(strategy) {
        this.strategy = strategy;
    }
    execute(context) {
        return this.strategy.execute(context);
    }
}
exports.StrategyContext = StrategyContext;
class TemplateMethod {
    execute() {
        this.step1();
        this.step2();
        this.step3();
    }
}
exports.TemplateMethod = TemplateMethod;
class Handler {
    setNext(handler) {
        this.nextHandler = handler;
        return handler;
    }
    handle(request) {
        if (this.canHandle(request)) {
            this.doHandle(request);
        }
        else if (this.nextHandler) {
            this.nextHandler.handle(request);
        }
    }
}
exports.Handler = Handler;
class Caretaker {
    constructor() {
        this.mementos = [];
    }
    save(originator) {
        this.mementos.push(originator.save());
    }
    restore(originator, index) {
        if (index >= 0 && index < this.mementos.length) {
            originator.restore(this.mementos[index]);
        }
    }
    getCount() {
        return this.mementos.length;
    }
}
exports.Caretaker = Caretaker;
class Mediator {
    constructor() {
        this.components = new Map();
    }
    register(name, component) {
        this.components.set(name, component);
    }
    unregister(name) {
        this.components.delete(name);
    }
}
exports.Mediator = Mediator;
class ConcreteComponent {
    operation() {
        return 'ConcreteComponent';
    }
}
exports.ConcreteComponent = ConcreteComponent;
class BaseDecorator {
    constructor(component) {
        this.component = component;
    }
    operation() {
        return this.component.operation();
    }
}
exports.BaseDecorator = BaseDecorator;
class Adaptee {
    specificRequest() {
        return 'Special request';
    }
}
exports.Adaptee = Adaptee;
class Adapter {
    constructor(adaptee) {
        this.adaptee = adaptee;
    }
    request() {
        return this.adaptee.specificRequest();
    }
}
exports.Adapter = Adapter;
class RealSubject {
    request() {
        return 'RealSubject request';
    }
}
exports.RealSubject = RealSubject;
class Proxy {
    constructor(realSubject) {
        this.realSubject = realSubject;
    }
    request() {
        if (this.checkAccess()) {
            const result = this.realSubject.request();
            this.logAccess();
            return result;
        }
        return 'Access denied';
    }
    checkAccess() {
        return true;
    }
    logAccess() {
        console.log('Proxy: Logging access');
    }
}
exports.Proxy = Proxy;
class Facade {
    constructor(subsystem1, subsystem2) {
        this.subsystem1 = subsystem1 || new Subsystem1();
        this.subsystem2 = subsystem2 || new Subsystem2();
    }
    operation() {
        let result = 'Facade initializes subsystems:\n';
        result += this.subsystem1.operation1();
        result += this.subsystem2.operation1();
        result += 'Facade orders subsystems to perform the action:\n';
        result += this.subsystem1.operationN();
        result += this.subsystem2.operationZ();
        return result;
    }
}
exports.Facade = Facade;
class Subsystem1 {
    operation1() {
        return 'Subsystem1: Ready!\n';
    }
    operationN() {
        return 'Subsystem1: Go!\n';
    }
}
class Subsystem2 {
    operation1() {
        return 'Subsystem2: Get ready!\n';
    }
    operationZ() {
        return 'Subsystem2: Fire!\n';
    }
}
class Registry {
    constructor() {
        this.items = new Map();
    }
    register(key, item) {
        this.items.set(key, item);
    }
    unregister(key) {
        this.items.delete(key);
    }
    get(key) {
        return this.items.get(key);
    }
    has(key) {
        return this.items.has(key);
    }
    keys() {
        return Array.from(this.items.keys());
    }
    values() {
        return Array.from(this.items.values());
    }
    clear() {
        this.items.clear();
    }
}
exports.Registry = Registry;
class ObjectPool {
    constructor(factory, resetFunction) {
        this.pool = [];
        this.factory = factory;
        this.resetFunction = resetFunction;
    }
    acquire() {
        if (this.pool.length > 0) {
            return this.pool.pop();
        }
        return this.factory();
    }
    release(item) {
        if (this.resetFunction) {
            this.resetFunction(item);
        }
        this.pool.push(item);
    }
    size() {
        return this.pool.length;
    }
    clear() {
        this.pool = [];
    }
}
exports.ObjectPool = ObjectPool;
//# sourceMappingURL=patterns.js.map