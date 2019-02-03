import { MiddlewareAPI, Dispatch } from 'redux';
import { Action, AnyAction } from 'typescript-fsa';
import { CancellationToken } from './CancellationToken';
import { SagaCancelledError } from './errors/SagaCancelledError';
import { SagaEnvironment, Effect } from './types';

export class Environment<State> implements SagaEnvironment<State> {
  private store: MiddlewareAPI<Dispatch<AnyAction>, State>;

  private cancellationToken: CancellationToken;

  constructor(store: MiddlewareAPI<Dispatch<AnyAction>, State>, cancellationToken: CancellationToken) {
    this.store = store;
    this.cancellationToken = cancellationToken;
  }

  public dispatch(action: Action<any>) {
    if (this.cancellationToken.isCanceled()) {
      throw new SagaCancelledError(`Saga has been cancelled`);
    }

    this.store.dispatch(action);
  };

  call<Args extends any[], Return>(
    f: (...args: Args) => Return,
    ...args: Args
  ): Promise<Return>;
  call<Return>(effect: Effect<this, Return>): Promise<Return>;

  public async call(f: any, ...args: any) {
    if (this.cancellationToken.isCanceled()) {
      throw new SagaCancelledError(`Saga has been cancelled`);
    }

    if (typeof f === 'function') {
      return f(...args);
    }

    return f.run(this, ...args);
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