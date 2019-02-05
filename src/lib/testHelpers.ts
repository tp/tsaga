import { SagaEnvironment, AnySaga } from './types';
import { deepStrictEqual } from 'assert';

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
  f: (env: SagaEnvironment<any>, ...args: P) => T,
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

export function testSaga(saga: AnySaga): SagaTest1 {
  return {
    with: (action) => {
      return {
        which: (...effects) => {
          effects = effects.slice(0);

          return {
            // TODO: run Add run to execute without final state check?
            resultingInState: (finalState: any) => {
              return {
                forReducer: async (reducer: Function) => {
                  let state = reducer(undefined, { type: '___INTERNAL___SETUP_MESSAGE' }); // TODO: Or accept initial state?

                  const testContext: SagaEnvironment<any> = {
                    run: (f: Function, ...args: any[]) => {
                      // ((...args: any[]) => any) | Effect<any, any>
                      for (const effect of effects) {
                        if (effect.type === 'call' && effect.func === f /* TODO: & check args */) {
                          return effect.value;
                        }
                      }

                      console.error(effects);

                      // TODO: Should we expect a mock for all, or just call through?
                      throw new Error(`No mock value provided for run(${f.name || 'unnamed function'})`);
                    },
                    select: (selector, ...args) => {
                      for (const effect of effects) {
                        if (effect.type === 'select' && effect.func === selector) {
                          return effect.value;
                        }
                      }

                      console.error(`select`, effects);

                      throw new Error(`No mock value provided for select(${selector.name || 'unnamed selector'})`);
                    },
                    dispatch: (action) => {
                      console.log(action);
                      // TODO: Support assertions on dispatched message, or is it fine to just check the final state?
                      state = reducer(state, action);
                    },
                    fork: (f: Function, ...args: any[]) => {
                      // TODO: Create detached context / add cancellation to tests?
                      for (const effect of effects) {
                        if (effect.type === 'fork' && effect.func === f) {
                          return effect.value;
                        }
                      }

                      console.error(`fork: calling through`);

                      return f(testContext, ...args);
                      // throw new Error(`Not implemented: fork`);
                    },
                    spawn: (f: Function, ...args: any[]) => {
                      for (const effect of effects) {
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

                  await saga.innerFunction(
                    /**
                     * Fine, since the outside interface is equal, it's just not of the same `class`
                     *
                     * TODO: We might want to use `InterfaceOf` everywhere instead of exposing the concrete class
                     */
                    testContext as any,
                    action,
                  );

                  deepStrictEqual(state, finalState);

                  console.error('saga done');
                },
              };
            },
          };
        },
      };
    },
  };
}
