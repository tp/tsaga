import { Store } from 'redux';
import { CancellationToken } from './CancellationToken';
import { SagaCancelledError } from './SagaCancelledError';
import { Action } from './types';
import { ActionCreator, Action as FsaAction } from 'typescript-fsa';

export type ReadStore<S, A extends Action> = Pick<Store<S, A>, 'dispatch' | 'getState'>;

export class Environment<StateT, ActionT extends Action> {
  constructor(
    private readonly store: ReadStore<StateT, ActionT>,
    private readonly waitForMessage: <Payload>(action: ActionCreator<Payload>) => Promise<FsaAction<Payload>>,
    private readonly cancellationToken?: CancellationToken,
  ) {
    this.run = this.run.bind(this) as any;
  }

  public dispatch = (action: ActionT): void => {
    if (this.cancellationToken && this.cancellationToken.canceled) {
      throw new SagaCancelledError(`Saga has been cancelled`);
    }

    this.store.dispatch(action);
  };

  private createDetachedChildEnvironment(): {
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

  public run<T, P extends any[]>(f: (...params: P) => T, ...params: P): T;
  public run<T, P extends any[]>(effect: Effect<StateT, ActionT, P, T>, ...params: P): T;
  public run<T, P extends any[]>(effect: EffectCreator3<EnvironmentType<StateT, ActionT>, P, T>): T;
  public run<T, P extends any[]>(
    funcOrEffect:
      | EffectCreator3<Environment<StateT, ActionT>, P, T>
      | Effect<StateT, ActionT, P, T>
      | ((...params: P) => T),
    ...params: P
  ): T {
    if (this.cancellationToken && this.cancellationToken.canceled) {
      throw new SagaCancelledError(`Saga has been cancelled`);
    }

    if (typeof funcOrEffect === 'function') {
      return funcOrEffect(...params);
    } else if (funcOrEffect instanceof EffectCreator3) {
      return funcOrEffect.run(this, ...funcOrEffect.args);
    } else {
      return funcOrEffect.func(this, ...params);
    }
  }

  public take = async <Payload>(actionCreator: ActionCreator<Payload>): Promise<Payload> => {
    return (await this.waitForMessage(actionCreator)).payload;
  };

  // public spawn = <P extends any[], T>(f: (env: Environment<StateT, ActionT>, ...args: P) => T, ...args: P): T => {
  //   return f(this, ...args);
  // };

  public fork = <P extends any[], T>(f: (env: Environment<StateT, ActionT>, ...args: P) => T, ...args: P): Task<T> => {
    const { childEnv, cancellationToken } = this.createDetachedChildEnvironment();

    const task: Task<T> = {
      cancel: () => cancellationToken.cancel(),
      result: f(childEnv, ...args),
    };

    return task;
  };
}

export interface Task<T> {
  result: T;
  cancel: () => void;
}

type InterfaceOf<T> = { [P in keyof T]: T[P] };

export type EnvironmentType<StateT, ActionT extends Action> = InterfaceOf<Environment<StateT, ActionT>>;

export type Effect<StateT, ActionT extends Action, P extends any[], ReturnT> = {
  type: 'call-func-with-env-effect';
  func: (env: EnvironmentType<StateT, ActionT>, ...args: P) => ReturnT;
};

export function withEnv<StateT, ActionT extends Action, P extends any[], T>(
  f: (env: EnvironmentType<StateT, ActionT>, ...args: P) => T,
): Effect<StateT, ActionT, P, T> {
  // Object.defineProperty(f, 'name', { value: arguments.callee.name });

  return {
    type: 'call-func-with-env-effect',
    func: f,
    // run (...args) => env
  };
}

export abstract class EffectCreator3<Env, Params extends any[], ReturnType> {
  public readonly args: Params;

  constructor(...args: Params) {
    this.args = args;
  }

  public abstract run(run: Env, ...args: Params): ReturnType;
}
