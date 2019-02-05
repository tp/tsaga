/**
 * consumer
 *
 *
 */
export declare const watchForUserSelectToLoad: import("../../lib").Saga<import("../types").AppState, import("../../lib").Action<any>, {
    id: number;
}>;
export declare const increaseCounter: ({ dispatch, select, run }: import("../../lib").Environment<import("../types").AppState, import("../../lib").Action<any>>) => void;
export declare const watchForUserSelectorToCountIfNotChangedWithing3s: import("../../lib").Saga<import("../types").AppState, import("../../lib").Action<any>, {
    id: number;
}>;
export declare const watchForUserSelectorToCountImmediately: import("../../lib").Saga<import("../types").AppState, import("../../lib").Action<any>, {
    id: number;
}>;
