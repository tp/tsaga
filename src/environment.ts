import { MiddlewareAPI, Dispatch } from 'redux';
import { Action, AnyAction } from 'typescript-fsa';
import { CancellationToken } from './CancellationToken';
import { SagaCancelledError } from './errors/SagaCancelledError';
import { SagaEnvironment } from './types';

export class Environment<State, Actions extends Action<any>> implements SagaEnvironment<State, Actions> {
  private store: MiddlewareAPI<Dispatch<AnyAction>, State>;

  private cancellationToken: CancellationToken;

  constructor(store: MiddlewareAPI<Dispatch<AnyAction>, State>, cancellationToken: CancellationToken) {
    this.store = store;
    this.cancellationToken = cancellationToken;
  }

  public dispatch(action: Actions) {
    if (this.cancellationToken.isCanceled()) {
      throw new SagaCancelledError(`Saga has been cancelled`);
    }

    this.store.dispatch(action);
  };

  public async call<Return, Args extends any[]>(
    f: (...args: Args) => Return,
    ...args: Args
  ) {
    if (this.cancellationToken.isCanceled()) {
      throw new SagaCancelledError(`Saga has been cancelled`);
    }

    return f(...args);
  };

  public select<Return, Args extends any[]>(
    selector: (state: State, ...args: Args) => Return,
    ...args: Args
  ): Return {
    if (this.cancellationToken.isCanceled()) {
      throw new SagaCancelledError(`Saga has been cancelled`);
    }

    return selector(this.store.getState(), ...args);
  };
}