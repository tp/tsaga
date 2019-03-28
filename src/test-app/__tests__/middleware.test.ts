// tslint:disable-next-line:no-implicit-dependencies (Just used in tests)
import * as nock from 'nock';
import { applyMiddleware, createStore } from 'redux';
import { createSagaMiddleware } from '../../lib';
import { userSelected } from '../actions';
import { userReducer } from '../reducers';
import {
  watchForUserSelectorToCountIfNotChangedWithing3s,
  watchForUserSelectToLoad,
} from '../sagas/user-sagas';

nock.disableNetConnect();

test('Load user (usage example; no mocks)', async () => {
  const { middleware, sagaCompletion } = createSagaMiddleware([
    watchForUserSelectToLoad,
  ]);

  const store = createStore(userReducer, applyMiddleware(middleware));

  store.dispatch(userSelected({ id: 5 }));

  await sagaCompletion();

  const finalState = store.getState();

  expect(finalState.usersById[5]).toBeTruthy();
});

test('Inrease count (usage example; no mocks)', async () => {
  const { middleware, sagaCompletion } = createSagaMiddleware([
    watchForUserSelectorToCountIfNotChangedWithing3s,
  ]);

  const store = createStore(userReducer, applyMiddleware(middleware));

  store.dispatch(userSelected({ id: 1 }));
  store.dispatch(userSelected({ id: 2 }));

  await sagaCompletion();

  console.error(`sagas completed`);

  const finalState = store.getState();

  expect(finalState.count).toEqual(1);
});
