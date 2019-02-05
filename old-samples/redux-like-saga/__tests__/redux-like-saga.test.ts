import { loadCurrentUser, createReduxSagaLikeTestContext, getCurrentUserId, getUserWithId } from '..';

test('redux-saga like test: User not yet loaded', async () => {
  const { ctx, isDone } = createReduxSagaLikeTestContext({
    stubs: [
      {
        function: window.fetch,
        params: [`/api/user/5`],
        result: {
          json: () => Promise.resolve({ name: 'Bob' }),
        },
      },
    ],

    selectStubs: [
      { selector: getCurrentUserId, value: 5 },
      {
        selector: getUserWithId,
        value: -1, // TODO: 🤨
      },
    ],
    puts: [
      {
        type: 'userLoaded',
        payload: { name: 'Bob' },
      },
    ],
  });

  await loadCurrentUser(ctx);

  isDone();
});

test('redux-saga like test: User already loaded', async () => {
  const { ctx, isDone } = createReduxSagaLikeTestContext({
    stubs: [],
    selectStubs: [
      { selector: getCurrentUserId, value: 5 },
      {
        selector: getUserWithId,
        value: 5,
      },
    ],
    puts: [],
  });

  await loadCurrentUser(ctx);

  isDone();
});

test('redux-saga like test: User load failure with forced reload', async () => {
  const { ctx, isDone } = createReduxSagaLikeTestContext({
    stubs: [
      {
        function: window.fetch,
        params: [`/api/user/5`],
        result: {
          json: () => Promise.reject(new Error(`Invalid JSON response`)),
        },
      },
    ],
    selectStubs: [
      { selector: getCurrentUserId, value: 5 },
      {
        selector: getUserWithId,
        value: 5,
      },
    ],
    puts: [
      {
        type: 'userLoadFailed',
        payload: { userId: 5 },
      },
    ],
  });

  await loadCurrentUser(ctx, true);

  isDone();
});
