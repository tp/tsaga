import { MiddlewareAPI } from 'redux';
import { CancellationToken } from './CancellationToken';
import { SagaCancelledError } from './SagaCancelledError';
import TimeoutError from './TimeoutError';
import { SagaEnvironment, SagaMonitor, WaitForAction } from './types';

function sleep(timeout: number): Promise<'timeout'> {
  return new Promise((resolve) => setTimeout(() => resolve('timeout'), timeout));
}

export function createSagaEnvironment<State>(
  store: MiddlewareAPI<any, State>,
  sagaId: number,
  waitForAction: WaitForAction,
  cancellationToken?: CancellationToken,
  monitor?: SagaMonitor<State>,
): SagaEnvironment<State> {
  const env: SagaEnvironment<State> = {
    dispatch(action) {
      const beforeState = store.getState();

      if (cancellationToken && cancellationToken.canceled) {
        throw new SagaCancelledError(`Saga has been cancelled`);
      }

      store.dispatch(action);

      if (monitor) {
        monitor.onEffect({
          type: 'dispatch',
          sagaId,
          action,
          beforeState,
          afterState: store.getState(),
        });
      }
    },

    select(selector, ...args) {
      if (cancellationToken && cancellationToken.canceled) {
        throw new SagaCancelledError(`Saga has been cancelled`);
      }

      const state = store.getState();
      const value = selector(state, ...args);

      if (monitor) {
        monitor.onEffect({
          type: 'select',
          sagaId,
          selector,
          args,
          value,
          state,
        });
      }

      return value;
    },

    call(func, ...args) {
      if (cancellationToken && cancellationToken.canceled) {
        throw new SagaCancelledError(`Saga has been cancelled`);
      }

      const value = func(...args);

      if (monitor) {
        monitor.onEffect({
          type: 'call',
          sagaId,
          func,
          args,
          value,
        });
      }

      return value;
    },

    run(func, ...args) {
      if (cancellationToken && cancellationToken.canceled) {
        throw new SagaCancelledError(`Saga has been cancelled`);
      }

      const value = func(env, ...args);

      if (monitor) {
        monitor.onEffect({
          type: 'run',
          sagaId,
          func,
          args,
          value,
        });
      }
      return value;
    },

    async take(actionCreator, timeout) {
      if (cancellationToken && cancellationToken.canceled) {
        throw new SagaCancelledError(`Saga has been cancelled`);
      }

      if (monitor) {
        monitor.onEffect({
          type: 'take',
          sagaId,
          actionCreator,
          timeout,
        });
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
      // TODO: There is currently no way of distinguishing here between effects for this env and the child env
      const childEnv = createSagaEnvironment(store, sagaId, waitForAction, childCancellationToken, monitor);

      const task = {
        cancel: () => childCancellationToken.cancel(),
        result: func(childEnv, ...args),
      };

      if (monitor) {
        monitor.onEffect({
          type: 'spawn',
          sagaId,
          args,
          func,
          value: task,
        });
      }

      return task;
    },
  };

  return env;
}
