import { createStore, applyMiddleware } from 'redux';
import * as nock from 'nock';
import { tsagaReduxMiddleware, waitFor } from '../../lib';
import {
  watchForUserSelectToLoad,
  watchForUserSelectorToCountIfNotChangedWithing3s,
  increaseCounter,
} from '../sagas/user-sagas';
import { userReducer } from '../reducers';
import { userSelected, setCount } from '../actions';
import { testSaga, calls } from '../../lib/testHelpers';
import { sleep } from '../app-library';
import { forLatest } from '../sagas';

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

test('Test helper with mocked call to sub saga', async () => {
  await testSaga(watchForUserSelectorToCountIfNotChangedWithing3s)
    .with(userSelected({ id: 2 })) // TODO: Should we provide an initial state (AppState) here? Then we wouldn't have to mock `select`s
    .which(calls(increaseCounter).receiving()) // TODO: Do we need an assertion for calls that are supposed to be made, but passed through / actually executed? Or maybe shouldn't `callEnv` be mocked (usually) because of the side-effects which can't be replicated here?
    .resultingInState({ count: 0, selectedUser: null, usersById: {} })
    .forReducer(userReducer); // Since we stub out increaseCounter to do nothing, no side-effect is called
});

test('Test helper with call not mocked', async () => {
  await testSaga(watchForUserSelectorToCountIfNotChangedWithing3s)
    .with(userSelected({ id: 5 }))
    .which(calls(sleep).receiving(Promise.resolve())) // TODO: Fix types such that this doesn't need to be provided
    .resultingInState({ count: 1, selectedUser: 5, usersById: {} })
    .forReducer(userReducer);
});
