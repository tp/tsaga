import { Store } from 'redux';
import { CancellationToken } from './CancellationToken';
import { SagaCancelledError } from './SagaCancelledError';
import { Action } from './types';
import { ActionCreator, Action as FsaAction } from 'typescript-fsa';

export class Environment<StateT, ActionT extends Action> {
  constructor(
    private readonly store: Store<StateT, ActionT>,
    private readonly waitForMessage: <Payload>(action: ActionCreator<Payload>) => Promise<FsaAction<Payload>>,
    private readonly cancellationToken?: CancellationToken,
  ) {}

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

  public run = <T, P extends any[]>(f: (...params: P) => T, ...params: P): T => {
    if (this.cancellationToken && this.cancellationToken.canceled) {
      throw new SagaCancelledError(`Saga has been cancelled`);
    }

    return f(...params);
  };

  public take = async <Payload>(actionCreator: ActionCreator<Payload>): Promise<Payload> => {
    return (await this.waitForMessage(actionCreator)).payload;
  };

  public spawn = <P extends any[], T>(f: (env: Environment<StateT, ActionT>, ...args: P) => T, ...args: P): T => {
    return f(this, ...args);
  };

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
