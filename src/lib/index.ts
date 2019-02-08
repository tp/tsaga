import { Middleware } from 'redux';
import { ActionCreator, isType } from 'typescript-fsa';
import { CancellationToken } from './CancellationToken';
import { createSagaEnvironment } from './environment';
import { SagaCancelledError } from './SagaCancelledError';

import {
  Saga,
  SagaEnvironment,
  AnySaga, WaitForAction,
} from './types';
export { testSagaWithState, calls, runs, selects } from './stateBasedTestHelper';

export {
  SagaEnvironment,
  Saga,
};

export function createTypedForEvery<State>(): <Payload>(
  actionCreator: ActionCreator<Payload>,
  saga: (env: SagaEnvironment<State>, action: Payload) => Promise<void>,
) => Saga<State, Payload> {
  return (actionCreator, saga) => {
    return {
      actionCreator,
      innerFunction: saga,
      type: 'every',
    };
  };
}

export function createTypedForLatest<State>(): <Payload>(
  actionCreator: ActionCreator<Payload>,
  saga: (env: SagaEnvironment<State>, action: Payload) => Promise<void>,
) => Saga<State, Payload> {
  return (actionCreator, saga) => {
    return {
      actionCreator,
      innerFunction: saga,
      type: 'latest',
    };
  };
}

export function tsagaReduxMiddleware(sagas: AnySaga[]) {
  // TODO: Remove completed sagas from this (currently leaks all results)
  const sagaPromises: any = [];
  const cancellationTokens = new Map<AnySaga, CancellationToken>();
  let awaitingMessages: { actionCreator: ActionCreator<any>; promiseResolve: (action: any) => void }[] = [];

  const waitForAction: WaitForAction = (actionCreator) => {
    return new Promise((resolve) => {
      awaitingMessages.push({ actionCreator: actionCreator, promiseResolve: resolve });
      console.error(`awaitingMessages`, awaitingMessages);
    });
  };

  const middleWare: Middleware = (api) => {
    return function next(next) {
      return function(action) {
        next(action);

        for (const config of awaitingMessages) {
          if (isType(action, config.actionCreator)) {
            config.promiseResolve(action);
          }
        }
        awaitingMessages = awaitingMessages.filter((config) => !isType(action, config.actionCreator));

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

            const context = createSagaEnvironment(
              api,
              waitForAction,
              cancellationToken,
            );
            // console.error(`action matches expected creator`, action, `running saga`);

            sagaPromises.push(
              saga
                .innerFunction(context, action.payload)
                .then((e) => 'completed')
                .catch((e) => {
                  if (e instanceof SagaCancelledError) {
                    return 'cancelled';
                  }

                  console.error(`Saga failed`, e);
                  return 'failed';
                }),
            );
          }
        }
      };
    };
  };

  // TODO: Add support to also await forks
  const sagaCompletion = async (): Promise<void> => {
    const promises = sagaPromises.slice(0);

    await Promise.all(promises);
  };

  return { middleware: middleWare, sagaCompletion };
}
