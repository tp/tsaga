# tsaga

A typesafe and lightweight way to write functions with asynchronous side-effects that are easily testable.

[![Build Status](https://travis-ci.org/tp/tsaga.svg?branch=master)](https://travis-ci.org/tp/tsaga)

## Examples

### Tests

> The boilerplate for creating test stubs will be reduced in the next version

When using `redux-saga` with TypeScript we were often having tests failing at runtime with errors that could already be detected at compile time if we had better typings for `redux-saga`/`redux-saga-test-plan`. Failing test are still the best case scenario in this case, oftentimes though excess additional properties and the like were just silently being added to the state (and maybe even asserted on, in cases where message payload objects were stored directly into the state).

With the pure TypeScript approach taken by `tsaga`, test declarations are not fully type-checked, so one can't pass an invalid action message or wrong state shapes.

It also checks that all side-effects are mocked, and then called exhaustively and in order.

```ts
expectSaga(updateCountMessageOrResetSaga)
  .withReducer(sampleCountReducer)
  .toHaveFinalState({ count: 5 })
  .afterIt([
    selects('count').receiving(2),
    puts({
      type: 'setCount',
      payload: { count: 5 },
    }),
    calls(fetch, '/api/counter', { method: 'POST', body: '5' }).receiving(
      new Response('OK', { status: 200 }),
    ),
  ])
  .whenRunWith({ type: 'addToCount', payload: { plus: 3 } });
```
