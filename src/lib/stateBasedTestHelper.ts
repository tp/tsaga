import { Saga, SagaEnvironment } from '.';
import { deepStrictEqual } from 'assert';
import { ActionCreator, isType, Action } from 'typescript-fsa';
import { BoundEffect, FuncWithEnv, Task } from './types';

// type SilentAssertion = {
//   type: 'dispatch',
// }

// TODO: Should call provide the env implictly if the target function desires it?
// A function without `env` should have no side effect and can just be called directly
// TODO: Allow T to be provided for Promise<T>
// TODO: Affordances for effects and effect creators
// TODO: Do we need plain effect in here? Or should always creators be passed?
// Otherwise the call-site could be written as either `run(f, x)` or `run(f(x))`…
export function calls<P extends any[], T>(
  f: (...params: P) => T,
): ValueMockBuilder<T extends Promise<infer PT> ? PT : T> {
  // export function runs<R, T extends (...args: any[]) => void>(f: T): ValueMockBuilder<void> {
  return {
    receiving: (value) => {
      return {
        type: 'call',
        func: f,
        value: value,
      };
    },
  };
}

export function spawns<State, P extends any[], T>(
  effectOrEffectCreator: BoundEffect<SagaEnvironment<State>, P, T> | FuncWithEnv<State, P, T>,
): ValueMockBuilder<T> {
  // extends Promise<infer PT> ? PT : T
  return {
    receiving: (value) => {
      return {
        type: 'spawn',
        funcOrBoundEffect: effectOrEffectCreator,
        value: value,
      };
    },
  };
}

type ReturnedPromiseResolvedType<T> = T extends (...args: any[]) => Promise<infer R> ? R : never;

export function selects<T>(selector: (state: any) => T): ValueMockBuilder<T> {
  return {
    receiving: (value): ValueMock<T> => {
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
): ValueMockBuilder<T> {
  return {
    receiving: (value): ValueMock<T> => {
      return {
        type: 'run',
        funcOrBoundEffect: funcOrEffectCreator,
        value,
      };
    },
  };
}

type ValueMockBuilder<T> = {
  receiving: (value: T) => ValueMock<T>;
};

type ValueMock<T> =
  | {
      type: 'call';
      func: Function;
      value: T;
    }
  | {
      type: 'run';
      funcOrBoundEffect: BoundEffect<SagaEnvironment<any>, any, any> | FuncWithEnv<any, any, any>;
      value: T;
    }
  | {
      type: 'select';
      selector: Function;
      value: T;
    }
  | {
      type: 'spawn';
      funcOrBoundEffect: BoundEffect<SagaEnvironment<any>, any, T> | FuncWithEnv<any, any, T>;
      value: T;
    };

interface SagaTest1 {
  with: (action: any) => SagaTest2;
}

interface SagaTest2 {
  which: (...effects: ValueMock<any>[]) => SagaTestBuilder3;
}

interface SagaTestBuilder3 {
  resultingInState: (state: any) => SagaTestBuilder4;
}

interface SagaTestBuilder4 {
  forReducer: (reducer: Function) => Promise<void>;
}

export async function testSagaWithState<StateT, Payload>(
  saga: Saga<StateT, Payload>,
  initialPayload: Payload,
  mocks: ValueMock<any>[],
  initialState: StateT | undefined,
  reducer: (state: StateT | undefined, action: Action<any>) => StateT,
  finalState: StateT,
) {
  let state = initialState || reducer(undefined, { type: '___INTERNAL___SETUP_MESSAGE', payload: null });
  // TODO: Shouldn't the initial action be run through the reducers before hitting the saga?
  // state = reducer(initialState, initialAction);

  let awaitingMessages: { actionCreator: ActionCreator<any>; promiseResolve: (action: any) => void }[] = [];

  function waitForMessage<Payload>(actionCreator: ActionCreator<Payload>): Promise<Payload> {
    console.error(`waitForMessage called`);

    return new Promise((resolve, reject) => {
      awaitingMessages.push({ actionCreator: actionCreator, promiseResolve: resolve });
      console.error(`awaitingMessages`, awaitingMessages);
    });
  }

  const testContext: SagaEnvironment<any> = {
    call: <T, P extends any[]>(f: (...params: P) => T, ...params: P) => {
      for (const effect of mocks) {
        if (effect.type === 'call' && effect.func === f) {
          /* TODO: & check args */
          mocks = mocks.filter((e) => e !== effect);
          return effect.value;
        }
      }

      console.info(`run: calling through`);

      return f(...params);
    },
    select: <T, P extends any[]>(selector: (state: StateT, ...p: P) => T, ...args: P): T => {
      for (const effect of mocks) {
        if (effect.type === 'select' && effect.selector === selector) {
          mocks = mocks.filter((e) => e !== effect);
          return effect.value;
        }
      }

      console.info(`select: calling through`);

      return selector(state, ...args);
    },
    dispatch: (action) => {
      console.info(`test env dispatch`, action);

      state = reducer(state, action);

      for (const config of awaitingMessages) {
        if (isType(action, config.actionCreator)) {
          config.promiseResolve(action.payload);
        }
      }
      awaitingMessages = awaitingMessages.filter((config) => !isType(action, config.actionCreator));
    },
    spawn: <P extends any[], T>(
      funcOrBoundEffect: BoundEffect<SagaEnvironment<StateT>, P, T> | FuncWithEnv<StateT, P, T>,
      ...args: P
    ): Task<T> => {
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

      console.info(`spawn: calling through`);

      // TODO
      const result =
        funcOrBoundEffect instanceof BoundEffect
          ? funcOrBoundEffect.run(testContext as any /* TODO */, ...funcOrBoundEffect.args)
          : funcOrBoundEffect(testContext, ...args);

      return {
        cancel: () => {},
        result: result,
      };
    },
    run: <P extends any[], T>(
      funcOrBoundEffect: BoundEffect<SagaEnvironment<StateT>, P, T> | FuncWithEnv<StateT, P, T>,
      ...args: P
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

      console.info(`run: calling through`);

      if (funcOrBoundEffect instanceof BoundEffect) {
        return funcOrBoundEffect.run(testContext as any /* TODO */, ...funcOrBoundEffect.args);
      } else {
        return funcOrBoundEffect(testContext, ...args);
      }
    },
    take: <T>(actionCreator: ActionCreator<T>): Promise<T> => {
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
    initialPayload,
  );

  if (mocks.length) {
    console.error(`Unused mocks after the saga completed`, mocks);
    throw new Error(`Unused mocks after the saga completed`);
  }

  deepStrictEqual(state, finalState);

  console.info('saga done');
}
