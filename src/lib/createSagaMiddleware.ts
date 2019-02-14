import { ActionCreator, isType } from 'typescript-fsa';
import { CancellationToken } from './CancellationToken';
import { createSagaEnvironment } from './environment';
import { SagaCancelledError } from './SagaCancelledError';
import {
  Saga,
  SagaEnvironment,
  AnySaga,
  WaitForAction,
  BoundEffect,
  Task,
  SagaMiddleware,
  AwaitingAction,
} from './types';

export function createSagaMiddleware(sagas: AnySaga[]): SagaMiddleware {
  const runningSagas = new Map<number, Promise<any>>();
  const cancellationTokens = new Map<AnySaga, CancellationToken>();
  let id = 0;
  let awaitingActions: AwaitingAction[] = [];

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
          const env = createSagaEnvironment(api, waitForAction, cancellationToken);

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

                return e instanceof SagaCancelledError ? 'cancelled' : 'failed';
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
  };
}
