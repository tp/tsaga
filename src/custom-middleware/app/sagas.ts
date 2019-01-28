import { createTypedForEvery, createTypedForLatest } from '../lib';
import { Action } from '../lib/types';
import { AppState } from './types';
import { Environment } from '../lib/environment';
import { watchForUserSelectToLoad, watchForUserSelectorToCount } from './user-sagas';

// Know the store here already? Or add that later?
export const forEvery = createTypedForEvery<AppState, Action>();
export const forLatest = createTypedForLatest<AppState, Action>();
export type OmsEnv = Environment<AppState, Action>;

export const sagas = [watchForUserSelectToLoad, watchForUserSelectorToCount];
