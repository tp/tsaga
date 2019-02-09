import { Action, ActionCreator } from 'typescript-fsa';

export interface Task<ReturnType> {
  result: ReturnType;
  cancel: () => void;
}

export type WaitForAction = <Payload>(actionCreator: ActionCreator<Payload>) => Promise<Action<Payload>>;

export abstract class BoundEffect<State, Args extends any[], ReturnType> {
  public readonly args: Args;

  constructor(...args: Args) {
    this.args = args;
  }

  public abstract run(env: SagaEnvironment<State>, ...args: Args): ReturnType;
}

export interface BoundFunc<State, Args extends any[], ReturnType> {
  (env: SagaEnvironment<State>, ...args: Args): ReturnType;
}

export type Effect<State, Args extends any[], ReturnType> =
  | BoundEffect<State, Args, ReturnType>
  | BoundFunc<State, Args, ReturnType>;

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
  select<Args extends any[], ReturnType>(
    selector: (state: State, ...args: Args) => ReturnType,
    ...args: Args
  ): ReturnType;

  /**
   * Call a function. This is only a wrapper for cancellation and mocking in tests.
   *
   * @param f - The function to execute.
   * @param args - The arguments for the function.
   */
  call<Args extends any[], ReturnType>(
    f: (...args: Args) => ReturnType,
    ...args: Args
  ): ReturnType;

  /**
   * Runs the given saga as an attached child.
   * Cancelling the parent will also cancel the child at the next opportunity.
   */
  run<Args extends any[], ReturnType>(
    effect: BoundFunc<State, Args, ReturnType>,
    ...args: Args
  ): ReturnType;
  run<Args extends any[], ReturnType>(
    effect: BoundEffect<State, Args, ReturnType>,
  ): ReturnType,

  /**
   * Wait for an action to be dispatched.
   *
   * @param actionCreator - The action creator of the action to be dispatched.
   */
  take<Payload>(actionCreator: ActionCreator<Payload>): Promise<Payload>;

  /**
   * Spawns the saga in a new context, returning a detached task
   *
   * Cancelling the returned `Task` will not cancel the parent.
   */
  spawn<Args extends any[], ReturnType>(
    effect: BoundFunc<State, Args, ReturnType>,
    ...args: Args
  ): ReturnType;
  spawn<Args extends any[], ReturnType>(
    effect: BoundEffect<State, Args, ReturnType>,
  ): ReturnType,
}

export interface Saga<State, Payload> {
  actionCreator: ActionCreator<Payload>;
  innerFunction: (ctx: SagaEnvironment<State>, payload: Payload) => Promise<void>;
  type: 'every' | 'latest';
}

export type AnySaga = Saga<any, any>;

// TODO: Add compile check, to prove that overload for `BoundEffect` works with additional parameters
// const sagaEnv: SagaEnvironment<any> = null as any;
// const boundEffect: BoundEffect<SagaEnvironment<any>, [number, number], boolean> = null as any;
// sagaEnv.run(boundEffect);
