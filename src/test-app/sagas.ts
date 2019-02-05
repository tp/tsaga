import { createTypedForEvery, createTypedForLatest } from '../lib';
import { Action } from '../lib/types';
import { AppState } from './types';
import { EnvironmentType } from '../lib/environment';

// Know the store here already? Or add that later?
export const forEvery = createTypedForEvery<AppState, Action>();
export const forLatest = createTypedForLatest<AppState, Action>();
export type AppEnv = EnvironmentType<AppState, Action>;
