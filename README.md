# tsaga

A typesafe and lightweight way to write functions with asynchronous side-effects that are easily testable.

[![Build Status](https://travis-ci.org/tp/tsaga.svg?branch=master)](https://travis-ci.org/tp/tsaga)

## Examples

### Tests

> The boilerplate for creating test stubs will be reduced in the next version

When using `redux-saga` with TypeScript we were often having tests failing at runtime with errors that could already be detected at compile time if we had better typings for `redux-saga`/`redux-saga-test-plan`. Failing test are still the best case scenario in this case, oftentimes though excess additional properties and the like were just silently being added to the state (and maybe even asserted on, in cases where message payload objects were stored directly into the state).

With the pure TypeScript approach taken by `tsaga`, test declarations are not fully type-checked, so one can't pass an invalid action message or wrong state shapes.

```ts
test('redux-like saga with rollback', async () => {
  return expectSaga(updateCountMessageOrResetSaga)
    .withReducer(sampleCountReducer)
    .toHaveFinalState({ count: 2 })
    .whenRunWith(
      createReduxSagaLikeTestContext({
        stubs: [
          {
            function: window.fetch,
            params: [
              '/count',
              {
                method: 'POST',
                body: `5`,
              },
            ],
            result: new Error('API Failure'),
          },
        ],
        selectStubs: { count: 2 },
        puts: [
          {
            type: 'setCount',
            payload: { count: 5 },
          },
          {
            type: 'setCount',
            payload: { count: 2 },
          },
        ],
      }),
      { type: 'addToCount', payload: { plus: 3 } },
    );
});
```
