import { AppState } from './types';
export declare const getCount: (state: AppState) => number;
export declare const getSelectedUserId: (state: AppState) => number | null;
export declare const getUserById: (state: AppState, id: number) => import("./types").User | undefined;
