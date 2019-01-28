import { Selector } from 'reselect';
import { AnySaga } from '.';
import { Environment } from './environment';
import { deepStrictEqual } from 'assert';

// type SilentAssertion = {
//   type: 'dispatch',

// }

// TODO: Should call provide the env implictly if the target function desires it?
// A function without `env` should have no side effect and can just be called directly

export function calls<T extends (...args: any[]) => any>(f: T): ValueMockBuilder<ReturnType<T>> {
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
  which: (...effects: any[]) => SagaTestBuilder3;
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

                  const testContext: Environment<any, any> = {
                    call: (f: any) => {
                      return 0 as any;
                    },
                    callEnv: (f: any) => {
                      return 0 as any;
                    },
                    select: () => {
                      return 0 as any;
                    },
                    put: (action: any) => {
                      console.log(action);
                      state = reducer(state, action);
                    },
                  } as any;

                  await saga.saga(testContext, action);

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
