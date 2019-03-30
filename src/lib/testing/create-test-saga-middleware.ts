import { isType } from 'typescript-fsa';
import { AnySaga, SagaMiddleware } from '../types';
import { Asserts } from './index';
import { Mocks } from './mocks';
import { createTestEnvironment } from './create-test-env';

export function createTestSagaMiddleware<State>(
  sagas: AnySaga[],
  asserts: Asserts<State>,
  mocks: Mocks<State>,
): SagaMiddleware {
  const runningSagas = new Map<number, Promise<any>>();
  let id = 0;

  return {
    middleware: (api) => (next) => (action) => {
      next(action);

      for (const saga of sagas) {
        if (isType(action, saga.actionCreator)) {
          const sagaId = id++;
          const env = createTestEnvironment(mocks, asserts)(api);

          runningSagas.set(sagaId, saga.handler(env, action.payload).catch((e) => {
            // console.log(e.stack);
            // e.stack = new Error().stack;
            // Error.captureStackTrace(e);
            throw e;
          }));
        }
      }
    },

    async sagaCompletion() {
      // TODO: Add support to also await forks
      // For this we would also need to add forks to this map and have a unique id for them.
      await Promise.all(runningSagas.values());
    },

    setErrorHandler(newHandler) {
      return;
    },
  };
}
