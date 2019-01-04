import { createStore, combineReducers, applyMiddleware } from 'redux';
import * as nock from 'nock';
import {
  userReducer,
  watchForUserSelect,
  tsagaReduxMiddleware,
  userSelected,
  watchForUserSelectLatest,
  increaseSelectedUserAfter3s,
} from '../';

nock.disableNetConnect();

test('Bottom up sample', async () => {
  const { middleware, sagaCompletion } = tsagaReduxMiddleware(watchForUserSelect);

  const store = createStore(userReducer, applyMiddleware(middleware));

  store.dispatch(userSelected({ id: 5 }));

  await sagaCompletion();

  const finalState = store.getState();

  expect(finalState.usersById[5]).toBeTruthy();
});

test('Bottom up sample (latest)', async () => {
  const { middleware, sagaCompletion } = tsagaReduxMiddleware(increaseSelectedUserAfter3s);

  const store = createStore(userReducer, applyMiddleware(middleware));

  store.dispatch(userSelected({ id: 1 }));
  store.dispatch(userSelected({ id: 2 }));

  await sagaCompletion();

  console.error(`sagas completed`);

  const finalState = store.getState();

  expect(finalState.count).toEqual(1);
});
