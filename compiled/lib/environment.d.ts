import { Store } from 'redux';
import { CancellationToken } from './CancellationToken';
import { Action } from './types';
import { ActionCreator, Action as FsaAction } from 'typescript-fsa';
export declare type ReadStore<S, A extends Action> = Pick<Store<S, A>, 'dispatch' | 'getState'>;
export declare class Environment<StateT, ActionT extends Action> {
    private readonly store;
    private readonly waitForMessage;
    private readonly cancellationToken?;
    constructor(store: ReadStore<StateT, ActionT>, waitForMessage: <Payload>(action: ActionCreator<Payload>) => Promise<FsaAction<Payload>>, cancellationToken?: CancellationToken | undefined);
    dispatch: (action: ActionT) => void;
    private createDetachedChildEnvironment;
    select: <T, P extends any[]>(selector: (state: StateT, ...p1: P) => T, ...args: P) => T;
    run: <T, P extends any[]>(f: (...params: P) => T, ...params: P) => T;
    take: <Payload>(actionCreator: ActionCreator<Payload>) => Promise<Payload>;
    spawn: <P extends any[], T>(f: (env: Environment<StateT, ActionT>, ...args: P) => T, ...args: P) => T;
    fork: <P extends any[], T>(f: (env: Environment<StateT, ActionT>, ...args: P) => T, ...args: P) => Task<T>;
}
export interface Task<T> {
    result: T;
    cancel: () => void;
}
declare type InterfaceOf<T> = {
    [P in keyof T]: T[P];
};
export declare type EnvironmentType<StateT, ActionT extends Action> = InterfaceOf<Environment<StateT, ActionT>>;
export {};
