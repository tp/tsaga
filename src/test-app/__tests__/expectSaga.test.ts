// tslint:disable-next-line:no-implicit-dependencies (Just used in tests)
import * as nock from 'nock';
import { call, expectSaga, select } from '../../lib/testing';
import { setCount, userSelected } from '../actions';
import { sleep } from '../app-library';
import { userReducer } from '../reducers';
import { watchForUserSelectorToCountIfNotChangedWithing3s } from '../sagas/user-sagas';
import { getCount } from '../selectors';

nock.disableNetConnect();

test('Test helper with mocked sleep call', () => {
  return expectSaga(watchForUserSelectorToCountIfNotChangedWithing3s)
    .withReducer(userReducer)
    .andMocks([call(sleep, Promise.resolve())])
    .whenDispatched(userSelected({ id: 2 }))
    .toCall(sleep, 3000)
    .toHaveFinalState({ count: 1, selectedUser: 2, usersById: {} })
    .run();
}, 500 /* something below the 3s sleep */);

test('Test helper with mocked select', async () => {
  return expectSaga(watchForUserSelectorToCountIfNotChangedWithing3s)
    .withReducer(userReducer)
    .andMocks([call(sleep, Promise.resolve()), select(getCount, 5)])
    .whenDispatched(userSelected({ id: 2 }))
    .toCall(sleep, 3000)
    .toHaveFinalState({ count: 6, selectedUser: 2, usersById: {} })
    .run();
}, 500 /* something below the 3s sleep */);

test('Test helper asserting on message', async () => {
  return expectSaga(watchForUserSelectorToCountIfNotChangedWithing3s)
    .withReducer(userReducer)
    .andMocks([call(sleep, Promise.resolve()), select(getCount, 5)])
    .whenDispatched(userSelected({ id: 2 }))
    .toCall(sleep, 3000)
    .toDispatch(setCount({ count: 6 }))
    .toHaveFinalState({ count: 6, selectedUser: 2, usersById: {} })
    .run();
}, 500 /* something below the 3s sleep */);

test("Test helper asserting on message, fails of message doesn't match", async () => {
  try {
    await expectSaga(watchForUserSelectorToCountIfNotChangedWithing3s)
      .withReducer(userReducer)
      .andMocks([call(sleep, Promise.resolve())])
      .whenDispatched(userSelected({ id: 2 }))
      .toCall(sleep, 3000)
      .toDispatch(setCount({ count: 9999 }))
      .toHaveFinalState({ count: 6, selectedUser: 2, usersById: {} })
      .run();
  } catch (e) {
    expect(e.message.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, ''))
      .toMatchInlineSnapshot(`
      "expect(received).toEqual(expected) // deep equality

      - Expected
      + Received

        Object {
          \\"payload\\": Object {
      -     \\"count\\": 9999,
      +     \\"count\\": 1,
          },
          \\"type\\": \\"User/set_count\\",
        }"
    `);

    return;
  }

  fail('Should error before');
}, 500 /* something below the 3s sleep */);
