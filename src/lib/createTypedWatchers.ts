import { ActionCreator } from 'typescript-fsa';
import { Saga, SagaEnvironment } from './types';

export function createTypedForEvery<State>(): <Payload>(
  actionCreator: ActionCreator<Payload>,
  saga: (env: SagaEnvironment<State>, action: Payload) => Promise<void>,
) => Saga<State, Payload> {
  return (actionCreator, saga) => {
    return {
      actionCreator,
      innerFunction: saga,
      type: 'every',
    };
  };
}

export function createTypedForLatest<State>(): <Payload>(
  actionCreator: ActionCreator<Payload>,
  saga: (env: SagaEnvironment<State>, action: Payload) => Promise<void>,
) => Saga<State, Payload> {
  return (actionCreator, saga) => {
    return {
      actionCreator,
      innerFunction: saga,
      type: 'latest',
    };
  };
}
