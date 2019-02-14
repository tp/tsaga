// tslint:disable-next-line:no-implicit-dependencies (Just used in tests)
import * as nock from 'nock';
import { applyMiddleware, createStore } from 'redux';
import { createSagaMiddleware } from '../../lib';
import { setCount, userSelected } from '../actions';
import { userReducer } from '../reducers';
import { AppEnv, forLatest } from '../sagas';

nock.disableNetConnect();

test('waitFor functionality test', async () => {
  const subSaga = ($: AppEnv, newCount: number) => {
    $.dispatch(setCount({ count: newCount }));
  };

  const waitForSaga = forLatest(userSelected, async ($, { id }) => {
    await $.run(subSaga, id * 3);
  });

  const { middleware, sagaCompletion } = createSagaMiddleware([waitForSaga]);

  const store = createStore(userReducer, applyMiddleware(middleware));

  store.dispatch(userSelected({ id: 5 }));

  await sagaCompletion();

  const finalState = store.getState();

  expect(finalState.count).toEqual(15);
});
