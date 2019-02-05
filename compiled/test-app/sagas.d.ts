import { Action } from '../lib/types';
import { AppState } from './types';
import { Environment } from '../lib/environment';
export declare const forEvery: <Payload>(actionCreator: import("typescript-fsa").ActionCreator<Payload>, saga: (ctx: Environment<AppState, Action<any>>, action: import("typescript-fsa").Action<Payload>) => Promise<void>) => import("../lib").Saga<AppState, Action<any>, Payload>;
export declare const forLatest: <Payload>(actionCreator: import("typescript-fsa").ActionCreator<Payload>, saga: (ctx: Environment<AppState, Action<any>>, action: import("typescript-fsa").Action<Payload>) => Promise<void>) => import("../lib").Saga<AppState, Action<any>, Payload>;
export declare type AppEnv = Environment<AppState, Action>;
