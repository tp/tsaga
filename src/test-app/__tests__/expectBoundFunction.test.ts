import { expectBoundFunction } from '../../lib';
import { setCount } from '../actions';
import { userReducer } from '../reducers';
import { increaseCounter } from '../sagas/user-sagas';

test('Test helper with mocked sleep call', () => {
  return expectBoundFunction(increaseCounter)
    .withReducer(userReducer)
    .toDispatch(setCount({ count: 1 }))
    .call()
    .toReturn(1)
    .toHaveFinalState({ count: 1, selectedUser: null, usersById: {} })
    .run();
}, 500 /* something below the 3s sleep */);
