import { createStore, combineReducers, applyMiddleware } from 'redux';
import * as nock from 'nock';
import { tsagaReduxMiddleware, AnySaga } from '../../lib';
import { Selector } from 'reselect';
import { Environment } from '../../lib/environment';
import { watchForUserSelectToLoad, watchForUserSelectorToCount, increaseCounter } from '../user-sagas';
import { userReducer } from '../reducers';
import { userSelected } from '../actions';
import { increaseSelectedUserAfter3s } from '../../../bottom-up';

nock.disableNetConnect();

test('Bottom up sample', async () => {
  const { middleware, sagaCompletion } = tsagaReduxMiddleware([watchForUserSelectToLoad]);

  const store = createStore(userReducer, applyMiddleware(middleware));

  store.dispatch(userSelected({ id: 5 }));

  await sagaCompletion();

  const finalState = store.getState();

  expect(finalState.usersById[5]).toBeTruthy();
});

test('Bottom up sample (latest)', async () => {
  const { middleware, sagaCompletion } = tsagaReduxMiddleware([watchForUserSelectorToCount]);

  const store = createStore(userReducer, applyMiddleware(middleware));

  store.dispatch(userSelected({ id: 1 }));
  store.dispatch(userSelected({ id: 2 }));

  await sagaCompletion();

  console.error(`sagas completed`);

  const finalState = store.getState();

  expect(finalState.count).toEqual(1);
});

test('Bottom up sample (latest)', async () => {
  return testSaga(watchForUserSelectorToCount)
    .with(userSelected({ id: 2 }))
    .which(calls(increaseCounter).receiving())
    .resultingInState({});
});

test('Bottom up sample (latest)', async () => {
  const { middleware, sagaCompletion } = tsagaReduxMiddleware([watchForUserSelectorToCount]);

  const store = createStore(userReducer, applyMiddleware(middleware));

  store.dispatch(userSelected({ id: 1 }));
  store.dispatch(userSelected({ id: 2 }));

  await sagaCompletion();

  console.error(`sagas completed`);

  const finalState = store.getState();

  expect(finalState.count).toEqual(1);
});

// type SilentAssertion = {
//   type: 'dispatch',

// }

// TODO: Should call provide the env implictly if the target function desires it?
// A function without `env` should have no side effect and can just be called directly

function calls<T extends (...args: any[]) => any>(f: T): ValueMockBuilder<ReturnType<T>> {
  return {
    receiving: (value): ValueMock<ReturnType<T>> => {
      return {
        type: 'call',
        func: f,
        value,
      };
    },
  };
}

function selects<T extends (...args: any[]) => any>(f: T): ValueMockBuilder<ReturnType<T>> {
  return {
    receiving: (value): ValueMock<ReturnType<T>> => {
      return {
        type: 'call',
        func: f,
        value,
      };
    },
  };
}

type ValueMockBuilder<T> = {
  receiving: (value: T) => ValueMock<T>;
};

type ValueMock<T> = {
  type: 'select' | 'call';
  func: Function;
  value: T;
};

interface SagaTest1 {
  with: (action: any) => SagaTest2;
}

interface SagaTest2 {
  which: (...effects: any[]) => { resultingInState: (state: any) => Promise<void> };
}

interface SagaEnv<StateT, ActionT> {
  call: <T extends (...args: any[]) => any>(f: T) => ReturnType<T>;
  select: <R>(s: Selector<StateT, R>) => R;
  dispatch: (action: ActionT) => void;
}

function testSaga(saga: AnySaga): SagaTest1 {
  return {
    with: (action) => {
      return {
        which: (...effects): { resultingInState: (state: any) => Promise<void> } => {
          effects = effects.slice(0);

          const testContext: Environment<any, any> = {
            call: (f: any) => {
              return 0 as any;
            },
            select: () => {
              return 0 as any;
            },
            dispatch: (action: any) => {
              console.log(action);
            },
          } as any;

          return {
            // TODO: run Add run to execute without final state check?
            resultingInState: async () => {
              await saga.saga(testContext, action);
            },
          };
        },
      };
    },
  };
}
