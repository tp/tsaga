import { SagaContext, createTestContext } from '../../lib';
import { pureContext as ctx } from '../../lib';

export const loadDataAction = {
  type: 'load-data',
  id: 5,
};

export async function saga(
  { call }: SagaContext,
  action: typeof loadDataAction,
) {
  const result = await call(window.fetch, `/api/user/${action.id}`);

  return (await result.json()).name;
}

export async function executeSaga() {
  await saga(ctx, loadDataAction);
}
