import { Store, Middleware } from 'redux';
import actionCreatorFactory, { isType, ActionCreator, Action as FSAAction } from 'typescript-fsa';
import { Action } from './types';
import { Environment } from './environment';
import { CancellationToken } from './CancellationToken';
import { SagaCancelledError } from './SagaCancelledError';

type Saga<StateT, ActionT extends Action, Payload> = {
  actionCreator: ActionCreator<Payload>;
  saga: (ctx: Environment<StateT, ActionT>, action: FSAAction<Payload>) => Promise<void>;
  type: 'every' | 'latest';
};

export function createTypedForEvery<StateT, ActionT extends Action>(): (<Payload>(
  actionCreator: ActionCreator<Payload>,
  saga: (ctx: Environment<StateT, ActionT>, action: FSAAction<Payload>) => Promise<void>,
) => Saga<StateT, ActionT, Payload>) {
  return (actionCreator, saga) => {
    return {
      actionCreator,
      saga,
      type: 'every',
    };
  };
}

export function createTypedForLatest<StateT, ActionT extends Action>(): (<Payload>(
  actionCreator: ActionCreator<Payload>,
  saga: (ctx: Environment<StateT, ActionT>, action: FSAAction<Payload>) => Promise<void>,
) => Saga<StateT, ActionT, Payload>) {
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

  const middleWare: Middleware = (api) => {
    return function next(next) {
      return function(action) {
        console.error(`action`, action, `state`, api.getState());

        next(action);

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
              api as any /* subscribe is missing, but that's fine for now */,
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
