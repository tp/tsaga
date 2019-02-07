import { Selector } from 'reselect';
import { AnySaga } from '.';
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

// export function spawns<P extends any[], T>(
//   f: (env: Environment<any, any>, ...args: P) => T,
// ): ValueMockBuilder<T extends Promise<infer PT> ? PT : T> {
//   // export function runs<R, T extends (...args: any[]) => void>(f: T): ValueMockBuilder<void> {
//   return {
//     receiving: (value) => {
//       return {
//         type: 'spawn',
//         func: f,
//         value: value,
//       };
//     },
//   };
// }

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
  type: 'select' | 'call' | 'run' | 'spawn';
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

                  const testContext: InterfaceOf<Environment<any, Action>> = {
                    call: <P extends any[], T>(f: (...params: P) => T, ...params: P) => {
                      // ((...args: any[]) => any) | Effect<any, any>
                      for (const effect of effects) {
                        if (
                          effect.type === 'call' &&
                          effect.func === f
                          // (typeof funcOrEffect === 'function'
                          //   : effect.func === funcOrEffect.func) /* TODO: & check args */
                        ) {
                          return effect.value;
                        }
                      }

                      console.error(effects);

                      // TODO: Should we expect a mock for all, or just call through?
                      // throw new Error(
                      //   `No mock value provided for run(${(typeof funcOrEffect === 'function' && funcOrEffect.name) ||
                      //     'unnamed function'})`,
                      // );

                      console.error(`run: calling through`);

                      f(...params);
                      // if (typeof funcOrEffect === 'function') {
                      // } else {
                      //   funcOrEffect.func(testContext, ...params);
                      // }
                    },

                    select: (selector: Function, ...args: any[]) => {
                      for (const effect of effects) {
                        if (effect.type === 'select' && effect.func === selector) {
                          return effect.value;
                        }
                      }

                      console.error(`select`, effects);

                      throw new Error(`No mock value provided for select(${selector.name || 'unnamed selector'})`);
                    },
                    dispatch: (action: Action) => {
                      console.log(action);
                      // TODO: Support assertions on dispatched message, or is it fine to just check the final state?
                      state = reducer(state, action);
                    },
                    spawn: (f: any /* TODO */, ...args: any[]) => {
                      // TODO: Create detached context / add cancellation to tests?
                      for (const effect of effects) {
                        if (effect.type === 'spawn' && effect.func === f) {
                          return effect.value;
                        }
                      }

                      console.error(`spawn: calling through`);

                      return f(testContext, ...args);
                      // throw new Error(`Not implemented: fork`);
                    },
                    run: (f: any /* TODO */, ...args: any[]) => {
                      for (const effect of effects) {
                        if (effect.type === 'spawn' && effect.func === f) {
                          return effect.value;
                        }
                      }

                      console.error(`fork: calling through`);

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
