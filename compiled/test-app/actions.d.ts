import { User } from './types';
export declare const setCount: {
    (payload: {
        count: number;
    }, meta?: {
        [key: string]: any;
    } | null | undefined): import("typescript-fsa").Action<{
        count: number;
    }>;
    type: string;
    match: (action: import("typescript-fsa").AnyAction) => action is import("typescript-fsa").Action<{
        count: number;
    }>;
};
export declare const userSelected: {
    (payload: {
        id: number;
    }, meta?: {
        [key: string]: any;
    } | null | undefined): import("typescript-fsa").Action<{
        id: number;
    }>;
    type: string;
    match: (action: import("typescript-fsa").AnyAction) => action is import("typescript-fsa").Action<{
        id: number;
    }>;
};
export declare const userLoaded: {
    (payload: {
        user: User;
    }, meta?: {
        [key: string]: any;
    } | null | undefined): import("typescript-fsa").Action<{
        user: User;
    }>;
    type: string;
    match: (action: import("typescript-fsa").AnyAction) => action is import("typescript-fsa").Action<{
        user: User;
    }>;
};
