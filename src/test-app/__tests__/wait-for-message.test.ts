// tslint:disable-next-line:no-implicit-dependencies (Just used in tests)
import * as nock from 'nock';
import { applyMiddleware, createStore } from 'redux';
import { createSagaMiddleware } from '../../lib';
import { setCount, userSelected } from '../actions';
import { userReducer } from '../reducers';
import { forLatest } from '../sagas';

nock.disableNetConnect();

test('waitFor functionality test', async () => {
  const waitForSaga = forLatest(
    userSelected,
    async ({ dispatch, select, run, take }, payload) => {
      console.error(`waitfor saga started`);

      const { count } = await take(setCount);

      dispatch(setCount({ count: count + 5 }));
    },
  );

  const { middleware, sagaCompletion } = createSagaMiddleware([waitForSaga]);

  const store = createStore(userReducer, applyMiddleware(middleware));

  store.dispatch(userSelected({ id: -1 })); // Just to trigger saga

  console.error(`about to dispatch set count`);

  store.dispatch(setCount({ count: 3 }));

  await sagaCompletion();

  const finalState = store.getState();

  expect(finalState.count).toEqual(8);
});
