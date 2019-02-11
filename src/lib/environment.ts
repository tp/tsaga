import { MiddlewareAPI } from 'redux';
import { CancellationToken } from './CancellationToken';
import { SagaCancelledError } from './SagaCancelledError';
import { SagaEnvironment, WaitForAction, BoundEffect, FuncWithEnv } from './types';
import TimeoutError from './TimeoutError';

function sleep(timeout: number): Promise<'timeout'> {
  return new Promise(resolve => setTimeout(() => resolve('timeout'), timeout))
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

    call(f, ...params) {
      if (cancellationToken && cancellationToken.canceled) {
        throw new SagaCancelledError(`Saga has been cancelled`);
      }

      return f(...params);
    },

    run<Args extends any[], T>(
      effectOrEffectCreator: BoundEffect<SagaEnvironment<State>, Args, T> | FuncWithEnv<State, Args, T>,
      ...args: typeof effectOrEffectCreator extends BoundEffect<any, any, any> ? never : Args
    ): T {
      if (cancellationToken && cancellationToken.canceled) {
        throw new SagaCancelledError(`Saga has been cancelled`);
      }

      return effectOrEffectCreator instanceof BoundEffect
        ? effectOrEffectCreator.run(env, ...effectOrEffectCreator.args)
        : effectOrEffectCreator(env, ...args);
    },

    async take(actionCreator, timeout) {
      if (cancellationToken && cancellationToken.canceled) {
        throw new SagaCancelledError(`Saga has been cancelled`);
      }

      if (typeof timeout === 'number') {
        const value = await Promise.race([
          waitForAction(actionCreator),
          sleep(timeout),
        ]);

        if (value === 'timeout') {
          throw new TimeoutError(actionCreator);
        }

        return value.payload;
      }

      const action = await waitForAction(actionCreator);

      return action.payload;
    },

    spawn(effectOrEffectCreator, ...args) {
      if (cancellationToken && cancellationToken.canceled) {
        throw new SagaCancelledError(`Saga has been cancelled`);
      }

      const childCancellationToken = new CancellationToken();
      const childEnv = createSagaEnvironment(store, waitForAction, childCancellationToken);

      return {
        cancel: () => childCancellationToken.cancel(),
        result:
          effectOrEffectCreator instanceof BoundEffect
            ? effectOrEffectCreator.run(childEnv, ...effectOrEffectCreator.args)
            : effectOrEffectCreator(childEnv, ...args),
      };
    },
  };

  return env;
}
