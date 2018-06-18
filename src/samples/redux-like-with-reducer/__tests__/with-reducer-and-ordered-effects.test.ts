import { expectSaga, selects, calls, puts } from '../../../lib/reducer-ordered-effect-test-utils';
import { updateCountMessageOrResetSaga, sampleCountReducer, AddToCount, CountReducerState } from '../saga-with-reducer';

test('redux-like saga with reducer succes and effect order', async () => {
  return expectSaga(updateCountMessageOrResetSaga)
    .withReducer(sampleCountReducer)
    .toHaveFinalState({ count: 5 })
    .afterIt([
      selects('count').receiving(2),
      puts({
        type: 'setCount',
        payload: { count: 5 },
      }),
      calls(window.fetch).receiving(200),
    ])
    .whenRunWith({ type: 'addToCount', payload: { plus: 3 } });
});
