import { createStore, applyMiddleware } from 'redux';
import * as nock from 'nock';
import { tsagaReduxMiddleware, waitFor } from '../../lib';
import { watchForUserSelectToLoad, watchForUserSelectorToCountIfNotChangedWithing3s } from '../sagas/user-sagas';
import { userReducer } from '../reducers';
import { userSelected } from '../actions';

nock.disableNetConnect();

test('Load user (usage example; no mocks)', async () => {
  const { middleware, sagaCompletion } = tsagaReduxMiddleware([watchForUserSelectToLoad]);

  const store = createStore(userReducer, applyMiddleware(middleware));

  store.dispatch(userSelected({ id: 5 }));

  await sagaCompletion();

  const finalState = store.getState();

  expect(finalState.usersById[5]).toBeTruthy();
});

test('Inrease count (usage example; no mocks)', async () => {
  const { middleware, sagaCompletion } = tsagaReduxMiddleware([watchForUserSelectorToCountIfNotChangedWithing3s]);

  const store = createStore(userReducer, applyMiddleware(middleware));

  store.dispatch(userSelected({ id: 1 }));
  store.dispatch(userSelected({ id: 2 }));

  await sagaCompletion();

  console.error(`sagas completed`);

  const finalState = store.getState();

  expect(finalState.count).toEqual(1);
});
