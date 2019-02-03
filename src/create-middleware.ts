import { isType } from 'typescript-fsa';

import { CancellationToken } from './CancellationToken';
import { Environment } from './environment';
import { AnySaga, SagaMiddleware } from './types';

export function createMiddleware<State>(sagas: AnySaga[]): SagaMiddleware<State> {
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

          const env = new Environment(api, cancellationToken);
          const index = counter++;
          const promise = saga.handler(env, action.payload);

          sagaPromises.set(index, promise);

          promise.finally(() => {
            sagaPromises.delete(index);
          });
        }
      }
    },
  }
}
