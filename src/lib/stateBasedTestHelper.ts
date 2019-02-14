import { deepStrictEqual, fail } from 'assert';
import { Action, ActionCreator, isType } from 'typescript-fsa';
import { Saga, SagaEnvironment } from '.';
import { BoundEffect, FuncWithEnv, Task } from './types';

export function calls<P extends any[], T>(
  f: (...params: P) => T,
): ValueMockBuilder<any, T extends Promise<infer PT> ? PT : T> {
  // export function runs<R, T extends (...args: any[]) => void>(f: T): ValueMockBuilder<void> {
  return {
    receiving: (value) => {
      return {
        type: 'call',
        func: f,
        value,
      };
    },
  };
}

export function spawns<State, P extends any[], T>(
  effectOrEffectCreator: BoundEffect<SagaEnvironment<State>, P, T> | FuncWithEnv<State, P, T>,
): ValueMockBuilder<State, T> {
  // extends Promise<infer PT> ? PT : T
  return {
    receiving: (value) => {
      return {
        type: 'spawn',
        funcOrBoundEffect: effectOrEffectCreator,
        value,
      };
    },
  };
}

type ReturnedPromiseResolvedType<T> = T extends (...args: any[]) => Promise<infer R> ? R : never;

export function selects<State, T>(selector: (state: State) => T): ValueMockBuilder<State, T> {
  return {
    receiving: (value): ValueMock<State, T> => {
      return {
        type: 'select',
        selector,
        value,
      };
    },
  };
}

export function runs<State, P extends any[], T>(
  funcOrEffectCreator: BoundEffect<SagaEnvironment<State>, P, T> | FuncWithEnv<State, P, T>,
): ValueMockBuilder<State, T> {
  return {
    receiving: (value): ValueMock<State, T> => {
      return {
        type: 'run',
        funcOrBoundEffect: funcOrEffectCreator,
        value,
      };
    },
  };
}

interface ValueMockBuilder<StateT, T> {
  receiving: (value: T) => ValueMock<StateT, T>;
}

type ValueMock<StateT, T> =
  | {
      type: 'call';
      // tslint:disable-next-line:ban-types
      func: Function /* TODO: Stricter types */;
      value: T;
    }
  | {
      type: 'run';
      funcOrBoundEffect: BoundEffect<SagaEnvironment<StateT>, any, any> | FuncWithEnv<StateT, any, any>;
      value: T;
    }
  | {
      type: 'select';
      selector: (state: StateT) => T;
      value: T;
    }
  | {
      type: 'spawn';
      funcOrBoundEffect: BoundEffect<SagaEnvironment<StateT>, any, T> | FuncWithEnv<StateT, any, T>;
      value: T;
    };

export async function testSagaWithState<StateT, Payload>(
  saga: Saga<StateT, Payload>,
  initialAction: Action<Payload>,
  mocks: Array<ValueMock<StateT, any>>,
  initialState: StateT | undefined,
  reducer: (state: StateT | undefined, action: Action<any>) => StateT,
  finalState: StateT,
) {
  let state = initialState || reducer(undefined, { type: '___INTERNAL___SETUP_MESSAGE', payload: null });
  state = reducer(initialState, initialAction);

  let awaitingMessages: Array<{ actionCreator: ActionCreator<any>; promiseResolve: (action: any) => void }> = [];

  function waitForMessage<MessagePayload>(actionCreator: ActionCreator<MessagePayload>): Promise<MessagePayload> {
    return new Promise((resolve, reject) => {
      awaitingMessages.push({ actionCreator, promiseResolve: resolve });
    });
  }

  const testContext: SagaEnvironment<StateT> = {
    call: (f, ...params) => {
      for (const effect of mocks) {
        if (effect.type === 'call' && effect.func === f) {
          /* TODO: & check args */
          mocks = mocks.filter((e) => e !== effect);
          return effect.value;
        }
      }

      return f(...params);
    },
    select: (selector, ...args) => {
      for (const effect of mocks) {
        if (effect.type === 'select' && effect.selector === selector) {
          mocks = mocks.filter((e) => e !== effect);
          return effect.value;
        }
      }

      return selector(state, ...args);
    },
    dispatch: (action) => {
      state = reducer(state, action);

      for (const config of awaitingMessages) {
        if (isType(action, config.actionCreator)) {
          config.promiseResolve(action.payload);
        }
      }
      awaitingMessages = awaitingMessages.filter((config) => !isType(action, config.actionCreator));
    },
    spawn: (funcOrBoundEffect, ...args) => {
      // TODO: Create detached context / add cancellation to tests?
      for (const effect of mocks) {
        if (effect.type === 'spawn') {
          if (funcOrBoundEffect instanceof BoundEffect) {
            if (effect.funcOrBoundEffect instanceof BoundEffect) {
              if ((effect.funcOrBoundEffect as any).constructor === (funcOrBoundEffect as any).constructor) {
                mocks = mocks.filter((e) => e !== effect);
                return effect.value;
              }
            }
          } else if (effect.funcOrBoundEffect === funcOrBoundEffect) {
            mocks = mocks.filter((e) => e !== effect);
            return effect.value;
          }
        }
      }

      const result =
        funcOrBoundEffect instanceof BoundEffect
          ? funcOrBoundEffect.run(testContext, ...funcOrBoundEffect.args)
          : funcOrBoundEffect(testContext, ...args);

      return {
        cancel: () => {
          /* TODO: Add cancellation */
        },
        result,
      };
    },
    run: <Args extends any[], T>(
      funcOrBoundEffect: BoundEffect<SagaEnvironment<StateT>, Args, T> | FuncWithEnv<StateT, Args, T>,
      ...args: typeof funcOrBoundEffect extends BoundEffect<any, any, any> ? never : Args
    ): T => {
      for (const effect of mocks) {
        if (effect.type === 'run') {
          if (funcOrBoundEffect instanceof BoundEffect) {
            if (effect.funcOrBoundEffect instanceof BoundEffect) {
              if ((effect.funcOrBoundEffect as any).constructor === (funcOrBoundEffect as any).constructor) {
                mocks = mocks.filter((e) => e !== effect);
                return effect.value;
              }
            }
          } else if (effect.funcOrBoundEffect === funcOrBoundEffect) {
            mocks = mocks.filter((e) => e !== effect);
            return effect.value;
          }
        }
      }

      if (funcOrBoundEffect instanceof BoundEffect) {
        return funcOrBoundEffect.run(testContext as any /* TODO */, ...funcOrBoundEffect.args);
      } else {
        return funcOrBoundEffect(testContext, ...args);
      }
    },
    take: (actionCreator: ActionCreator<any>) => {
      return waitForMessage(actionCreator);
    },
  };

  await saga.innerFunction(
    /**
     * Fine, since the outside interface is equal, it's just not of the same `class`
     *
     * TODO: We might want to use `InterfaceOf` everywhere instead of exposing the concrete class
     */
    testContext,
    initialAction.payload,
  );

  if (mocks.length) {
    console.error(`Unused mocks after the saga completed`, mocks);
    throw new Error(`Unused mocks after the saga completed`);
  }

  deepStrictEqual(state, finalState);
}
