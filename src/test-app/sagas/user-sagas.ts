import { forEvery, forLatest, AppEnv } from '../sagas';
import { userSelected, userLoaded, setCount } from '../actions';
import { getSelectedUserId, getUserById, getCount } from '../selectors';
import { loadUser, sleep } from '../app-library';
import { BoundEffect, SagaEnvironment } from '../../lib';
import { AppState } from '../types';
// import { withEnv } from '../../lib/environment';

/**
 * consumer
 *
 *
 */

// saga, no typing needed as they are provided by the forEvery.
// But then the question becomes, when is the forEvery being bound?
// Would the reader monad pattern be better suitable? Would require type annotations on the saga (as it's not yet connected to any particular store)?
// Also can we better match the message type to the `action` parameter, such that they are always in sync and type safe?
export const watchForUserSelectToLoad = forLatest(userSelected, async ($, { id }) => {
  //   console.log(`load user ${action.payload.id} if needed`);

  const currentUserId = $.select(getSelectedUserId); // Could of course use the action here, but wanting to test selector with different cardinatlities
  if (currentUserId !== id) {
    throw new Error(
      `State does not match expectation based on action \,
        currentUserId = ${currentUserId} \n
        action.payload.id = ${id}`,
    );
  }

  const user = $.select(getUserById, id);
  if (!user) {
    // console.error(`loading user`);
    const user = await $.call(loadUser, id);
    $.dispatch(userLoaded({ user }));
  } else {
    console.log(`not loading user, already present`);
  }
});

//   export const watchForUserSelectLatest = forLatest(userSelected, watchForUserSelect.saga);
//

export const increaseCounter = ($: AppEnv, num: number): void => {
  const count = $.select(getCount);
  console.error(`about to set new count:`, count + 1);

  $.dispatch(setCount({ count: count + 1 }));
  // console.error(`count set`, select(getCount));
};

class ApiCall extends BoundEffect<AppState, [number], number> {
  run(env: SagaEnvironment<AppState>, num: number) {
    return 5;
  }
}

export const watchForUserSelectorToCountIfNotChangedWithing3s = forLatest(userSelected, async ($, payload) => {
  // console.error(env);

  console.error(`about to sleep`);

  await $.call(sleep, 3000);

  console.error(`sleep done`);

  await $.run(increaseCounter,87);

  await $.spawn(new ApiCall(9));
});

export const watchForUserSelectorToCountImmediately = forEvery(
  userSelected,
  watchForUserSelectorToCountIfNotChangedWithing3s.innerFunction,
);
