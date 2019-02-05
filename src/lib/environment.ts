import { MiddlewareAPI } from 'redux';
import { CancellationToken } from './CancellationToken';
import { SagaCancelledError } from './SagaCancelledError';
import { SagaEnvironment, WaitForAction } from './types';

export function createSagaEnvironment<State>(
  store: MiddlewareAPI<any, State>,
  waitForAction: WaitForAction,
  cancellationToken?: CancellationToken,
): SagaEnvironment<State> {
  return {
    dispatch(action) {
      if (cancellationToken && cancellationToken.canceled) {
        throw new SagaCancelledError(`Saga has been cancelled`);
      }

      store.dispatch(action);
    },

    select(selector, ...args) {
      if (cancellationToken && cancellationToken.canceled) {
        throw new SagaCancelledError(`Saga has been cancelled`);
      }

      return selector(store.getState(), ...args);
    },

    run(f, ...params) {
      if (cancellationToken && cancellationToken.canceled) {
        throw new SagaCancelledError(`Saga has been cancelled`);
      }

      return f(...params);
    },

    spawn(f, ...args) {
      return f(this, ...args);
    },

    async take(actionCreator) {
      if (cancellationToken && cancellationToken.canceled) {
        throw new SagaCancelledError(`Saga has been cancelled`);
      }

      const action = await waitForAction(actionCreator);

      return action.payload;
    },

    fork(f, ...args) {
      if (cancellationToken && cancellationToken.canceled) {
        throw new SagaCancelledError(`Saga has been cancelled`);
      }

      const childCancellationToken = new CancellationToken();
      const childEnv = createSagaEnvironment(store, waitForAction, childCancellationToken);

      return {
        cancel: () => childCancellationToken.cancel(),
        result: f(childEnv, ...args),
      };
    }
  };
}

