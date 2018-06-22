import { ReduxTsagaContext } from './tsaga-redux';
import { Store, AnyAction } from 'redux';
import { OutputParametricSelector, Selector, OutputSelector } from 'reselect';
import { isEqual } from 'lodash';

type CallEffectMatcher<T> = {
  type: 'call';
  function: Function;
  params: any[];
  result: Promise<T>;
};

type SelectEffectMatcher<AppState, ResultType> = {
  type: 'select';
  selector: (state: AppState, ...args: any[]) => ResultType; // TODO: Selector type
  result: Promise<ResultType>;
};

// type PutEffectMatcher = {
//   type: 'put';
//   message: any;
// };

// export function puts(message: any): PutEffectMatcher {
//   return {
//     type: 'put',
//     message: message,
//   };
// }

export function calls<R>(f: () => Promise<R>): { receiving: (result: R | Promise<R>) => CallEffectMatcher<R> };
export function calls<R, A>(
  f: (_0: A) => Promise<R>,
  _0: A,
): { receiving: (result: R | Promise<R>) => CallEffectMatcher<R> };
export function calls<R, A, B>(
  f: (_0: A, _1: B) => Promise<R>,
  _0: A,
  _1: B,
): { receiving: (result: R | Promise<R>) => CallEffectMatcher<R> };
export function calls<R>(
  f: (...args: any[]) => Promise<R>,
  ...params: any[]
): { receiving: (result: R | Promise<R>) => CallEffectMatcher<R> } {
  return {
    receiving: (result): CallEffectMatcher<R> => {
      return {
        type: 'call',
        function: f,
        params: params,
        result: result instanceof Promise ? result : Promise.resolve(result),
      };
    },
  };
}

type SelectMockCreator<State> = {
  //   <ResultType>(selector: Selector<State, ResultType> | OutputSelector<State, ResultType, any>): Promise<ResultType>;
  <Param1Type, ResultType>(selector: OutputParametricSelector<State, Param1Type, ResultType, any>, _p1: Param1Type): {
    receiving: (result: ResultType) => SelectEffectMatcher<State, ResultType>;
  };
};

export function selectsFactory<State>(store: Store<State, any>): SelectMockCreator<State> {
  return (selector: any) => {
    return {
      receiving: (
        result: any /* type ensured by SelectMock<State>, don't want to add to signature. TODO: Use `type` like above */,
      ): SelectEffectMatcher<State, any> => {
        return {
          type: 'select',
          selector: selector,
          result: Promise.resolve(result),
        };
      },
    };
  };
}

type SagaP1<ReduxStoreType, P1T> = (ctx: ReduxTsagaContext<ReduxStoreType>, p1: P1T) => void;

type Reducer<ReducerStateType> = (previous: ReducerStateType, message: any) => ReducerStateType;

interface Step1<ReducerStateType, SagaMessageType> {
  withStore(store: Store<ReducerStateType, any>): Step2<ReducerStateType, SagaMessageType>;
}

type Step2<ReducerStateType, SagaMessageType> = {
  toHaveFinalState: (reducerState: ReducerStateType) => Step3<ReducerStateType, SagaMessageType>;
};

type Step3<ReducerStateType, SagaMessageType> = {
  afterIt: (
    useEffectMatch: (CallEffectMatcher<any> | SelectEffectMatcher<ReducerStateType, any>)[],
  ) => Step4<SagaMessageType>;
};

type Step4<SagaMessageType> = {
  whenRunWith: (messages: SagaMessageType) => Promise<void>;
};

export function expectSaga<ReduxStoreType, ReduxActionType extends AnyAction, SagaParam1>(
  saga: SagaP1<ReduxStoreType, SagaParam1>,
): Step1<ReduxStoreType, SagaParam1> {
  return {
    withStore: (store) => {
      // TODO: Reinstate ReduxActionType
      return {
        toHaveFinalState: (expectedFinalReducerState) => {
          return {
            afterIt: (effects) => {
              return {
                whenRunWith: async (message) => {
                  const testContext: ReduxTsagaContext<ReduxStoreType> = {
                    call: async (f: Function, ...params: any[]) => {
                      const nextEffect = effects.shift();

                      if (!nextEffect) {
                        throw new Error(`no more effects left`);
                      }

                      if (nextEffect.type !== 'call') {
                        throw new Error(`Expected ${nextEffect.type} effect, but got call`);
                      }

                      if (nextEffect.function !== f) {
                        throw new Error(`Called function does not match expected`);
                      }

                      if (!isEqual(nextEffect.params, params)) {
                        throw new Error(`Function parameters do not match expectation`);
                      }

                      return nextEffect.result;
                    },
                    // put: async (message) => {
                    //   const nextEffect = effects.shift();

                    //   if (!nextEffect) {
                    //     throw new Error(`no more effects left`);
                    //   }

                    //   if (nextEffect.type !== 'put') {
                    //     throw new Error(`Expected ${nextEffect.type} effect, but got put`);
                    //   }

                    //   reducerState = reducer(reducerState, message);
                    // },
                    select: async (selector: Function /* TODO: Fix type */) => {
                      const nextEffect = effects.shift();

                      if (!nextEffect) {
                        throw new Error(`no more effects left`);
                      }

                      if (nextEffect.type !== 'select') {
                        throw new Error(`Expected ${nextEffect.type} effect, but got select`);
                      }

                      if (nextEffect.selector !== selector) {
                        throw new Error(`Expected different selector`);
                      }

                      return nextEffect.result;
                    },
                  };

                  await saga(testContext, message);

                  if (effects.length !== 0) {
                    throw new Error(`Unexecuted effects left`);
                  }
                },
              };
            },
          };
        },
      };
    },
  };
}
