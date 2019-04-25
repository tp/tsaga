import { isType } from 'typescript-fsa';
import { CancellationToken } from './CancellationToken';
import { createSagaEnvironment } from './environment';
import { SagaCancelledError } from './SagaCancelledError';
import { AnySaga, AwaitingAction, ErrorHandler, MiddlewareOptions, SagaMiddleware, WaitForAction } from './types';

export function createSagaMiddleware<State>(sagas: AnySaga[], options: MiddlewareOptions<State> = {}): SagaMiddleware {
  const runningSagas = new Map<number, Promise<any>>();
  const cancellationTokens = new Map<AnySaga, CancellationToken>();
  let id = 0;
  let awaitingActions: AwaitingAction[] = [];
  let errorHandler: ErrorHandler | undefined;

  const waitForAction: WaitForAction = (actionCreator) => {
    return new Promise((resolve) => {
      awaitingActions.push({ actionCreator, resolve });
    });
  };

  return {
    middleware: (api) => (next) => (action) => {
      next(action);

      awaitingActions = awaitingActions.filter((awaitingAction) => {
        if (isType(action, awaitingAction.actionCreator)) {
          awaitingAction.resolve(action);

          return false;
        }

        return true;
      });

      for (const saga of sagas) {
        if (isType(action, saga.actionCreator)) {
          let cancellationToken;
          if (saga.type === 'latest') {
            const runningSagaCancellationToken = cancellationTokens.get(saga);
            if (runningSagaCancellationToken) {
              runningSagaCancellationToken.cancel();
            }

            cancellationToken = new CancellationToken();
            cancellationTokens.set(saga, cancellationToken);
          }

          const sagaId = id++;
          let childId = 0;

          const getChildId = () => childId;
          const incrementChildId = () => {
            childId++;
          };

          const env = createSagaEnvironment(api, sagaId, {
            get: getChildId,
            increment: incrementChildId,
          }, waitForAction, cancellationToken, options.monitor);

          if (options.monitor) {
            options.monitor.onSagaStarted({
              sagaId,
              action,
            });
          }

          runningSagas.set(
            sagaId,
            saga
              .handler(env, action.payload)
              .then(() => {
                if (options.monitor) {
                  options.monitor.onSagaFinished({
                    type: 'completed',
                    sagaId,
                    action,
                  });
                }

                runningSagas.delete(sagaId);

                return 'completed';
              })
              .catch((e) => {
                runningSagas.delete(sagaId);

                if (e instanceof SagaCancelledError) {
                  if (options.monitor) {
                    options.monitor.onSagaFinished({
                      type: 'cancelled',
                      sagaId,
                      action,
                    });
                  }

                  return 'cancelled';
                } else {
                  if (options.monitor) {
                    options.monitor.onSagaFinished({
                      type: 'failed',
                      sagaId,
                      action,
                      error: e,
                    });
                  }

                  if (errorHandler) {
                    try {
                      errorHandler(e, action);
                    } catch (e) {
                      console.error('Error when calling errorHandler', e);
                    }
                  } else {
                    console.error('Saga finish with error', e);
                  }

                  return 'failed';
                }
              }),
          );
        }
      }
    },

    async sagaCompletion() {
      // TODO: Add support to also await forks
      // For this we would also need to add forks to this map and have a unique id for them.
      await Promise.all(runningSagas.values());
    },

    setErrorHandler(newHandler) {
      errorHandler = newHandler;
    },
  };
}
