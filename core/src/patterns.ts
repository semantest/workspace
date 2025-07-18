/*
                        Semantest - Core Patterns
                        Common design patterns and utilities

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

/**
 * Singleton pattern
 */
export abstract class Singleton {
    private static instances: Map<string, Singleton> = new Map();

    protected constructor() {}

    static getInstance<T extends Singleton>(this: new () => T): T {
        const className = this.name;
        
        if (!Singleton.instances.has(className)) {
            Singleton.instances.set(className, new this());
        }

        return Singleton.instances.get(className) as T;
    }
}

/**
 * Factory pattern
 */
export abstract class Factory<T> {
    protected abstract createInstance(...args: any[]): T;

    create(...args: any[]): T {
        return this.createInstance(...args);
    }
}

/**
 * Builder pattern
 */
export abstract class Builder<T> {
    protected abstract build(): T;

    abstract reset(): this;
}

/**
 * Command pattern
 */
export interface Command {
    execute(): Promise<void>;
    undo?(): Promise<void>;
    canUndo?(): boolean;
}

/**
 * Command invoker
 */
export class CommandInvoker {
    private history: Command[] = [];
    private currentPosition = -1;

    async execute(command: Command): Promise<void> {
        await command.execute();
        
        // Remove any commands after current position
        this.history = this.history.slice(0, this.currentPosition + 1);
        
        // Add new command
        this.history.push(command);
        this.currentPosition++;
    }

    async undo(): Promise<void> {
        if (this.canUndo()) {
            const command = this.history[this.currentPosition];
            
            if (command.undo) {
                await command.undo();
            }
            
            this.currentPosition--;
        }
    }

    async redo(): Promise<void> {
        if (this.canRedo()) {
            this.currentPosition++;
            const command = this.history[this.currentPosition];
            await command.execute();
        }
    }

    canUndo(): boolean {
        return this.currentPosition >= 0 && 
               this.history[this.currentPosition]?.canUndo?.() !== false;
    }

    canRedo(): boolean {
        return this.currentPosition < this.history.length - 1;
    }

    clear(): void {
        this.history = [];
        this.currentPosition = -1;
    }
}

/**
 * Observer pattern
 */
export interface Observer<T> {
    update(data: T): void;
}

export class Observable<T> {
    private observers: Observer<T>[] = [];

    subscribe(observer: Observer<T>): void {
        this.observers.push(observer);
    }

    unsubscribe(observer: Observer<T>): void {
        const index = this.observers.indexOf(observer);
        if (index >= 0) {
            this.observers.splice(index, 1);
        }
    }

    notify(data: T): void {
        this.observers.forEach(observer => observer.update(data));
    }
}

/**
 * State pattern
 */
export interface State<T> {
    handle(context: T): void;
}

export class StateMachine<T> {
    private currentState: State<T>;
    private context: T;

    constructor(initialState: State<T>, context: T) {
        this.currentState = initialState;
        this.context = context;
    }

    setState(state: State<T>): void {
        this.currentState = state;
    }

    getCurrentState(): State<T> {
        return this.currentState;
    }

    handle(): void {
        this.currentState.handle(this.context);
    }
}

/**
 * Strategy pattern
 */
export interface Strategy<T, R> {
    execute(context: T): R;
}

export class StrategyContext<T, R> {
    private strategy: Strategy<T, R>;

    constructor(strategy: Strategy<T, R>) {
        this.strategy = strategy;
    }

    setStrategy(strategy: Strategy<T, R>): void {
        this.strategy = strategy;
    }

    execute(context: T): R {
        return this.strategy.execute(context);
    }
}

/**
 * Template method pattern
 */
export abstract class TemplateMethod {
    public execute(): void {
        this.step1();
        this.step2();
        this.step3();
    }

    protected abstract step1(): void;
    protected abstract step2(): void;
    protected abstract step3(): void;
}

/**
 * Visitor pattern
 */
export interface Visitor<T> {
    visit(element: T): void;
}

export interface Visitable<T> {
    accept(visitor: Visitor<T>): void;
}

/**
 * Chain of responsibility pattern
 */
export abstract class Handler<T> {
    private nextHandler?: Handler<T>;

    setNext(handler: Handler<T>): Handler<T> {
        this.nextHandler = handler;
        return handler;
    }

    handle(request: T): void {
        if (this.canHandle(request)) {
            this.doHandle(request);
        } else if (this.nextHandler) {
            this.nextHandler.handle(request);
        }
    }

    protected abstract canHandle(request: T): boolean;
    protected abstract doHandle(request: T): void;
}

