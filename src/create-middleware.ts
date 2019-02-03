import { isType } from 'typescript-fsa';

import { CancellationToken } from './CancellationToken';
import { createSagaEnvironment } from './create-environment';
import { AnySaga, SagaMiddleware, SagaMiddlewareOptions } from './types';

export function createMiddleware<State>(
  sagas: AnySaga[],
  options: SagaMiddlewareOptions,
): SagaMiddleware<State> {
  const cancellationTokens = new Map<AnySaga, CancellationToken>();
  const sagaPromises = new Map<number, Promise<void>>();
  let counter = 0;

  return {
    forEvery(actionCreator, handler) {
      return {
        type: 'every',
        actionCreator,
        handler,
      };
    },

    forLatest(actionCreator, handler) {
      return {
        type: 'latest',
        actionCreator,
        handler,
      };
    },

    async sagaCompletion() {
      await Promise.all(sagaPromises.values());
    },

    middleware: api => next => action => {
      next(action);

      for (const saga of sagas) {
        if (isType(action, saga.actionCreator)) {
          if (saga.type === 'latest') {
            const runningSagaCancellationToken = cancellationTokens.get(saga);

            if (runningSagaCancellationToken) {
              runningSagaCancellationToken.cancel();
            }
          }

          const cancellationToken = new CancellationToken();
          cancellationTokens.set(saga, cancellationToken);

          const env = createSagaEnvironment<State>(api, cancellationToken);
          const index = counter++;
          const promise = saga.handler(env, action.payload);

          sagaPromises.set(index, promise);

          promise
            .catch(error => options.onError(error))
            .finally(() => {
              sagaPromises.delete(index);
            });
        }
      }
    },
  };
}
