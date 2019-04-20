import { DeepPartial, Middleware } from 'redux';
import { Action, ActionCreator } from 'typescript-fsa';

export interface Task<T> {
  result: T;
  cancel: () => void;
}

export type WaitForAction = <Payload>(actionCreator: ActionCreator<Payload>) => Promise<Action<Payload>>;

export type SagaFunc<State, Args extends any[], T> = (env: SagaEnvironment<State>, ...args: Args) => T;

export interface SagaEnvironment<State> {
  /**
   * Dispatch an action to the store from a saga.
   *
   * @param action - The action object.
   */
  dispatch<Payload>(action: Action<Payload>): void;

  /**
   * Run a selector with the first argument being the current state.
   *
   * @param selector - The selector to call.
   * @param args - Additional arguments which will be passed to the selector after the state.
   */
  select<Args extends any[], Return>(selector: (state: State, ...args: Args) => Return, ...args: Args): Return;

  /**
   * Call a function. This is only a wrapper for cancellation and mocking in tests.
   *
   * @param func - The function to execute.
   * @param params - The arguments for the function.
   */
  call<Args extends any[], Return>(func: (...params: Args) => Return, ...params: Args): Return;

  /**
   * Runs the given saga as an attached child.
   * Cancelling the parent will also cancel the child at the next opportunity.
   */
  run<Args extends any[], Return>(func: SagaFunc<State, Args, Return>, ...args: Args): Return;

  /**
   * Wait for an action to be dispatched.
   *
   * @param actionCreator - The action creator of the action to be dispatched.
   * @param timeout - The timeout after which to fire the TimeoutError,
   * if no timeout specified, it will wait until the next action is dispatched.
   * @throws TimeoutError - Throws a TimeoutError when the timeout resolve before the action was fired.
   */
  take<Payload>(actionCreator: ActionCreator<Payload>, timeout?: number): Promise<Payload>;

  /**
   * Spawns the saga in a new context, returning a detached task
   *
   * Cancelling the returned `Task` will not cancel the parent.
   */
  spawn<Args extends any[], Return>(func: SagaFunc<State, Args, Return>, ...args: Args): Task<Return>;
}

export interface Saga<State, Payload> {
  actionCreator: ActionCreator<Payload>;
  handler: (ctx: SagaEnvironment<State>, payload: Payload) => Promise<void>;
  type: 'every' | 'latest';
}

export type AnySaga = Saga<any, any>;

export type ErrorHandler = <Payload>(error: unknown, action: Action<Payload>) => void;

export interface MiddlewareOptions<State> {
  monitor?: SagaMonitor<State>,
}

export interface SagaMiddleware {
  middleware: Middleware;
  sagaCompletion: () => Promise<void>;
  setErrorHandler: (handler: ErrorHandler) => void;
}

export interface AwaitingAction {
  actionCreator: ActionCreator<any>;
  resolve: (action: Action<any>) => void;
}

type SagaFinishedOptions =
  | {
      type: 'completed';
    }
  | {
      // TODO: Maybe also add the action which was dispatched to cancel the saga?
      type: 'cancelled';
    }
  | {
      type: 'failed';
      error: unknown;
    };

interface SelectEffectOptions<State, Args extends any[], Return> {
  type: 'select';
  selector: (state: State, ...args: Args) => Return;
  args: Args;
  value: Return;
  state: State;
}

interface DispatchEffectOptions<State> {
  type: 'dispatch';
  action: Action<any>;
  beforeState: State;
  afterState: State;
}

interface TakeEffectOptions {
  type: 'take';
  actionCreator: ActionCreator<any>;
  timeout?: number;
  // TODO: Add support for adding taken action
  // TODO: Add support for listening for timeout
}

interface RunEffectOptions<State, Args extends any[], Return> {
  type: 'run';
  func: (env: SagaEnvironment<State>, ...args: Args) => Return;
  args: Args;
  value: Return;
}

interface CallEffectOptions<Args extends any[], Return> {
  type: 'call';
  func: (...args: Args) => Return;
  args: Args;
  value: Return;
}

interface SpawnEffectOptions<State, Args extends any[], Return> {
  type: 'spawn';
  func: (env: SagaEnvironment<State>, ...args: Args) => Return;
  args: Args;
  value: Task<Return>;
  // TODO: Add support for listening for cancellation
}

type OnEffectOptions<State> =
  | DispatchEffectOptions<State>
  | SelectEffectOptions<State, any[], any>
  | TakeEffectOptions
  | RunEffectOptions<State, any[], any>
  | CallEffectOptions<any[], any>
  | SpawnEffectOptions<State, any[], any>;

export interface SagaMonitor<State> {
  onSagaStarted(options: { action: Action<any>; id: number }): void;

  onSagaFinished(
    options: {
      id: number;
      action: Action<any>;
    } & SagaFinishedOptions,
  ): void;

  onEffect(options: {sagaId: number} & OnEffectOptions<State>): void;
}
