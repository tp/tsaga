import { Store } from 'redux';
import { CancellationToken } from './CancellationToken';
import { SagaCancelledError } from './SagaCancelledError';
import { Action } from './types';
import { ActionCreator, Action as FsaAction } from 'typescript-fsa';
import { ETIME } from 'constants';
import { deepStrictEqual } from 'assert';

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

  // public run<T, P extends any[]>(
  //   f: (...params: P) => T,
  //   ...params: P
  // ): T extends Reader<Environment<StateT, ActionT>, P, infer U> ? U : T {
  public run<T, P extends any[]>(
    f: (...params: P) => T,
    ...params: P
  ): T extends Reader<Environment<StateT, ActionT>, P, infer U> ? U : T;
  public run<T, P extends any[]>(r: Reader<any, any, T>, ...params: P): T;
  public run<T, P extends any[]>(
    f: any /* or Reader */,
    ...params: P
  ): T extends Reader<Environment<StateT, ActionT>, P, infer U> ? U : T {
    if (this.cancellationToken && this.cancellationToken.canceled) {
      throw new SagaCancelledError(`Saga has been cancelled`);
    }

    if (f instanceof Reader) {
      return f.run(this);
    }

    const result = f(...params);
    if (result instanceof Reader) {
      return result.run(this);
    } else {
      return result as any; // TODO: TS knows that `result` is `T`, but doesn't accept it for the return signature. Why?;
    }
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

export function waitFor<Payload>(actionCreator: ActionCreator<Payload>): Reader<any, any, Action<Payload>> {
  // TODO: Creating a unique function here will make it impossible to mock
  return new Reader((env) => {
    return env.__INTERNAL__waitForMessage(actionCreator);
  });
}

export class Reader<Env, P extends any[], T> {
  readonly args: P;

  constructor(private readonly f: (env: Env, ...args: P) => T, ...args: P) {
    this.args = args;
  }

  public run = (env: Env): T => {
    return this.f(env, ...this.args);
  };

  public sameFunctionAndParams = (otherReader: Reader<any, any, any>) => {
    try {
      return this.f === otherReader.f && deepStrictEqual(this.args, otherReader.args);
    } catch (e) {
      return false;
    }
  };
}

// TODO: Do we need a `ReaderBuilder` type so we now when to invoke it to compare in tests?
export function withEnv<T, P extends any[], Env extends Environment<any, any> = never>(
  f: (env: Env, ...args: P) => T,
): { (...args: P): Reader<Env, P, T> } {
  return (...args: P) => {
    return new Reader(f, ...args);
  };
}
