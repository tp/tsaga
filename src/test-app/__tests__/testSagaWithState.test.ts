import * as nock from 'nock';
import { watchForUserSelectorToCountIfNotChangedWithing3s } from '../sagas/user-sagas';
import { userReducer } from '../reducers';

import { sleep } from '../app-library';
import { getCount } from '../selectors';
import { testSagaWithState, calls, selects } from '../../lib';

nock.disableNetConnect();

test('Test helper with mocked sleep call', async () => {
  return testSagaWithState(
    watchForUserSelectorToCountIfNotChangedWithing3s,
    { id: 2 },
    [calls(sleep).receiving()],
    undefined,
    userReducer,
    { count: 1, selectedUser: null, usersById: {} },
  );
});

test('Test helper with mocked select', async () => {
  return testSagaWithState(
    watchForUserSelectorToCountIfNotChangedWithing3s,
    { id: 2 },
    [calls(sleep).receiving(), selects(getCount).receiving(5)],
    undefined,
    userReducer,
    { count: 6, selectedUser: null, usersById: {} },
  );
});
