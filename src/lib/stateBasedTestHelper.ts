import { Saga, SagaEnvironment, Task } from '.';
import { deepStrictEqual } from 'assert';
import { ActionCreator, isType, Action } from 'typescript-fsa';
import { Effect } from './types';
import { isBoundEffect } from './utils';

export function calls<P extends any[], T>(
  f: (...params: P) => T,
): ValueMockBuilder<any, T extends Promise<infer PT> ? PT : T> {
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

export function spawns<State, Args extends any[], ReturnType>(
  effectOrEffectCreator: Effect<State, Args, ReturnType>,
): ValueMockBuilder<State, ReturnType> {
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

export function runs<State, Args extends any[], ReturnType>(
  funcOrEffectCreator: Effect<State, Args, ReturnType>,
): ValueMockBuilder<State, ReturnType> {
  return {
    receiving: (value): ValueMock<State, ReturnType> => {
      return {
        type: 'run',
        funcOrBoundEffect: funcOrEffectCreator,
        value,
      };
    },
  };
}

type ValueMockBuilder<State, ReturnType> = {
  receiving: (value: ReturnType) => ValueMock<State, ReturnType>;
};

type ValueMock<State, ReturnType> =
  | {
      type: 'call';
      func: Function /* TODO: Stricter types */;
      value: ReturnType;
    }
  | {
      type: 'run';
      funcOrBoundEffect: Effect<State, any, ReturnType>;
      value: ReturnType;
    }
  | {
      type: 'select';
      selector: (state: State) => ReturnType;
      value: ReturnType;
    }
  | {
      type: 'spawn';
      funcOrBoundEffect: Effect<State, any, ReturnType>;
      value: ReturnType;
    };

export async function testSagaWithState<State, Payload>(
  saga: Saga<State, Payload>,
  initialAction: Action<Payload>,
  mocks: ValueMock<State, any>[],
  initialState: State | undefined,
  reducer: (state: State | undefined, action: Action<any>) => State,
  finalState: State,
) {
  let state = initialState || reducer(undefined, { type: '___INTERNAL___SETUP_MESSAGE', payload: null });
  state = reducer(initialState, initialAction);

  let awaitingMessages: { actionCreator: ActionCreator<any>; promiseResolve: (action: any) => void }[] = [];

  function waitForMessage<Payload>(actionCreator: ActionCreator<Payload>): Promise<Payload> {
    console.error(`waitForMessage called`);

    return new Promise((resolve, reject) => {
      awaitingMessages.push({ actionCreator: actionCreator, promiseResolve: resolve });
      console.error(`awaitingMessages`, awaitingMessages);
    });
  }

  const testContext: SagaEnvironment<State> = {
    call: (f, ...params) => {
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
    select: (selector, ...args) => {
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
    spawn: <Args extends any[], ReturnType>(
      funcOrBoundEffect: Effect<State, Args, ReturnType>,
      ...args: Args
    ): Task<ReturnType> => {
      // TODO: Create detached context / add cancellation to tests?
      for (const effect of mocks) {
        if (effect.type === 'spawn') {
          if (isBoundEffect(funcOrBoundEffect)) {
            if (isBoundEffect(effect.funcOrBoundEffect)) {
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
        isBoundEffect(funcOrBoundEffect)
          ? funcOrBoundEffect.run(testContext, ...funcOrBoundEffect.args)
          : funcOrBoundEffect(testContext, ...args);

      return {
        cancel: () => {},
        result: result,
      };
    },
    run: <Args extends any[], ReturnType>(
      funcOrBoundEffect: Effect<State, Args, ReturnType>,
      ...args: Args
    ): ReturnType => {
      for (const effect of mocks) {
        if (effect.type === 'run') {
          if (isBoundEffect(funcOrBoundEffect)) {
            if (isBoundEffect(effect.funcOrBoundEffect)) {
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

      if (isBoundEffect(funcOrBoundEffect)) {
        return funcOrBoundEffect.run(testContext, ...funcOrBoundEffect.args);
      } else {
        return funcOrBoundEffect(testContext, ...args);
      }
    },
    take: (actionCreator: ActionCreator<any>) => {
      return waitForMessage(actionCreator);
    },
  };

  await saga.innerFunction(
    testContext,
    initialAction.payload,
  );

  if (mocks.length) {
    console.error(`Unused mocks after the saga completed`, mocks);
    throw new Error(`Unused mocks after the saga completed`);
  }

  deepStrictEqual(state, finalState);
}
