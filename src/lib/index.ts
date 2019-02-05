import { Middleware } from 'redux';
import { Action as FSAAction, ActionCreator, isType } from 'typescript-fsa';
import { CancellationToken } from './CancellationToken';
import { Environment } from './environment';
import { SagaCancelledError } from './SagaCancelledError';
import { Action } from './types';

export { Task } from './environment';
export { Action } from './types';
export { Environment };
export { testSaga, runs, selects, forks, spawns } from './testHelpers';
export { testSagaWithState } from './stateBasedTestHelper';

export interface Saga<StateT, ActionT extends Action, Payload> {
  actionCreator: ActionCreator<Payload>;
  saga: (ctx: Environment<StateT, ActionT>, action: FSAAction<Payload>) => Promise<void>;
  type: 'every' | 'latest';
}

export function createTypedForEvery<StateT, ActionT extends Action>(): <Payload>(
  actionCreator: ActionCreator<Payload>,
  saga: (ctx: Environment<StateT, ActionT>, action: FSAAction<Payload>) => Promise<void>,
) => Saga<StateT, ActionT, Payload> {
  return (actionCreator, saga) => {
    return {
      actionCreator,
      saga,
      type: 'every',
    };
  };
}

export function createTypedForLatest<StateT, ActionT extends Action>(): <Payload>(
  actionCreator: ActionCreator<Payload>,
  saga: (ctx: Environment<StateT, ActionT>, action: FSAAction<Payload>) => Promise<void>,
) => Saga<StateT, ActionT, Payload> {
  return (actionCreator, saga) => {
    return {
      actionCreator,
      saga,
      type: 'latest',
    };
  };
}

export type AnySaga = Saga<any, any, any>;

export function tsagaReduxMiddleware(sagas: AnySaga[]) {
  // TODO: Remove completed sagas from this (currently leaks all results)
  const sagaPromises: any = [];
  const cancellationTokens = new Map<AnySaga, CancellationToken>();
  let awaitingMessages: { actionCreator: ActionCreator<any>; promiseResolve: (action: any) => void }[] = [];

  function waitForMessage<Payload>(actionCreator: ActionCreator<Payload>): Promise<FSAAction<Payload>> {
    console.error(`waitForMessage called`);

    return new Promise((resolve, reject) => {
      awaitingMessages.push({ actionCreator: actionCreator, promiseResolve: resolve });
      console.error(`awaitingMessages`, awaitingMessages);
    });
  }

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

            const context = new Environment(
              api as any /* TODO: subscribe is missing, but that's fine for now */,
              waitForMessage,
              cancellationToken,
            );
            // console.error(`action matches expected creator`, action, `running saga`);

            sagaPromises.push(
              saga
                .saga(context, action)
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

  const sagaCompletion = async (): Promise<void> => {
    const promises = sagaPromises.slice(0);

    const res = await Promise.all(promises);
    console.error(`res`, res);
  };

  return { middleware: middleWare, sagaCompletion };
}
