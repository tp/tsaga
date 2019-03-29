import { MiddlewareAPI } from 'redux';
import { CancellationToken } from './CancellationToken';
import { SagaCancelledError } from './SagaCancelledError';
import TimeoutError from './TimeoutError';
import { SagaEnvironment, WaitForAction } from './types';

function sleep(timeout: number): Promise<'timeout'> {
  return new Promise((resolve) => setTimeout(() => resolve('timeout'), timeout));
}

export function createSagaEnvironment<State>(
  store: MiddlewareAPI<any, State>,
  waitForAction: WaitForAction,
  cancellationToken?: CancellationToken,
): SagaEnvironment<State> {
  const env: SagaEnvironment<State> = {
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

    call(func, ...args) {
      if (cancellationToken && cancellationToken.canceled) {
        throw new SagaCancelledError(`Saga has been cancelled`);
      }

      return func(...args);
    },

    run(func, ...args) {
      if (cancellationToken && cancellationToken.canceled) {
        throw new SagaCancelledError(`Saga has been cancelled`);
      }

      return func(env, ...args);
    },

    async take(actionCreator, timeout) {
      if (cancellationToken && cancellationToken.canceled) {
        throw new SagaCancelledError(`Saga has been cancelled`);
      }

      if (typeof timeout === 'number') {
        const value = await Promise.race([waitForAction(actionCreator), sleep(timeout)]);

        if (value === 'timeout') {
          throw new TimeoutError(actionCreator);
        }

        return value.payload;
      }

      const action = await waitForAction(actionCreator);

      return action.payload;
    },

    spawn(func, ...args) {
      if (cancellationToken && cancellationToken.canceled) {
        throw new SagaCancelledError(`Saga has been cancelled`);
      }

      const childCancellationToken = new CancellationToken();
      const childEnv = createSagaEnvironment(store, waitForAction, childCancellationToken);

      return {
        cancel: () => childCancellationToken.cancel(),
        result: func(childEnv, ...args),
      };
    },
  };

  return env;
}
