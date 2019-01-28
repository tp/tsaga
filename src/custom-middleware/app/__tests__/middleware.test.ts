import { createStore, applyMiddleware } from 'redux';
import * as nock from 'nock';
import { tsagaReduxMiddleware } from '../../lib';
import {
  watchForUserSelectToLoad,
  watchForUserSelectorToCountIfNotChangedWithing3s,
  increaseCounter,
} from '../sagas/user-sagas';
import { userReducer } from '../reducers';
import { userSelected } from '../actions';
import { testSaga, calls } from '../../lib/testHelpers';

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

test('Test helper with mocked call', async () => {
  await testSaga(watchForUserSelectorToCountIfNotChangedWithing3s)
    .with(userSelected({ id: 2 })) // TODO: Should we provide an initial state (AppState) here? Then we wouldn't have to mock `select`s
    .which(calls(increaseCounter).receiving()) // TODO: Do we need an assertion for calls that are supposed to be made, but passed through / actually executed? Or maybe shouldn't `callEnv` be mocked (usually) because of the side-effects which can't be replicated here?
    .resultingInState({ count: 0, selectedUser: null, usersById: {} })
    .forReducer(userReducer); // Since we stub out increaseCounter to do nothing, no side-effect is called
});
