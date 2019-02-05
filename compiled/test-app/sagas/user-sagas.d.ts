/**
 * consumer
 *
 *
 */
export declare const watchForUserSelectToLoad: import("../../lib").Saga<import("../types").AppState, import("../../lib").Action<any>, {
    id: number;
}>;
export declare const increaseCounter: ({ dispatch, select, run }: {
    dispatch: (action: import("../../lib").Action<any>) => void;
    select: <T, P extends any[]>(selector: (state: import("../types").AppState, ...p1: P) => T, ...args: P) => T;
    run: <T, P extends any[]>(f: (...params: P) => T, ...params: P) => T;
    take: <Payload>(actionCreator: import("typescript-fsa").ActionCreator<Payload>) => Promise<Payload>;
    spawn: <P extends any[], T>(f: (env: import("../../lib").Environment<import("../types").AppState, import("../../lib").Action<any>>, ...args: P) => T, ...args: P) => T;
    fork: <P extends any[], T>(f: (env: import("../../lib").Environment<import("../types").AppState, import("../../lib").Action<any>>, ...args: P) => T, ...args: P) => import("../../lib").Task<T>;
}) => void;
export declare const watchForUserSelectorToCountIfNotChangedWithing3s: import("../../lib").Saga<import("../types").AppState, import("../../lib").Action<any>, {
    id: number;
}>;
export declare const watchForUserSelectorToCountImmediately: import("../../lib").Saga<import("../types").AppState, import("../../lib").Action<any>, {
    id: number;
}>;
