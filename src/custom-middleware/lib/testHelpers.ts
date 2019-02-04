import { Selector } from 'reselect';
import { AnySaga } from '.';
import { Environment, Effect, EffectCreator } from './environment';
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
export function runs<T extends (...args: any[]) => any>(f: T): ValueMockBuilder<ReturnType<T>> {
  return {
    receiving: (value): ValueMock<ReturnType<T>> => {
      return {
        type: 'call',
        func: f,
        value,
      };
    },
  };
}

type ReturnedPromiseResolvedType<T> = T extends (...args: any[]) => Promise<infer R> ? R : never;

export function selects<T extends (...args: any[]) => any>(f: T): ValueMockBuilder<ReturnType<T>> {
  return {
    receiving: (value): ValueMock<ReturnType<T>> => {
      return {
        type: 'call',
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
  type: 'select' | 'call';
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
                    run: (f: ((...args: any[]) => any) | Effect<any, any>) => {
                      for (const effect of effects) {
                        if (effect.type === 'call' && effect.func === f) {
                          return effect.value;
                        } else if ((f as EffectCreator<any, any, any>).wrappedFunction === effect.func) {
                          return effect.value;
                        }
                      }

                      // TODO: Should we expect a mock for all, or just call through?
                      throw new Error(`No mock value provided for run(${(f as any).name || 'unnamed function'})`);
                    },
                    select: (selector: any, ...args: any[]) => {
                      for (const effect of effects) {
                        if (effect.type === 'select' && effect.func === selector) {
                          return effect.value;
                        }
                      }

                      throw new Error(`No mock value provided for select(${selector.name})`);
                    },
                    dispatch: (action: Action) => {
                      console.log(action);
                      // TODO: Support assertions on dispatched message, or is it fine to just check the final state?
                      state = reducer(state, action);
                    },
                    createDetachedChildEnvironment: () => {
                      throw new Error(`Test Environment: createDetachedChildEnvironment is not implemented`);
                    },
                    __INTERNAL__waitForMessage: () => {
                      throw new Error(`Test Environment: waitForMessage is not implemented`);
                    },
                  };

                  await saga.saga(
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
