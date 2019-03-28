import { isType } from 'typescript-fsa';
import { CancellationToken } from './CancellationToken';
import { createSagaEnvironment } from './environment';
import { SagaCancelledError } from './SagaCancelledError';
import { AnySaga, AwaitingAction, ErrorHandler, SagaEnvironmentCreator, SagaMiddleware, WaitForAction } from './types';

export function createSagaMiddleware(
  sagas: AnySaga[],
  sagaEnvCreator: SagaEnvironmentCreator = createSagaEnvironment,
): SagaMiddleware {
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
          const env = sagaEnvCreator(api, waitForAction, cancellationToken);

          runningSagas.set(
            sagaId,
            saga
              .innerFunction(env, action.payload)
              .then(() => {
                runningSagas.delete(sagaId);

                return 'completed';
              })
              .catch((e) => {
                runningSagas.delete(sagaId);

                if (e instanceof SagaCancelledError) {
                  return 'cancelled';
                } else {
                  if (errorHandler) {
                    try {
                      errorHandler(e);
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
