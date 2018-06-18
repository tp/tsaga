import { ReduxLikeSagaContext } from './redux-like';
import { TestContextResult } from '.';
import { promises } from 'fs';
import { isEqual } from 'lodash';

type MessageSaga<MessageType> = (ctx: ReduxLikeSagaContext, message: MessageType) => void;

type Reducer<ReducerStateType> = (previous: ReducerStateType, message: any) => ReducerStateType;

interface Step1<ReducerStateType, SagaMessageType> {
  withReducer<ReducerStateType>(reducer: Reducer<ReducerStateType>): Step2<ReducerStateType, SagaMessageType>;
}

type Step2<ReducerStateType, SagaMessageType> = {
  toHaveFinalState: (reducerState: ReducerStateType) => Step3<SagaMessageType>;
};

type Step3<SagaMessageType> = {
  whenRunWith: (ctx: TestContextResult<ReduxLikeSagaContext>, params: SagaMessageType) => Promise<void>;
};

export function expectSaga<ReducerStateType, SagaMessageType>(saga: MessageSaga<SagaMessageType>): Step1<ReducerStateType, SagaMessageType> {
  return {
    withReducer: (reducer) => {
      return {
        toHaveFinalState: (expectedFinalReducerState) => {
          return {
            whenRunWith: async (context, sagaMessage) => {
              const initialReducerState = reducer(undefined!, null);

              let reducerState = initialReducerState;

              const contextWithRedirectedPut = {
                ...context.ctx,
                put: async (x: any): Promise<void> => {
                  context.ctx.put(x); // tslint:disable-line:no-floating-promises // Fine here, we really want async behavior
                  reducerState = reducer(reducerState, x);
                },
              };

              await saga(contextWithRedirectedPut, sagaMessage);

              context.isDone();

              if (!isEqual(expectedFinalReducerState, reducerState)) {
                throw new Error(`Final state does not match expectations`);
              }
            },
          };
        },
      };
    },
  };
}
