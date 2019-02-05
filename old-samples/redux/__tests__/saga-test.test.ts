import { expectSaga, selectsFactory, calls } from '../tsaga-test-redux';
import { postString } from '../tsaga-redux';
import { createStore } from 'redux';
import { counter, stringLongerThanCountSelector } from '../counter-example';
import fetch, { Response } from 'node-fetch';

test('Saga test', async () => {
  const store = createStore(counter);
  const selects = selectsFactory(store);

  return expectSaga(postString)
    .withStore(store)
    .toHaveFinalState({ count: 0 })
    .afterIt([
      selects(stringLongerThanCountSelector, `sample`).receiving(true),
      calls(fetch, 'http://localhost/api/stringCollector', { method: 'POST', body: '' }).receiving(
        new Response(undefined, { status: 200 }),
      ),
    ])
    .whenRunWith('');
});
