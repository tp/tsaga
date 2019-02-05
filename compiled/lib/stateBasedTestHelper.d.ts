import { Saga } from '.';
import { Environment } from './environment';
import { Action } from './types';
export declare function runs<P extends any[], T>(f: (...args: P) => T): ValueMockBuilder<T extends Promise<infer PT> ? PT : T>;
export declare function spawns<P extends any[], T>(f: (env: Environment<any, any>, ...args: P) => T): ValueMockBuilder<T extends Promise<infer PT> ? PT : T>;
export declare function selects<T extends (...args: any[]) => any>(f: T): ValueMockBuilder<ReturnType<T>>;
export declare function forks<T extends (...args: any[]) => any>(f: T): ValueMockBuilder<ReturnType<T>>;
declare type ValueMockBuilder<T> = {
    receiving: (value: T) => ValueMock<T>;
};
declare type ValueMock<T> = {
    type: 'select' | 'call' | 'spawn' | 'fork';
    func: Function;
    value: T;
};
export declare function testSagaWithState<StateT, Payload>(saga: Saga<StateT, any, Payload>, initialAction: Action<Payload>, mocks: ValueMock<any>[], initialState: StateT | undefined, reducer: (state: StateT | undefined, action: Action) => StateT, finalState: StateT): Promise<void>;
export {};