/**
 * Memento pattern
 */
export interface Memento {
    getState(): any;
}

export interface Originator {
    save(): Memento;
    restore(memento: Memento): void;
}

export class Caretaker {
    private mementos: Memento[] = [];

    save(originator: Originator): void {
        this.mementos.push(originator.save());
    }

    restore(originator: Originator, index: number): void {
        if (index >= 0 && index < this.mementos.length) {
            originator.restore(this.mementos[index]);
        }
    }

    getCount(): number {
        return this.mementos.length;
    }
}

/**
 * Mediator pattern
 */
export abstract class Mediator {
    protected components: Map<string, any> = new Map();

    register(name: string, component: any): void {
        this.components.set(name, component);
    }

    unregister(name: string): void {
        this.components.delete(name);
    }

    abstract notify(sender: string, event: string, data?: any): void;
}

/**
 * Decorator pattern
 */
export interface Component {
    operation(): string;
}

export class ConcreteComponent implements Component {
    operation(): string {
        return 'ConcreteComponent';
    }
}

export abstract class BaseDecorator implements Component {
    protected component: Component;

    constructor(component: Component) {
        this.component = component;
    }

    operation(): string {
        return this.component.operation();
    }
}

/**
 * Adapter pattern
 */
export interface Target {
    request(): string;
}

export class Adaptee {
    specificRequest(): string {
        return 'Special request';
    }
}

export class Adapter implements Target {
    private adaptee: Adaptee;

    constructor(adaptee: Adaptee) {
        this.adaptee = adaptee;
    }

    request(): string {
        return this.adaptee.specificRequest();
    }
}

/**
 * Proxy pattern
 */
export interface Subject {
    request(): string;
}

export class RealSubject implements Subject {
    request(): string {
        return 'RealSubject request';
    }
}

export class Proxy implements Subject {
    private realSubject: RealSubject;

    constructor(realSubject: RealSubject) {
        this.realSubject = realSubject;
    }

    request(): string {
        if (this.checkAccess()) {
            const result = this.realSubject.request();
            this.logAccess();
            return result;
        }
        return 'Access denied';
    }

    private checkAccess(): boolean {
        // Access control logic
        return true;
    }

    private logAccess(): void {
        console.log('Proxy: Logging access');
    }
}

/**
 * Facade pattern
 */
export class Facade {
    private subsystem1: Subsystem1;
    private subsystem2: Subsystem2;

    constructor(subsystem1?: Subsystem1, subsystem2?: Subsystem2) {
        this.subsystem1 = subsystem1 || new Subsystem1();
        this.subsystem2 = subsystem2 || new Subsystem2();
    }

    operation(): string {
        let result = 'Facade initializes subsystems:\n';
        result += this.subsystem1.operation1();
        result += this.subsystem2.operation1();
        result += 'Facade orders subsystems to perform the action:\n';
        result += this.subsystem1.operationN();
        result += this.subsystem2.operationZ();
        return result;
    }
}

class Subsystem1 {
    operation1(): string {
        return 'Subsystem1: Ready!\n';
    }

    operationN(): string {
        return 'Subsystem1: Go!\n';
    }
}

class Subsystem2 {
    operation1(): string {
        return 'Subsystem2: Get ready!\n';
    }

    operationZ(): string {
        return 'Subsystem2: Fire!\n';
    }
}

/**
 * Registry pattern
 */
export class Registry<T> {
    private items: Map<string, T> = new Map();

    register(key: string, item: T): void {
        this.items.set(key, item);
    }

    unregister(key: string): void {
        this.items.delete(key);
    }

    get(key: string): T | undefined {
        return this.items.get(key);
    }

    has(key: string): boolean {
        return this.items.has(key);
    }

    keys(): string[] {
        return Array.from(this.items.keys());
    }

    values(): T[] {
        return Array.from(this.items.values());
    }

    clear(): void {
        this.items.clear();
    }
}

/**
 * Object pool pattern
 */
export class ObjectPool<T> {
    private pool: T[] = [];
    private factory: () => T;
    private resetFunction?: (item: T) => void;

    constructor(factory: () => T, resetFunction?: (item: T) => void) {
        this.factory = factory;
        this.resetFunction = resetFunction;
    }

    acquire(): T {
        if (this.pool.length > 0) {
            return this.pool.pop()!;
        }
        return this.factory();
    }

    release(item: T): void {
        if (this.resetFunction) {
            this.resetFunction(item);
        }
        this.pool.push(item);
    }

    size(): number {
        return this.pool.length;
    }

    clear(): void {
        this.pool = [];
    }
}