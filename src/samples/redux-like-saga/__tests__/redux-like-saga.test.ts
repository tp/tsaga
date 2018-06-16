import { loadCurrentUser, createReduxSagaLikeTestContext } from '..';

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
    selectStubs: {
      currentUser: 5,
      'user[5].id': -1, // TODO: 🤨
    },
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
    selectStubs: {
      currentUser: 5,
      'user[5].id': 5,
    },
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
    selectStubs: {
      currentUser: 5,
      'user[5].id': 5,
    },
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
