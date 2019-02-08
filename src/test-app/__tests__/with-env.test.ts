import { createStore, applyMiddleware } from 'redux';
import * as nock from 'nock';
import { tsagaReduxMiddleware } from '../../lib';
import { userReducer } from '../reducers';
import { userSelected, setCount } from '../actions';
import { forLatest, AppEnv } from '../sagas';
// import { withEnv } from '../../lib/environment';

nock.disableNetConnect();

test('waitFor functionality test', async () => {
  const subSaga = ($: AppEnv, newCount: number) => {
    $.dispatch(setCount({ count: newCount }));
  };

  const waitForSaga = forLatest(userSelected, async ($, { id }) => {
    await $.run(subSaga, id * 3);
  });

  const { middleware, sagaCompletion } = tsagaReduxMiddleware([waitForSaga]);

  const store = createStore(userReducer, applyMiddleware(middleware));

  store.dispatch(userSelected({ id: 5 }));

  await sagaCompletion();

  const finalState = store.getState();

  expect(finalState.count).toEqual(15);
});
