import { postString, createReduxContext } from '../tsaga-redux';
import { createStore } from 'redux';
import { counter } from '../counter-example';
import * as nock from 'nock';

test('Saga usage with sample redux setup', async () => {
  /**
   * Tests the real application usage of Redux + tsaga
   *
   *  Uses `nock` to mock the HTTP response in order let the saga complete successfully
   */
  const store = createStore(counter);

  const ctx = createReduxContext(store);

  // The first few should not do the call and hence succeed
  await postString(ctx, '');

  store.dispatch({ type: 'INCREMENT' });
  store.dispatch({ type: 'INCREMENT' });

  // won't do anything, as string.length === count
  await postString(ctx, 'ab');

  nock('http://localhost')
    .post('/api/stringCollector')
    .reply(200, 'collected');

  // this will now post and receive the above mocked response
  await postString(ctx, 'abc');
});
