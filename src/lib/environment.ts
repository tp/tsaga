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
    this.spawn = this.spawn.bind(this) as any;
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

  /**
   * Calls `f` with the supplied params
   *
   * In case the return type is not correctly inferred, wrap the function in an BoundEffect
   *
   * @param f
   * @param params
   */
  public call = <T, P extends any[]>(f: (...params: P) => T, ...params: P): T => {
    if (this.cancellationToken && this.cancellationToken.canceled) {
      throw new SagaCancelledError(`Saga has been cancelled`);
    }

    return f(...params);
  };

  public take = async <Payload>(actionCreator: ActionCreator<Payload>): Promise<Payload> => {
    return (await this.waitForMessage(actionCreator)).payload;
  };

  /**
   * Runs the given saga as an attached child.
   * Cancelling the parent will also cancel the child at the next opportunity.
   *
   * @param effectOrEffectCreator
   * @param params
   */
  public run<T, P extends any[]>(effect: BoundEffect<Environment<StateT, ActionT>, P, T>, ...params: P): T;
  public run<T, P extends any[]>(effect: Effect<StateT, ActionT, P, T>, ...params: P): T;
  public run<P extends any[], T>(
    effectOrEffectCreator: BoundEffect<Environment<StateT, ActionT>, P, T> | Effect<StateT, ActionT, P, T>,
    ...args: P
  ): T {
    if (effectOrEffectCreator instanceof BoundEffect) {
      return effectOrEffectCreator.run(this, ...effectOrEffectCreator.args);
    } else {
      return effectOrEffectCreator.func(this, ...args);
    }
  }

  /**
   * Spawns the saga in a new context, returning a detached task
   *
   * Cancelling this `Task` will not cancel the parent.
   *
   * @param effect
   * @param params
   */
  public spawn<T, P extends any[]>(effect: BoundEffect<Environment<StateT, ActionT>, P, T>, ...params: P): Task<T>;
  public spawn<T, P extends any[]>(effect: Effect<StateT, ActionT, P, T>, ...params: P): Task<T>;
  public spawn<P extends any[], T>(
    effectOrEffectCreator: BoundEffect<Environment<StateT, ActionT>, P, T> | Effect<StateT, ActionT, P, T>,
    ...args: P
  ): Task<T> {
    const { childEnv, cancellationToken } = this.createDetachedChildEnvironment();

    const task: Task<T> = {
      cancel: () => cancellationToken.cancel(),
      result:
        effectOrEffectCreator instanceof BoundEffect
          ? effectOrEffectCreator.run(childEnv, ...effectOrEffectCreator.args)
          : effectOrEffectCreator.func(childEnv, ...args),
    };

    return task;
  }
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
  return {
    type: 'call-func-with-env-effect',
    func: f,
  };
}

export abstract class BoundEffect<Env, Params extends any[], ReturnType> {
  public readonly args: Params;

  constructor(...args: Params) {
    this.args = args;
  }

  public abstract run(run: Env, ...args: Params): ReturnType;
}
