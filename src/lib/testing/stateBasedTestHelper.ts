import { deepStrictEqual, fail } from 'assert';
import { Action, ActionCreator, isType } from 'typescript-fsa';
import { Saga, SagaEnvironment } from '../index';
import { SagaFunc } from '../types';

export function calls<P extends any[], T>(
  func: (...params: P) => T,
): ValueMockBuilder<any, T extends Promise<infer PT> ? PT : T> {
  // export function runs<R, T extends (...args: any[]) => void>(f: T): ValueMockBuilder<void> {
  return {
    receiving: (value) => {
      return {
        type: 'call',
        func,
        value,
      };
    },
  };
}

export function spawns<State, P extends any[], T>(func: SagaFunc<State, P, T>): ValueMockBuilder<State, T> {
  // extends Promise<infer PT> ? PT : T
  return {
    receiving: (value) => {
      return {
        type: 'spawn',
        func,
        value,
      };
    },
  };
}

type ReturnedPromiseResolvedType<T> = T extends (...args: any[]) => Promise<infer R> ? R : never;

export function selects<State, T>(selector: (state: State, ...args: any[]) => T): ValueMockBuilder<State, T> {
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

export function runs<State, P extends any[], T>(func: SagaFunc<State, P, T>): ValueMockBuilder<State, T> {
  return {
    receiving: (value): ValueMock<State, T> => {
      return {
        type: 'run',
        func,
        value,
      };
    },
  };
}

export function dispatches<State, T>(action: Action<T>): ValueMock<State, T> {
  return {
    type: 'dispatch',
    action,
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
      func: SagaFunc<StateT, any, any>;
      value: T;
    }
  | {
      type: 'select';
      selector: (state: StateT) => T;
      value: T;
    }
  | {
      type: 'spawn';
      func: SagaFunc<StateT, any, T>;
      value: T;
    }
  | {
      type: 'dispatch';
      action: Action<T>;
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

  let awaitingMessages: Array<{
    actionCreator: ActionCreator<any>;
    promiseResolve: (action: any) => void;
  }> = [];

  function waitForMessage<MessagePayload>(actionCreator: ActionCreator<MessagePayload>): Promise<MessagePayload> {
    return new Promise((resolve, reject) => {
      awaitingMessages.push({ actionCreator, promiseResolve: resolve });
    });
  }

  const testContext: SagaEnvironment<StateT> = {
    call: (f, ...params) => {
      for (const mock of mocks) {
        if (mock.type === 'call' && mock.func === f) {
          /* TODO: & check args */
          mocks = mocks.filter((e) => e !== mock);
          return mock.value;
        }
      }

      return f(...params);
    },
    select: (selector, ...args) => {
      for (const mock of mocks) {
        if (mock.type === 'select' && mock.selector === selector) {
          mocks = mocks.filter((e) => e !== mock);
          return mock.value;
        }
      }

      return selector(state, ...args);
    },
    dispatch: (action) => {
      for (const mock of mocks) {
        if (mock.type === 'dispatch') {
          if (mock.action.type === action.type) {
            deepStrictEqual(mock.action.payload, action.payload);

            mocks = mocks.filter((e) => e !== mock);
          }
        }
      }

      state = reducer(state, action);

      for (const config of awaitingMessages) {
        if (isType(action, config.actionCreator)) {
          config.promiseResolve(action.payload);
        }
      }

      awaitingMessages = awaitingMessages.filter((config) => !isType(action, config.actionCreator));
    },
    spawn: (func, ...args) => {
      // TODO: Create detached context / add cancellation to tests?
      for (const mock of mocks) {
        if (mock.type === 'spawn') {
          if (mock.func === func) {
            mocks = mocks.filter((e) => e !== mock);
            return mock.value;
          }
        }
      }

      const result = func(testContext, ...args);

      return {
        cancel: () => {
          /* TODO: Add cancellation */
        },
        result,
      };
    },
    run: (func, ...args) => {
      for (const mock of mocks) {
        if (mock.type === 'run') {
          if (mock.func === func) {
            mocks = mocks.filter((e) => e !== mock);
            return mock.value;
          }
        }
      }

      return func(testContext, ...args);
    },
    take: (actionCreator: ActionCreator<any>) => {
      return waitForMessage(actionCreator);
    },
  };

  await saga.handler(
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
