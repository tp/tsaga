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
  /**
   * Dispatch an action to the store from a saga.
   *
   * @param action - The action object.
   */
  dispatch(action: Action<any>): void;

  /**
   * Run a selector with the first argument being the current state.
   *
   * @param selector - The selector to call.
   * @param args - Additional arguments which will be passed to the selector after the state.
   */
  select<T, Args extends any[]>(
    selector: (state: State, ...args: Args) => T,
    ...args: Args
  ): T;

  /**
   * Run a function. This is only a wrapper for cancellation and mocking in tests.
   *
   * @param f - The function to execute.
   * @param params - The arguments for the function.
   */
  run<T, Args extends any[]>(f: (...params: Args) => T, ...params: Args): T;

  /**
   * Wait for an action to be dispatched.
   *
   * @param actionCreator - The action creator of the action to be dispatched.
   */
  take<Payload>(actionCreator: ActionCreator<Payload>): Promise<Payload>;

  /**
   * Run a function with the current saga environment as the first argument.
   *
   * @param f - The function to execute.
   * @param args - Additional arguments for the function.
   */
  spawn<Args extends any[], T>(f: (env: SagaEnvironment<State>, ...args: Args) => T, ...args: Args): T;

  /**
   * Fork the environment and run a function in the child env.
   * This function is cancelable without cancelling of the parent saga.
   *
   * @param f - The function which will be called with the child env.
   * @param args - Additional arguments for the function.
   */
  fork<Args extends any[], T>(f: (env: SagaEnvironment<State>, ...args: Args) => T, ...args: Args): Task<T>;
}

export interface Saga<State, Payload> {
  actionCreator: ActionCreator<Payload>;
  saga: (ctx: SagaEnvironment<State>, action: Action<Payload>) => Promise<void>;
  type: 'every' | 'latest';
}

export type AnySaga = Saga<any, any>;
