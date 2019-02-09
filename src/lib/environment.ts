import { MiddlewareAPI } from 'redux';
import { CancellationToken } from './CancellationToken';
import { SagaCancelledError } from './SagaCancelledError';
import { SagaEnvironment, WaitForAction, Effect, Task } from './types';
import { isBoundEffect } from './utils';

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

    call(f, ...args) {
      if (cancellationToken && cancellationToken.canceled) {
        throw new SagaCancelledError(`Saga has been cancelled`);
      }

      return f(...args);
    },

    run<Args extends any[], ReturnType>(
      effect: Effect<State, Args, ReturnType>,
      ...args: Args
    ): ReturnType {
      if (cancellationToken && cancellationToken.canceled) {
        throw new SagaCancelledError(`Saga has been cancelled`);
      }

      if (isBoundEffect(effect)) {
        return effect.run(env, ...effect.args);
      }

      return effect(env, ...args);
    },

    async take(actionCreator) {
      if (cancellationToken && cancellationToken.canceled) {
        throw new SagaCancelledError(`Saga has been cancelled`);
      }

      const action = await waitForAction(actionCreator);

      return action.payload;
    },

    spawn<Args extends any[], ReturnType>(
      effect: Effect<State, Args, ReturnType>,
      ...args: Args
    ): Task<ReturnType> {
      if (cancellationToken && cancellationToken.canceled) {
        throw new SagaCancelledError(`Saga has been cancelled`);
      }

      const childCancellationToken = new CancellationToken();
      const childEnv = createSagaEnvironment(store, waitForAction, childCancellationToken);

      return {
        cancel: () => childCancellationToken.cancel(),
        result:
          isBoundEffect(effect)
            ? effect.run(childEnv, ...effect.args)
            : effect(childEnv, ...args),
      };
    },
  };

  return env;
}
