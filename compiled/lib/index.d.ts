import { Middleware } from 'redux';
import { ActionCreator } from 'typescript-fsa';
import { Environment, EnvironmentType } from './environment';
import { Action } from './types';
export { Task } from './environment';
export { Action } from './types';
export { Environment };
export { testSaga, runs, selects, forks, spawns } from './testHelpers';
export { testSagaWithState } from './stateBasedTestHelper';
export interface Saga<StateT, ActionT extends Action, Payload> {
    actionCreator: ActionCreator<Payload>;
    innerFunction: (ctx: EnvironmentType<StateT, ActionT>, action: Payload) => Promise<void>;
    type: 'every' | 'latest';
}
export declare function createTypedForEvery<StateT, ActionT extends Action>(): <Payload>(actionCreator: ActionCreator<Payload>, saga: (ctx: EnvironmentType<StateT, ActionT>, action: Payload) => Promise<void>) => Saga<StateT, ActionT, Payload>;
export declare function createTypedForLatest<StateT, ActionT extends Action>(): <Payload>(actionCreator: ActionCreator<Payload>, saga: (ctx: EnvironmentType<StateT, ActionT>, action: Payload) => Promise<void>) => Saga<StateT, ActionT, Payload>;
export declare type AnySaga = Saga<any, any, any>;
export declare function tsagaReduxMiddleware(sagas: AnySaga[]): {
    middleware: Middleware<{}, any, import("redux").Dispatch<import("redux").AnyAction>>;
    sagaCompletion: () => Promise<void>;
};
