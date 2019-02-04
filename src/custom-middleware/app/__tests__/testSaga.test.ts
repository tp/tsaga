import * as nock from 'nock';
import { watchForUserSelectorToCountIfNotChangedWithing3s, increaseCounter } from '../sagas/user-sagas';
import { userSelected } from '../actions';
import { userReducer } from '../reducers';
import { testSaga, runs } from '../../lib/testHelpers';
import { sleep } from '../app-library';

nock.disableNetConnect();

test('Test helper with mocked call to sub saga', async () => {
  const mock = runs(increaseCounter);
  // .receiving('1');

  await testSaga(watchForUserSelectorToCountIfNotChangedWithing3s)
    .with(userSelected({ id: 2 })) // TODO: Should we provide an initial state (AppState) here? Then we wouldn't have to mock `select`s
    .which(runs(increaseCounter).receiving('1')) // TODO: Do we need an assertion for calls that are supposed to be made, but passed through / actually executed? Or maybe shouldn't `callEnv` be mocked (usually) because of the side-effects which can't be replicated here?
    .resultingInState({ count: 0, selectedUser: null, usersById: {} })
    .forReducer(userReducer); // Since we stub out increaseCounter to do nothing, no side-effect is called
});

test('Test helper with call not mocked', async () => {
  await testSaga(watchForUserSelectorToCountIfNotChangedWithing3s)
    .with(userSelected({ id: 5 }))
    .which(runs(sleep).receiving(Promise.resolve())) // TODO: Fix types such that this doesn't need to be provided
    .resultingInState({ count: 1, selectedUser: 5, usersById: {} })
    .forReducer(userReducer);
});
