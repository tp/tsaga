import { createTestContext } from '../../../lib';
import { loadDataAction, saga } from '../sample01';

test('simple saga test', async () => {
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
