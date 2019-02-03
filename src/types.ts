import { Action, Middleware } from 'redux';
import { ActionCreator } from 'typescript-fsa';

interface SagaEnvironment<State> {
  /**
   *
   * @param action
   */
  dispatch(action: Action<any>): void;

  /**
   *
   * @param f
   * @param args
   */
  call<Args extends any[], Return>(
    f: (...args: Args) => Return,
    ...args: Args
  ): Promise<Return>;

  /**
   *
   * @param selector
   * @param args
   */
  select<Args extends any[], Return>(
    selector: (state: State, ...args: Args) => Return,
    ...args: Args
  ): Return;
}


type SagaHandler<State, Payload> = (
  env: SagaEnvironment<State>,
  payload: Payload,
) => Promise<void>;

interface Saga<State, Payload> {
  actionCreator: ActionCreator<Payload>;
  handler: SagaHandler<State, Payload>;
  type: 'every' | 'latest';
}

interface SagaMiddleware<State> {
  /**
   * The middleware to pass to reduxs createStore function.
   */
  middleware: Middleware,

  /**
   * Wait for the current sagas to complete.
   */
  sagaCompletion(): Promise<void>,

  /**
   * Create a new saga watcher for every action that is being dispatched.
   *
   * @param {Function} actionCreator
   * @param {Function} handler
   */
  forEvery<Payload>(
    actionCreator: ActionCreator<Payload>,
    handler: SagaHandler<State, Payload>,
  ): Saga<State, Payload>,

  /**
   * Create a new saga watcher for the latest action which was dispatched.
   * If a saga from an previous action is still running, the saga is cancelled.
   *
   * @param {Function} actionCreator
   * @param {Function} handler
   */
  forLatest<Payload>(
    actionCreator: ActionCreator<Payload>,
    handler: SagaHandler<State, Payload>,
  ): Saga<State, Payload>,
}

type AnySaga = Saga<any, any>;

export {
  SagaMiddleware,
  SagaHandler,
  Saga,
  AnySaga,
  SagaEnvironment,
}