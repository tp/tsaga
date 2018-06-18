import { ReduxTsagaContext } from './tsaga-redux';
import { Store, AnyAction } from 'redux';
import { OutputParametricSelector, Selector, OutputSelector } from 'reselect';

type CallEffectMatcher<T> = {
  type: 'call';
  function: Function;
  result: Promise<any>;
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

export function calls(f: Function, ...params: any[]): { receiving: (result: any | Promise<any>) => CallEffectMatcher<any> } {
  return {
    receiving: (result) => {
      return {
        type: 'call',
        function: f,
        result: result instanceof Promise ? result : Promise.resolve(result),
      };
    },
  };
}

type SelectMockCreator<State> = {
  //   <ResultType>(selector: Selector<State, ResultType> | OutputSelector<State, ResultType, any>): Promise<ResultType>;
  <Param1Type, ResultType>(selector: OutputParametricSelector<State, Param1Type, ResultType, any>, _p1: Param1Type): { receiving: (result: ResultType) => SelectEffectMatcher<State, ResultType> };
};

export function selectsFactory<State>(store: Store<State, any>): SelectMockCreator<State> {
  return (selector: any) => {
    return {
      receiving: (result: any /* type ensured by SelectMock<State>, don't want to add to signature. TODO: Use `type` like above */): SelectEffectMatcher<State, any> => {
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
  afterIt: (useEffectMatch: (CallEffectMatcher<any> | SelectEffectMatcher<ReducerStateType, any>)[]) => Step4<SagaMessageType>;
};

type Step4<SagaMessageType> = {
  whenRunWith: (messages: SagaMessageType) => Promise<void>;
};

export function expectSaga<ReduxStoreType, ReduxActionType extends AnyAction>(saga: SagaP1<ReduxStoreType, any>): Step1<ReduxStoreType, any> {
  return {
    withStore: (store) => {
      return {
        toHaveFinalState: (expectedFinalReducerState) => {
          return {
            afterIt: (effects) => {
              return {
                whenRunWith: async (message) => {
                  const testContext: ReduxTsagaContext<ReduxStoreType> = {
                    call: async (f: Function) => {
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
