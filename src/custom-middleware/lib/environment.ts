import { Store } from 'redux';
import { CancellationToken } from './CancellationToken';
import { SagaCancelledError } from './SagaCancelledError';
import { Action } from './types';
import { ActionCreator, Action as FsaAction } from 'typescript-fsa';
import { ETIME } from 'constants';

export class Environment<StateT, ActionT extends Action> {
  constructor(
    private readonly store: Store<StateT, ActionT>,
    private readonly waitForMessage: <Payload>(action: ActionCreator<Payload>) => Promise<FsaAction<Payload>>,
    private readonly cancellationToken?: CancellationToken,
  ) {
    // Manually binding this is still needed, as TS doesn't accept overloads otherwise
    (this as any).run = this.run.bind(this);
  }

  public dispatch = (action: ActionT): void => {
    if (this.cancellationToken && this.cancellationToken.canceled) {
      throw new SagaCancelledError(`Saga has been cancelled`);
    }

    this.store.dispatch(action);
  };

  public createDetachedChildEnvironment(): {
    childEnv: Environment<StateT, ActionT>;
    cancellationToken: CancellationToken;
  } {
    if (this.cancellationToken && this.cancellationToken.canceled) {
      throw new SagaCancelledError(`Saga has been cancelled`);
    }

    // this is used for forks, to it shouldn't be cancelled when the parent is cancelled
    // for `spawn` like behavior, the user would just create a Promise with `run`/`run(withEnv(...))` that is still attached to the main cancellation context
    // TODO: Must `run` wrap the `Promise` (if one is returned), in order to cancel the resolve in case of cancellation?
    const cancellationToken = new CancellationToken();
    const childEnv = new Environment(this.store, this.waitForMessage, cancellationToken);

    return { childEnv, cancellationToken };
  }

  public select = <T, P extends any[]>(selector: (state: StateT, ...p1: P) => T, ...args: P): T => {
    if (this.cancellationToken && this.cancellationToken.canceled) {
      throw new SagaCancelledError(`Saga has been cancelled`);
    }

    return selector(this.store.getState(), ...args);
  };

  // public run<T, P extends any[]>(f: (...params: P) => Effect<T, any>, ...params: P): T;

  public run<T, P extends any[]>(f: (...params: P) => T, ...params: P): T extends Effect<infer EffT, any> ? EffT : T;
  public run<T>(effect: Effect<T, this>): T;
  public run<T>(first: Function | Effect<T, this>, ...rest: any[]): T {
    if (typeof first === 'function') {
      const res = first(...rest);
      if ((res as any).run) {
        return (res as any).run(this);
      } else {
        return res;
      }
    }

    return first.run(this);
  }

  public __INTERNAL__waitForMessage = <Payload>(actionCreator: ActionCreator<Payload>): Promise<FsaAction<Payload>> => {
    return this.waitForMessage(actionCreator);
  };
}

export const EffectCreatorSymbol: unique symbol = Symbol();

export type EffectCreator<P extends any[], T, Env> = {
  (...args: P): Effect<T, Env>;
  wrappedFunction: Function;
  ___tagEffectCreator: typeof EffectCreatorSymbol;
};

export interface Effect<T, Env> {
  run: (env: Env) => T;
}

export interface Task<T> {
  result: T;
  cancel: () => void;
}

export function waitFor<Payload>(actionCreator: ActionCreator<Payload>): Effect<Promise<FsaAction<Payload>>, any> {
  return {
    run: (env) => {
      return env.__INTERNAL__waitForMessage(actionCreator);
    },
  };
}
