export declare abstract class Singleton {
    private static instances;
    protected constructor();
    static getInstance<T extends Singleton>(this: new () => T): T;
}
export declare abstract class Factory<T> {
    protected abstract createInstance(...args: any[]): T;
    create(...args: any[]): T;
}
export declare abstract class Builder<T> {
    protected abstract build(): T;
    abstract reset(): this;
}
export interface Command {
    execute(): Promise<void>;
    undo?(): Promise<void>;
    canUndo?(): boolean;
}
export declare class CommandInvoker {
    private history;
    private currentPosition;
    execute(command: Command): Promise<void>;
    undo(): Promise<void>;
    redo(): Promise<void>;
    canUndo(): boolean;
    canRedo(): boolean;
    clear(): void;
}
export interface Observer<T> {
    update(data: T): void;
}
export declare class Observable<T> {
    private observers;
    subscribe(observer: Observer<T>): void;
    unsubscribe(observer: Observer<T>): void;
    notify(data: T): void;
}
export interface State<T> {
    handle(context: T): void;
}
export declare class StateMachine<T> {
    private currentState;
    private context;
    constructor(initialState: State<T>, context: T);
    setState(state: State<T>): void;
    getCurrentState(): State<T>;
    handle(): void;
}
export interface Strategy<T, R> {
    execute(context: T): R;
}
export declare class StrategyContext<T, R> {
    private strategy;
    constructor(strategy: Strategy<T, R>);
    setStrategy(strategy: Strategy<T, R>): void;
    execute(context: T): R;
}
export declare abstract class TemplateMethod {
    execute(): void;
    protected abstract step1(): void;
    protected abstract step2(): void;
    protected abstract step3(): void;
}
export interface Visitor<T> {
    visit(element: T): void;
}
export interface Visitable<T> {
    accept(visitor: Visitor<T>): void;
}
export declare abstract class Handler<T> {
    private nextHandler?;
    setNext(handler: Handler<T>): Handler<T>;
    handle(request: T): void;
    protected abstract canHandle(request: T): boolean;
    protected abstract doHandle(request: T): void;
}
export interface Memento {
    getState(): any;
}
export interface Originator {
    save(): Memento;
    restore(memento: Memento): void;
}
export declare class Caretaker {
    private mementos;
    save(originator: Originator): void;
    restore(originator: Originator, index: number): void;
    getCount(): number;
}
export declare abstract class Mediator {
    protected components: Map<string, any>;
    register(name: string, component: any): void;
    unregister(name: string): void;
    abstract notify(sender: string, event: string, data?: any): void;
}
export interface Component {
    operation(): string;
}
export declare class ConcreteComponent implements Component {
    operation(): string;
}
export declare abstract class BaseDecorator implements Component {
    protected component: Component;
    constructor(component: Component);
    operation(): string;
}
export interface Target {
    request(): string;
}
export declare class Adaptee {
    specificRequest(): string;
}
export declare class Adapter implements Target {
    private adaptee;
    constructor(adaptee: Adaptee);
    request(): string;
}
export interface Subject {
    request(): string;
}
export declare class RealSubject implements Subject {
    request(): string;
}
export declare class Proxy implements Subject {
    private realSubject;
    constructor(realSubject: RealSubject);
    request(): string;
    private checkAccess;
    private logAccess;
}
export declare class Facade {
    private subsystem1;
    private subsystem2;
    constructor(subsystem1?: Subsystem1, subsystem2?: Subsystem2);
    operation(): string;
}
declare class Subsystem1 {
    operation1(): string;
    operationN(): string;
}
declare class Subsystem2 {
    operation1(): string;
    operationZ(): string;
}
export declare class Registry<T> {
    private items;
    register(key: string, item: T): void;
    unregister(key: string): void;
    get(key: string): T | undefined;
    has(key: string): boolean;
    keys(): string[];
    values(): T[];
    clear(): void;
}
export declare class ObjectPool<T> {
    private pool;
    private factory;
    private resetFunction?;
    constructor(factory: () => T, resetFunction?: (item: T) => void);
    acquire(): T;
    release(item: T): void;
    size(): number;
    clear(): void;
}
export {};
