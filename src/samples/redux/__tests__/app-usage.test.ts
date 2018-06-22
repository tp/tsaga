import { postString, createReduxContext } from '../tsaga-redux';
import { createStore } from 'redux';
import { counter } from '../counter-example';

test('Saga usage with sample redux setup', async () => {
  /**
   * Tests the real application usage of Redux + tsaga
   *
   * The error (`catch`) is triggered by the `select` working successfully,
   * but then `window.fetch` being not defined in the node environment
   *
   * TODO: Use `nock` or similar in order to let the saga complete successfully
   */
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
    // `postString` fails as `window.fetch` is not defined in the node context
    expect(e.message).toEqual(expect.stringContaining(`function to be called is undefined`));

    return;
  }

  expect(true).toBe(false); // should not be reached; tried saga should've failed
});
