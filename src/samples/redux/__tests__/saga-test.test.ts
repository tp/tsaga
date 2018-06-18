import { expectSaga, selectsFactory, calls } from '../tsaga-test-redux';
import { postString } from '../tsaga-redux';
import { createStore } from 'redux';
import { counter, stringLongerThanCountSelector } from '../counter-example';

test('Saga test', async () => {
  const store = createStore(counter);
  const selects = selectsFactory(store);

  const foo = selects(stringLongerThanCountSelector, `sample`);
  const bar = expectSaga(store, postString);

  return expectSaga(store, postString)
    .withStore()
    .toHaveFinalState({ count: 0 })
    .afterIt([selects(stringLongerThanCountSelector, `sample`).receiving(true), calls(window.fetch).receiving(200)])
    .whenRunWith('');
});
