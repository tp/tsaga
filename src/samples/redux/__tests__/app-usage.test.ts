import { postString, createReduxContext } from '../tsaga-redux';
import { createStore } from 'redux';
import { counter } from '../counter-example';

test('Saga usage with sample redux setup', async () => {
  const store = createStore(counter);

  const ctx = createReduxContext(store);

  // The first few should not do the call and hence succeed
  await postString(ctx, '');

  store.dispatch({ type: 'INCREMENT' });
  store.dispatch({ type: 'INCREMENT' });

  await postString(ctx, 'ab');

  try {
    await postString(ctx, 'abc');
  } catch (e) {
    return;
  }

  expect(true).toBe(false); // should not be reached; tried saga should've failed
});
