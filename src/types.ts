import { Action, Middleware } from 'redux';
import { ActionCreator } from 'typescript-fsa';

interface SagaEnvironment<State, Actions extends Action<any>> {
  dispatch(action: Actions): void;

  call<Return, Args extends any[]>(
    f: (...args: Args) => Return,
    ...args: Args
  ): Promise<Return>;

  select<Return, Args extends any[]>(
    selector: (state: State, ...args: Args) => Return,
    ...args: Args
  ): Return;
}


type SagaHandler<State, Actions extends Action<any>, Payload> = (
  env: SagaEnvironment<State, Actions>,
  payload: Payload,
) => Promise<void>;

interface Saga<State, Actions extends Action<any>, Payload> {
  actionCreator: ActionCreator<Payload>;
  handler: SagaHandler<State, Actions, Payload>;
  type: 'every' | 'latest';
}

interface SagaMiddleware {
  middleware: Middleware,
  forEvery: any,
  forLatest: any,
}

type AnySaga = Saga<any, any, any>

export {
  SagaMiddleware,
  SagaHandler,
  Saga,
  AnySaga,
  SagaEnvironment,
}