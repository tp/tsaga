import { Action } from '../lib/types';
import { AppState } from './types';
import { EnvironmentType } from '../lib/environment';
export declare const forEvery: <Payload>(actionCreator: import("typescript-fsa").ActionCreator<Payload>, saga: (ctx: {
    dispatch: (action: Action<any>) => void;
    select: <T, P extends any[]>(selector: (state: AppState, ...p1: P) => T, ...args: P) => T;
    run: <T, P extends any[]>(f: (...params: P) => T, ...params: P) => T;
    take: <Payload>(actionCreator: import("typescript-fsa").ActionCreator<Payload>) => Promise<Payload>;
    spawn: <P extends any[], T>(f: (env: import("../lib").Environment<AppState, Action<any>>, ...args: P) => T, ...args: P) => T;
    fork: <P extends any[], T>(f: (env: import("../lib").Environment<AppState, Action<any>>, ...args: P) => T, ...args: P) => import("../lib").Task<T>;
}, action: Payload) => Promise<void>) => import("../lib").Saga<AppState, Action<any>, Payload>;
export declare const forLatest: <Payload>(actionCreator: import("typescript-fsa").ActionCreator<Payload>, saga: (ctx: {
    dispatch: (action: Action<any>) => void;
    select: <T, P extends any[]>(selector: (state: AppState, ...p1: P) => T, ...args: P) => T;
    run: <T, P extends any[]>(f: (...params: P) => T, ...params: P) => T;
    take: <Payload>(actionCreator: import("typescript-fsa").ActionCreator<Payload>) => Promise<Payload>;
    spawn: <P extends any[], T>(f: (env: import("../lib").Environment<AppState, Action<any>>, ...args: P) => T, ...args: P) => T;
    fork: <P extends any[], T>(f: (env: import("../lib").Environment<AppState, Action<any>>, ...args: P) => T, ...args: P) => import("../lib").Task<T>;
}, action: Payload) => Promise<void>) => import("../lib").Saga<AppState, Action<any>, Payload>;
export declare type AppEnv = EnvironmentType<AppState, Action>;
