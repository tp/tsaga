## Testing

`tsaga` comes with its testing utilities.

The utilities are similar to `redux-saga-test-plan` and modeled after how a saga would run in your application.

### Sagas

The assertions use the `expect` function from the `jest` testing framework.

```typescript
import { expectSaga, select, call, run, spawn } from 'tsaga';

it('should run a saga', () => {
  return (
    expectSaga(watchForFetchUser)
      // Setup a store with a reducer and an optional initial state
      // This is optional
      .withReducer(rootReducer, undefined)
      // Setup some mocks which should be used instead of the real functions
      // The mock helper functions provide useful type assertions,
      // so that you return a value which is valid
      // This is optional
      .withMocks([
        // A select mock, the second argument is the return value when this mock is used
        select(getUserById, { id: 5 }),
        // A call mock, the second argument is the return value when this mock is used
        call(fetchUserApi, { id: 5 }),
        // A spawn mock, the second argument is the return value when this mock is used
        spawn(trackUser),
        // A run mock, the second argument is the return value when this mock is used
        run(loginUser),
      ])
      // These are the expectations for the saga
      // Expect the saga to call a function
      // The arguments afterwards are what will be passed to the function
      .toCall(fetchUserApi, 5, { all: true })
      // Expect the saga to spawn a child bound function
      .toSpawn(trackUser)
      // Expect the saga to run a function
      .toRun(loginUser, { id: 5 })
      // Expect the saga to dispatch an action
      .toDispatch(storeUser({ id: 5 }))
      // Start the saga with the action
      .dispatch(fetchUser(5))
      // Do some assertions on the state
      .toHaveFinalState()
      // Start the whole saga and do the assertions
      // You can provide a timeout as the first argument here for the saga to fail if it takes too long
      // The default timeout is 10 seconds
      .run()
  );
});
```

#### Mocks

There are `select`, `call`, `run` and `spawn` mock helpers to easily setup mocks and have some type inference.
These should only be used inside the tests and not in the actual saga code.

```typescript
import { select, call, run, spawn } from 'tsaga';
```

The test will also fail if you have unused mocks.
This is an expected behavior so that the tests are always up to date with the source code and to keep the mocks as small as possible.

#### Assertions

The test will fail when there are assertions still left, but the saga has already finished.

You also don't need to assert every single effect, you can easily skip an effect, but at the end of your test, every assertion needs to be used in the order you provided.

Stack traces will show the location in the source code where the assertion failed.
They will also show what is expected and what was received.

##### Sub environments

When you `run` or `spawn` a bound function, we will only forward the mocks to the child env.
The child env will not use assertions as this can make tests hard to understand and assertions should only concern the saga which is currently tested.

##### Take assertions

Whenever you have a `take` in your saga, you will need to assert it to supply the right action which is returned to the saga.
If you don't, the test will fail as there is no way to continue the saga without it.

We are working on a solution for also triggering a timeout for a `take`.

#### Assert on the final state

Assertions on the final state are only possible when you provide a reducer.

Only the provided top-level properties of the expected states are checked.
This allows you to test individual sub states without providing your full state.

Example

```typescript
// If our state looks like this:
interface State {
  user: { id: number };
  basket: { total: number };
}

import { expectSaga } from 'tsaga';

// In our saga test, we only want to check the basket state
// We only need to provide on the first level our expected basket state
// The user state will be skipped in the assertion
// The basket state needs to match the expected basket state completely though
it('should assert on the final state', () => {
  return expectSaga(watchForFetchBasket)
    .withReducer(rootReducer)
    .dispatch(fetchBasket())
    .toHaveFinalState({ basket: { total: 0 } })
    .run();
});

it("should fail on the final state because reduction doesn't exist on the actual state", () => {
  return (
    expectSaga(watchForFetchBasket)
      .withReducer(rootReducer)
      .dispatch(fetchBasket())
      // This test would fail as there is an additional property on the expected state which isn't in the actual state
      .toHaveFinalState({ basket: { total: 0, reduction: 0 } })
      .run()
  );
});

it('should fail on the final state when a property is missing', () => {
  return (
    expectSaga(watchForFetchBasket)
      .withReducer(rootReducer)
      .dispatch(fetchBasket())
      // This test would fail because we are missing the total property
      .toHaveFinalState({ basket: {} })
      .run()
  );
});
```
