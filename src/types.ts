import { Action, Middleware } from 'redux';
import { ActionCreator } from 'typescript-fsa';

interface Effect<Env, Args extends any[], Return> {
  run(env: Env, ...args: Args): Return,
}

interface SagaEnvironment<State> {
  dispatch(action: Action<any>): void;

  call<Args extends any[], Return>(
    f: (...args: Args) => Return,
    ...args: Args
  ): Promise<Return>;

  call<Args extends any[], Return>(
    effect: Effect<this, Args, Return>,
    ...args: Args
  ): Promise<Return>;

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
  middleware: Middleware,
  forEvery<Payload>(
    actionCreator: ActionCreator<Payload>,
    handler: SagaHandler<State, Payload>,
  ): Saga<State, Payload>,
  forLatest<Payload>(
    actionCreator: ActionCreator<Payload>,
    handler: SagaHandler<State, Payload>,
  ): Saga<State, Payload>,
  sagaCompletion: () => Promise<void>,
}

type AnySaga = Saga<any, any>;

export {
  SagaMiddleware,
  SagaHandler,
  Saga,
  AnySaga,
  Effect,
  SagaEnvironment,
}