import { ReduxLikeSagaContext } from './redux-like';

type CallEffectMatcher<T> = {
  type: 'call';
  function: Function;
  result: Promise<any>;
};

type SelectEffectMatcher<T> = {
  type: 'select';
  selector: string;
  result: Promise<number>;
};

type PutEffectMatcher = {
  type: 'put';
  message: any;
};

export function puts(message: any): PutEffectMatcher {
  return {
    type: 'put',
    message: message,
  };
}

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

export function selects(selector: string): { receiving: (result: number | Error | Promise<any>) => SelectEffectMatcher<any> } {
  return {
    receiving: (result) => {
      return {
        type: 'select',
        selector: selector,
        result: typeof result === 'number' ? Promise.resolve(result) : result instanceof Error ? Promise.reject(result) : result,
      };
    },
  };
}

type ReduxLikeSagaEffectMatcher = CallEffectMatcher<any> | SelectEffectMatcher<any> | PutEffectMatcher;

type MessageSaga<MessageType> = (ctx: ReduxLikeSagaContext, message: MessageType) => void;

type Reducer<ReducerStateType> = (previous: ReducerStateType, message: any) => ReducerStateType;

interface Step1<ReducerStateType, SagaMessageType> {
  withReducer<ReducerStateType>(reducer: Reducer<ReducerStateType>): Step2<ReducerStateType, SagaMessageType>;
}

type Step2<ReducerStateType, SagaMessageType> = {
  toHaveFinalState: (reducerState: ReducerStateType) => Step3<SagaMessageType>;
};

type Step3<SagaMessageType> = {
  afterIt: (useEffectMatch: ReduxLikeSagaEffectMatcher[]) => Step4<SagaMessageType>;
};

type Step4<SagaMessageType> = {
  whenRunWith: (messages: SagaMessageType) => Promise<void>;
};

export function expectSaga<ReducerStateType, SagaMessageType>(saga: MessageSaga<SagaMessageType>): Step1<ReducerStateType, SagaMessageType> {
  return {
    withReducer: (reducer) => {
      return {
        toHaveFinalState: (expectedFinalReducerState) => {
          return {
            afterIt: (effects) => {
              return {
                whenRunWith: async (message) => {
                  const initialReducerState = reducer(undefined!, null);

                  let reducerState = initialReducerState;

                  const testContext: ReduxLikeSagaContext = {
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
                    put: async (message) => {
                      const nextEffect = effects.shift();

                      if (!nextEffect) {
                        throw new Error(`no more effects left`);
                      }

                      if (nextEffect.type !== 'put') {
                        throw new Error(`Expected ${nextEffect.type} effect, but got put`);
                      }

                      reducerState = reducer(reducerState, message);
                    },
                    select: async (selector) => {
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
