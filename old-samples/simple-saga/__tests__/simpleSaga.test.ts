import { createTestContext } from '../../../lib';
import { loadDataAction, saga } from '../sample01';

test('simple saga test succes', async () => {
  const { ctx, isDone } = createTestContext({
    stubs: [
      {
        function: window.fetch,
        params: [`/api/user/5`],
        result: {
          json: () => Promise.resolve({ name: 'Bob' }),
        },
      },
    ],
  });

  const name = await saga(ctx, loadDataAction);

  expect(name).toBe('Bob');

  isDone();
});

test('simple saga test failure', async () => {
  const noConnectionError = new Error(`No connection`);
  const { ctx, isDone } = createTestContext({
    stubs: [
      {
        function: window.fetch,
        params: [`/api/user/5`],
        result: Promise.reject(noConnectionError),
      },
    ],
  });

  try {
    await saga(ctx, loadDataAction);
  } catch (e) {
    expect(e).toBe(noConnectionError);
    isDone();

    return;
  }

  // Should not be reached
  expect(true).toBe(false);
});
