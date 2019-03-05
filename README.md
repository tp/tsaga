# tsaga

A typesafe and lightweight way to write functions with asynchronous side-effects that are easily testable.

[![Build Status](https://travis-ci.org/tp/tsaga.svg?branch=master)](https://travis-ci.org/tp/tsaga)

## Examples

### Setting Up a Watcher

```ts
/**
 * Counts each user selection, if the user has been selected for at least 3 seconds
 * (uses cancellation if a new `userSelected` action is triggered while the current saga is still running)
 */
export const countUserSelection = forLatest(userSelected, async (
  $ /* fully typed environment */,
  payload /* action payload */,
) => {
  await $.call(sleep, 3000);

  const count = $.select(getCount);

  $.dispatch(setCount({ count: count + 1 }));
});
```

### Tests

> The boilerplate for creating test stubs will be reduced in the next version

When using [`redux-saga`](https://redux-saga.js.org) with TypeScript we were often having tests failing at runtime with errors that could already be detected at compile time if we had better typings for `redux-saga`/[`redux-saga-test-plan`](http://redux-saga-test-plan.jeremyfairbank.com). Failing test are still the best case scenario in this case, oftentimes though excess additional properties and the like were just silently being added to the state (and maybe even asserted on, in cases where message payload objects were stored directly into the state).

With the pure TypeScript approach taken by `tsaga`, test declarations are fully type-checked, so one can't pass an invalid action message or wrong state shapes.

It also checks that all side-effects are mocked, and then called exhaustively and in order (or calls unmocked functions).

```ts
return testSagaWithState(
  countUserSelection,
  userSelected({ id: 2 }),
  [calls(sleep).receiving(), selects(getCount).receiving(5)],
  undefined,
  userReducer,
  { count: 6, selectedUser: 2, usersById: {} },
);
```

We recomment using `nock.disableNetConnect()` to disallow HTTP calls and to further use [`nock`](https://github.com/nock/nock) to provide HTTP responses in tests (instead of stubbing API calling functions with dummy data).
