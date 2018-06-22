import { createStore } from 'redux';
import fetch, { Response } from 'node-fetch';
import { selectsFactory, expectSaga, calls } from '../samples/redux/tsaga-test-redux';
import { counter, stringLongerThanCountSelector } from '../samples/redux/counter-example';
import { postString } from '../samples/redux/tsaga-redux';

test('Saga test', async () => {
  const store = createStore(counter);
  const selects = selectsFactory(store);

  return expectSaga(postString)
    .withStore(store)
    .toHaveFinalState({ count: 0 })
    .afterIt([
      selects(stringLongerThanCountSelector, `sample`).receiving(5 /* should be `boolean` */),
      calls(fetch, undefined /* should be `string` */, { method: 'POST', body: '' }).receiving(
        new Response(undefined, { status: 200 }),
      ),
      calls(fetch, '', { method: 'POST', body: '' }).receiving(404 /* should be `Response` */),
    ])
    .whenRunWith(true /* should be `string` */);
});
