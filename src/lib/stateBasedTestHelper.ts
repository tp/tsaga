import { Selector } from 'reselect';
import { AnySaga, Saga } from '.';
import { Environment } from './environment';
import { deepStrictEqual } from 'assert';
import { Action } from './types';

// type SilentAssertion = {
//   type: 'dispatch',
// }

// TODO: Should call provide the env implictly if the target function desires it?
// A function without `env` should have no side effect and can just be called directly
// TODO: Allow T to be provided for Promise<T>
// TODO: Affordances for effects and effect creators
// TODO: Do we need plain effect in here? Or should always creators be passed?
// Otherwise the call-site could be written as either `run(f, x)` or `run(f(x))`…
export function runs<P extends any[], T>(f: (...args: P) => T): ValueMockBuilder<T extends Promise<infer PT> ? PT : T> {
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

export function spawns<P extends any[], T>(
  f: (env: Environment<any, any>, ...args: P) => T,
): ValueMockBuilder<T extends Promise<infer PT> ? PT : T> {
  // export function runs<R, T extends (...args: any[]) => void>(f: T): ValueMockBuilder<void> {
  return {
    receiving: (value) => {
      return {
        type: 'spawn',
        func: f,
        value: value,
      };
    },
  };
}

type ReturnedPromiseResolvedType<T> = T extends (...args: any[]) => Promise<infer R> ? R : never;

export function selects<T extends (...args: any[]) => any>(f: T): ValueMockBuilder<ReturnType<T>> {
  return {
    receiving: (value): ValueMock<ReturnType<T>> => {
      return {
        type: 'select',
        func: f,
        value,
      };
    },
  };
}

export function forks<T extends (...args: any[]) => any>(f: T): ValueMockBuilder<ReturnType<T>> {
  return {
    receiving: (value): ValueMock<ReturnType<T>> => {
      return {
        type: 'select',
        func: f,
        value,
      };
    },
  };
}

type ValueMockBuilder<T> = {
  receiving: (value: T) => ValueMock<T>;
};

type ValueMock<T> = {
  type: 'select' | 'call' | 'spawn' | 'fork';
  func: Function;
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

interface SagaEnv<StateT, ActionT> {
  call: <T extends (...args: any[]) => any>(f: T) => ReturnType<T>;
  select: <R>(s: Selector<StateT, R>) => R;
  dispatch: (action: ActionT) => void;
}

type InterfaceOf<T> = { [P in keyof T]: T[P] };

export async function testSagaWithState<StateT, Payload>(
  saga: Saga<StateT, any, Payload>,
  initialPayload: Payload,
  mocks: ValueMock<any>[],
  initialState: StateT | undefined,
  reducer: (state: StateT | undefined, action: Action) => StateT,
  finalState: StateT,
) {
  let state = initialState || reducer(undefined, { type: '___INTERNAL___SETUP_MESSAGE', payload: null });

  const testContext: InterfaceOf<Environment<any, Action>> = {
    run: (f: Function, ...args: any[]) => {
      for (const effect of mocks) {
        if (effect.type === 'call' && effect.func === f /* TODO: & check args */) {
          return effect.value;
        }
      }

      console.error(`run: calling through`);

      return f(...args);
    },
    select: (selector: Function, ...args: any[]) => {
      for (const effect of mocks) {
        if (effect.type === 'select' && effect.func === selector) {
          return effect.value;
        }
      }

      console.error(`select: calling through`);

      return selector(state, ...args);
    },
    dispatch: (action: Action) => {
      console.log(`test env dispatch`, action);

      state = reducer(state, action);
    },
    fork: (f: Function, ...args: any[]) => {
      // TODO: Create detached context / add cancellation to tests?
      for (const effect of mocks) {
        if (effect.type === 'fork' && effect.func === f) {
          return effect.value;
        }
      }

      console.error(`fork: calling through`);

      return f(testContext, ...args);
      // throw new Error(`Not implemented: fork`);
    },
    spawn: (f: Function, ...args: any[]) => {
      for (const effect of mocks) {
        if (effect.type === 'spawn' && effect.func === f) {
          return effect.value;
        }
      }

      console.error(`spawn: calling through`);

      return f(testContext, ...args);
    },
    take: () => {
      throw new Error(`Not implemented: take`);
    },
  };

  await saga.saga(
    /**
     * Fine, since the outside interface is equal, it's just not of the same `class`
     *
     * TODO: We might want to use `InterfaceOf` everywhere instead of exposing the concrete class
     */
    testContext as any,
    { payload: initialPayload } as any,
  );

  deepStrictEqual(state, finalState);

  console.error('saga done');
}
