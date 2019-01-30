import { Store, Middleware } from 'redux';
// import actionCreatorFactory, { isType, ActionCreator, Action as FSAAction } from 'typescript-fsa';
import { Action } from './types';
import { CancellationToken } from './CancellationToken';
import { SagaCancelledError } from './SagaCancelledError';

export class Environment<StateT, ActionT extends Action> {
  constructor(private store: Store<StateT, ActionT>, private cancellationToken?: CancellationToken) {
    (this as any).call = this.call.bind(this);
    (this as any).callEnv = this.callEnv.bind(this);
    (this as any).select = this.select.bind(this);
    (this as any).put = this.put.bind(this);
  }

  public put(action: ActionT): void {
    if (this.cancellationToken && this.cancellationToken.canceled) {
      throw new SagaCancelledError(`Saga has been cancelled`);
    }
    // console.error(`put`, action);
    this.store.dispatch(action);
    // console.error(`state after put`, this.store.getState());
  }

  public call<T>(f: () => T): T extends Promise<any> ? T : Promise<T>;
  public call<T, P1>(f: (p1: P1) => T, p1: P1): T extends Promise<any> ? T : Promise<T>;
  public call<T, P1, P2>(f: (p1: P1, p2: P2) => T, p1: P1, p2: P2): T extends Promise<any> ? T : Promise<T>;
  public call(f: Function, ...args: any[]): any {
    if (this.cancellationToken && this.cancellationToken.canceled) {
      throw new SagaCancelledError(`Saga has been cancelled`);
    }

    return Promise.resolve(f(...args));
  }

  public callEnv<T>(f: (env: this) => T): T extends Promise<any> ? T : Promise<T>;
  public callEnv<T, P1>(f: (env: this, p1: P1) => T, p1: P1): T extends Promise<any> ? T : Promise<T>;
  public callEnv(f: Function, ...args: any[]): any {
    if (this.cancellationToken && this.cancellationToken.canceled) {
      throw new SagaCancelledError(`Saga has been cancelled`);
    }

    return Promise.resolve(f(this, ...args));
  }

  public select<T>(selector: (state: StateT) => T, p1?: never, p2?: never): T;
  public select<P1, T>(selector: (state: StateT, p1: P1) => T, p1: P1, p2?: never): T;
  public select<P1, P2, T>(selector: (state: StateT, p1: P1, p2: P2) => T, p1: P1, p2: P2): T;
  public select<T>(selector: (state: StateT, ...args: any[]) => T, ...args: any[]): T {
    if (this.cancellationToken && this.cancellationToken.canceled) {
      throw new SagaCancelledError(`Saga has been cancelled`);
    }

    return selector(this.store.getState(), ...args);
  }
}
