import { createStore, applyMiddleware } from 'redux';
import * as nock from 'nock';
import { createSagaMiddleware } from '../../lib';
import { userReducer } from '../reducers';
import { userSelected, setCount } from '../actions';
import { forLatest, AppEnv } from '../sagas';

nock.disableNetConnect();

test('error handler test', async () => {
  const waitForSaga = forLatest(userSelected, async ($, { id }) => {
    throw new Error(`err in saga`);
  });

  const handlerMock = jest.fn();

  const { middleware, sagaCompletion, setErrorHandler } = createSagaMiddleware([waitForSaga]);

  setErrorHandler(handlerMock);

  const store = createStore(userReducer, applyMiddleware(middleware));

  store.dispatch(userSelected({ id: 5 }));

  await sagaCompletion();

  expect(handlerMock.mock.calls).toEqual([[new Error(`err in saga`)]]);
});
