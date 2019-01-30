import { forEvery, forLatest, OmsEnv } from '../sagas';
import { userSelected, userLoaded, setCount } from '../actions';
import { getSelectedUserId, getUserById, getCount } from '../selectors';
import { loadUser, sleep } from '../app-library';
import { call } from '../../../lib';

/**
 * consumer
 *
 *
 */

// saga, no typing needed as they are provided by the forEvery.
// But then the question becomes, when is the forEvery being bound?
// Would the reader monad pattern be better suitable? Would require type annotations on the saga (as it's not yet connected to any particular store)?
// Also can we better match the message type to the `action` parameter, such that they are always in sync and type safe?
export const watchForUserSelectToLoad = forLatest(userSelected, async ({ call, put, select }, action) => {
  //   console.log(`load user ${action.payload.id} if needed`);

  const currentUserId = select(getSelectedUserId); // Could of course use the action here, but wanting to test selector with different cardinatlities
  if (currentUserId !== action.payload.id) {
    throw new Error(
      `State does not match expectation based on action \,
        currentUserId = ${currentUserId} \n
        action.payload.id = ${action.payload.id}`,
    );
  }

  const user = select(getUserById, action.payload.id);
  if (!user) {
    // console.error(`loading user`);
    const user = await call(loadUser, action.payload.id);
    put(userLoaded({ user }));
  } else {
    console.log(`not loading user, already present`);
  }
});

//   export const watchForUserSelectLatest = forLatest(userSelected, watchForUserSelect.saga);
//

export function increaseCounter(env: OmsEnv) {
  const count = env.select(getCount);
  console.error(`about to set new count:`, count + 1);

  env.put(setCount({ count: count + 1 }));
  console.error(`count set`, env.select(getCount));
}

export const watchForUserSelectorToCountIfNotChangedWithing3s = forLatest(userSelected, async (env, action) => {
  const { call, callEnv, select, put } = env;

  console.error(env);

  console.error(`about to sleep`);

  await call(sleep, 3000);

  console.error(`sleep done`);

  await callEnv(increaseCounter);
});

export const watchForUserSelectorToCountImmediately = forEvery(
  userSelected,
  watchForUserSelectorToCountIfNotChangedWithing3s.saga,
);
