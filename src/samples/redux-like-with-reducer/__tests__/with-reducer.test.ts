import { expectSaga } from '../../../lib/reducer-test-utils';
import { updateCountMessageOrResetSaga, sampleCountReducer, AddToCount, CountReducerState } from '../saga-with-reducer';
import { createReduxSagaLikeTestContext } from '../../redux-like-saga';

test('redux-like saga with reducer succes', async () => {
  // 🎉 All parameters are type-checked, so it's not possible to pass invalid messages or states for comparison

  return expectSaga(updateCountMessageOrResetSaga)
    .withReducer(sampleCountReducer)
    .toHaveFinalState({ count: 5 })
    .whenRunWith(
      createReduxSagaLikeTestContext({
        stubs: [
          {
            function: window.fetch,
            params: [
              '/count',
              {
                method: 'POST',
                body: `5`,
              },
            ],
            result: undefined,
          },
        ],
        selectStubs: { count: 2 },
        puts: [
          {
            // optimistic and final update
            type: 'setCount',
            payload: { count: 5 },
          },
        ],
      }),
      { type: 'addToCount', payload: { plus: 3 } },
    );
});

test('redux-like saga with rollback', async () => {
  return expectSaga(updateCountMessageOrResetSaga)
    .withReducer(sampleCountReducer)
    .toHaveFinalState({ count: 2 })
    .whenRunWith(
      createReduxSagaLikeTestContext({
        stubs: [
          {
            function: window.fetch,
            params: [
              '/count',
              {
                method: 'POST',
                body: `5`,
              },
            ],
            result: new Error('API Failure'),
          },
        ],
        selectStubs: { count: 2 },
        puts: [
          {
            type: 'setCount',
            payload: { count: 5 },
          },
          {
            type: 'setCount',
            payload: { count: 2 },
          },
        ],
      }),
      { type: 'addToCount', payload: { plus: 3 } },
    );
});
