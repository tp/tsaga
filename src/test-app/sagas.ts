import { createTypedForEvery, createTypedForLatest, SagaEnvironment } from '../lib';
import { AppState } from './types';

// Know the store here already? Or add that later?
export const forEvery = createTypedForEvery<AppState>();
export const forLatest = createTypedForLatest<AppState>();
export type AppEnv = SagaEnvironment<AppState>;
