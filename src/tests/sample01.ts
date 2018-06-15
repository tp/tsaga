import { SagaContext, createTestContext } from "../lib";
import { pureContext as ctx } from "../lib"

const loadDataAction = {
  type: 'load-data',
  id: 5
}

async function saga({ call }: SagaContext, action: typeof loadDataAction) {
  const result = await call(window.fetch, `/api/user/${action.id}`)

  return (await result.json()).name;
}

export async function executeSaga() {
  await saga(ctx, loadDataAction)
}

export async function testSaga() {
  const { ctx, isDone } = createTestContext({
    stubs: [
      {
        function: window.fetch,
        params: [`/api/user/5`],
        result: {
          json: () => {
            Promise.resolve({ name: "Bob" })
          }
        }
      }]
  });

  const name = await saga(ctx, loadDataAction);
  // TODO: assert on `name`
  console.error(`Name = "${name}"`);

  isDone();
}
