import { expectBoundFunction } from '../../lib/testing';
import { setCount } from '../actions';
import { userReducer } from '../reducers';
import { increaseCounter } from '../sagas/user-sagas';

test('Test that increase counter effect should work ', () => {
  return expectBoundFunction(increaseCounter)
    .withReducer(userReducer)
    .withMocks([])
    .whenCalledWith()
    .toDispatch(setCount({ count: 1 }))
    .toReturn(1)
    .toHaveFinalState({ count: 1, selectedUser: null, usersById: {} })
    .run();
});