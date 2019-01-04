import { createStore, combineReducers, applyMiddleware } from 'redux';
import * as nock from 'nock';
import { userReducer, watchForUserSelect, tsagaReduxMiddleware, userSelected } from '../';

nock.disableNetConnect();

test('Bottom up sample', async () => {
  const { middleware, sagaCompletion } = tsagaReduxMiddleware(watchForUserSelect);

  const store = createStore(userReducer, applyMiddleware(middleware));

  store.dispatch(userSelected({ id: 5 }));

  await sagaCompletion();
  //   console.error(`Sagas completed`);

  const finalState = store.getState();

  expect(finalState.usersById[5]).toBeTruthy();
});
