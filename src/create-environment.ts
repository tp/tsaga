import { MiddlewareAPI, Dispatch } from 'redux';
import { AnyAction } from 'typescript-fsa';
import { CancellationToken } from './CancellationToken';
import { SagaCancelledError } from './errors/SagaCancelledError';
import { SagaEnvironment } from './types';

function createSagaEnvironment<State>(
  store: MiddlewareAPI<Dispatch<AnyAction>, State>,
  cancellationToken: CancellationToken,
): SagaEnvironment<State> {
  return {
    dispatch(action) {
      if (cancellationToken.isCanceled()) {
        throw new SagaCancelledError(`Saga has been cancelled`);
      }

      store.dispatch(action);
    },

    async call(f, ...args) {
      if (cancellationToken.isCanceled()) {
        throw new SagaCancelledError(`Saga has been cancelled`);
      }

      return f(...args);
    },

    select(selector, ...args) {
      if (cancellationToken.isCanceled()) {
        throw new SagaCancelledError(`Saga has been cancelled`);
      }

      return selector(store.getState(), ...args);
    },
  };
}

export { createSagaEnvironment };
