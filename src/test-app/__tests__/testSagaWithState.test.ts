// tslint:disable-next-line:no-implicit-dependencies (Just used in tests)
import * as nock from 'nock';
import { expectSaga } from '../../lib';
import { select } from '../../lib/testing/mocks';
import { setCount, userSelected } from '../actions';
import { sleep } from '../app-library';
import { userReducer } from '../reducers';
import { watchForUserSelectorToCountIfNotChangedWithing3s } from '../sagas/user-sagas';
import { getCount } from '../selectors';

nock.disableNetConnect();

test('Test helper with mocked sleep call', () => {
  return expectSaga(watchForUserSelectorToCountIfNotChangedWithing3s)
    .withReducer(userReducer)
    .toCall(sleep, 3000)
    .dispatch(userSelected({ id: 2 }))
    .toHaveFinalState({ count: 1, selectedUser: 2, usersById: {} })
    .run();
});

test('Test helper with mocked select', async () => {
  return expectSaga(watchForUserSelectorToCountIfNotChangedWithing3s)
    .withReducer(userReducer)
    .withMocks([select(getCount, 5)])
    .toCall(sleep, 3000)
    .dispatch(userSelected({ id: 2 }))
    .toHaveFinalState({ count: 6, selectedUser: 2, usersById: {} })
    .run();
});

test('Test helper asserting on message', async () => {
  return expectSaga(watchForUserSelectorToCountIfNotChangedWithing3s)
    .withReducer(userReducer)
    .withMocks([select(getCount, 5)])
    .toCall(sleep, 3000)
    .toDispatch(setCount({ count: 6 }))
    .dispatch(userSelected({ id: 2 }))
    .toHaveFinalState({ count: 6, selectedUser: 2, usersById: {} })
    .run();
});

test("Test helper asserting on message, fails of message doesn't match", async () => {
  try {
    await expectSaga(watchForUserSelectorToCountIfNotChangedWithing3s)
      .withReducer(userReducer)
      .toCall(sleep, 3000)
      .toDispatch(setCount({ count: 9999 }))
      .dispatch(userSelected({ id: 2 }))
      .toHaveFinalState({ count: 6, selectedUser: 2, usersById: {} })
      .run();
  } catch (e) {
    return;
  }

  fail('Should error before');
});
