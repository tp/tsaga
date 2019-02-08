import * as nock from 'nock';
import { watchForUserSelectorToCountIfNotChangedWithing3s } from '../sagas/user-sagas';
import { userReducer } from '../reducers';
import { sleep } from '../app-library';
import { getCount } from '../selectors';
import { testSagaWithState, calls, selects } from '../../lib';
import { userSelected } from '../actions';

nock.disableNetConnect();

test('Test helper with mocked sleep call', async () => {
  return testSagaWithState(
    watchForUserSelectorToCountIfNotChangedWithing3s,
    userSelected({ id: 2 }),
    [calls(sleep).receiving()],
    undefined,
    userReducer,
    { count: 1, selectedUser: 2, usersById: {} },
  );
});

test('Test helper with mocked select', async () => {
  return testSagaWithState(
    watchForUserSelectorToCountIfNotChangedWithing3s,
    userSelected({ id: 2 }),
    [calls(sleep).receiving(), selects(getCount).receiving(5)],
    undefined,
    userReducer,
    { count: 6, selectedUser: 2, usersById: {} },
  );
});
