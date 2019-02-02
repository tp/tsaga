import { Action } from 'typescript-fsa';
import { isType, ActionCreator } from 'typescript-fsa';

import { CancellationToken } from './CancellationToken';
import { Environment } from './environment';
import { AnySaga, Saga, SagaMiddleware, SagaHandler } from './types';

export function createMiddleware<State, Actions extends Action<any>>(sagas: AnySaga[]): SagaMiddleware {
  const cancellationTokens = new Map<AnySaga, CancellationToken>();

  return {
    forEvery<Payload>(
      actionCreator: ActionCreator<Payload>,
      handler: SagaHandler<State, Actions, Payload>,
    ): Saga<State, Actions, Payload> {
      return {
        type: 'every',
        actionCreator,
        handler,
      };
    },

    forLatest<Payload>(
      actionCreator: ActionCreator<Payload>,
      handler: SagaHandler<State, Actions, Payload>,
    ): Saga<State, Actions, Payload> {
      return {
        type: 'latest',
        actionCreator,
        handler,
      };
    },

    middleware: (api) => (next) => (action) => {
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

          const env = new Environment(
            api,
            cancellationToken,
          );

          try {
            saga.handler(env, action.payload)
          } catch (error) {

          }
        }
      }
    },
  }
}
