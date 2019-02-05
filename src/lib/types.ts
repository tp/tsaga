import {
  Action,
  ActionCreator,
} from 'typescript-fsa';

export interface Task<T> {
  result: T;
  cancel: () => void;
}

export type WaitForAction = <Payload>(actionCreator: ActionCreator<Payload>) => Promise<Action<Payload>>;

export interface SagaEnvironment<State> {
  dispatch(action: Action<any>): void;

  select<T, Args extends any[]>(
    selector: (state: State, ...args: Args) => T,
    ...args: Args
  ): T;

  run<T, Args extends any[]>(f: (...params: Args) => T, ...params: Args): T;

  take<Payload>(actionCreator: ActionCreator<Payload>): Promise<Payload>;

  spawn<Args extends any[], T>(f: (env: SagaEnvironment<State>, ...args: Args) => T, ...args: Args): T;

  fork<Args extends any[], T>(f: (env: SagaEnvironment<State>, ...args: Args) => T, ...args: Args): Task<T>;
}

export interface Saga<State, Payload> {
  actionCreator: ActionCreator<Payload>;
  saga: (ctx: SagaEnvironment<State>, action: Action<Payload>) => Promise<void>;
  type: 'every' | 'latest';
}

export type AnySaga = Saga<any, any>;
