import { MiddlewareAPI } from 'redux';
import { CancellationToken } from './CancellationToken';
import { SagaCancelledError } from './SagaCancelledError';
import TimeoutError from './TimeoutError';
import { SagaEnvironment, SagaMonitor, WaitForAction } from './types';

function sleep(timeout: number): Promise<'timeout'> {
  return new Promise((resolve) => {
    if (timeout > 0) {
      setTimeout(() => resolve('timeout'), timeout);
    }
  });
}

export function createSagaEnvironment<State>(
  store: MiddlewareAPI<any, State>,
  sagaId: number,
  childId: number,
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
          childId,
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
        // @ts-ignore
        monitor.onEffect({
          type: 'select',
          sagaId,
          selector,
          childId,
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
        // @ts-ignore
        monitor.onEffect({
          type: 'call',
          sagaId,
          childId,
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

      const currentChildId = childId;
      const newChildId = childId++;

      if (monitor) {
        // @ts-ignore
        monitor.onEffectStarted({
          type: 'run',
          sagaId,
          childId: currentChildId,
          ownChildId: newChildId,
          func,
          args,
        });
      }

      const value = func(
        createSagaEnvironment(store, sagaId, newChildId, waitForAction, cancellationToken, monitor),
        ...args,
      );

      if (monitor) {
        monitor.onEffectFinished({
          type: 'run',
          sagaId,
          childId: currentChildId,
          ownChildId: newChildId,
          value,
        });
      }

      return value;
    },

    async take(actionCreator, timeout = 0) {
      if (cancellationToken && cancellationToken.canceled) {
        throw new SagaCancelledError(`Saga has been cancelled`);
      }

      if (monitor) {
        // @ts-ignore
        monitor.onEffectStarted({
          type: 'take',
          sagaId,
          childId,
          actionCreator,
          timeout,
        });
      }

      const value = await Promise.race([waitForAction(actionCreator), sleep(timeout)]);

      if (value === 'timeout') {
        if (monitor) {
          monitor.onEffectFinished({
            type: 'take',
            result: 'timeout',
            sagaId,
            childId,
          });
        }

        throw new TimeoutError(actionCreator);
      }

      if (monitor) {
        // @ts-ignore
        monitor.onEffectFinished({
          type: 'take',
          result: 'result',
          sagaId,
          childId,
          action: value,
        });
      }

      return value.payload;
    },

    spawn(func, ...args) {
      if (cancellationToken && cancellationToken.canceled) {
        throw new SagaCancelledError(`Saga has been cancelled`);
      }

      const currentChildId = childId;
      const newChildId = childId++;

      if (monitor) {
        // @ts-ignore
        monitor.onEffectStarted({
          type: 'spawn',
          sagaId,
          childId: currentChildId,
          ownChildId: newChildId,
          func,
          args,
        });
      }

      const childCancellationToken = new CancellationToken();
      // TODO: There is currently no way of distinguishing here between effects for this env and the child env
      const childEnv = createSagaEnvironment(store, sagaId, newChildId, waitForAction, childCancellationToken, monitor);

      const task = {
        cancel: () => {
          if (monitor) {
            monitor.onEffectFinished({
              type: 'spawn',
              sagaId,
              childId: currentChildId,
              ownChildId: newChildId,
              result: 'cancelled',
            });
          }

          childCancellationToken.cancel();
        },
        result: func(childEnv, ...args),
      };

      if (monitor) {
        monitor.onEffectFinished({
          type: 'spawn',
          sagaId,
          childId: currentChildId,
          ownChildId: newChildId,
          result: 'completed',
          value: task.result,
        });
      }

      return task;
    },
  };

  return env;
}
