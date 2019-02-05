import { ReduxLikeSagaContext } from '../../lib/redux-like';
import { TestContextConfiguration, call, TestContextResult } from '../../lib';
import { isEqual } from 'lodash';

type User = { id: number };

type AppState = {
  currentUser: number;
  users: { [key: number]: User | undefined };
};

export const getCurrentUserId = (state: AppState) => state.currentUser;

export const getUserWithId = (state: AppState, id: number) => state.users[id] && state.users[id]!.id;

export async function loadCurrentUser({ call, select, put }: ReduxLikeSagaContext, forceReload = false) {
  const currentUserId: number = await select(getCurrentUserId);

  const userLoaded = (await select(getUserWithId, currentUserId)) === currentUserId;

  if (!userLoaded || forceReload) {
    try {
      const result = await call(window.fetch, `/api/user/${currentUserId}`);

      await put({
        type: 'userLoaded',
        payload: await result.json(),
      });
    } catch (e) {
      await put({
        type: 'userLoadFailed',
        payload: { userId: currentUserId },
      });
    }
  }
}

type ReduxLikeTestContextConfiguration = TestContextConfiguration & {
  selectStubs: { selector: any; value: any }[];
  puts: any[];
  // TODO: Allow assertions on put
};

export function createReduxSagaLikeTestContext(
  config: ReduxLikeTestContextConfiguration,
): TestContextResult<ReduxLikeSagaContext> {
  // TODO: Import stub call from base implementation
  const stubCall: typeof call = async (f: any, ...args: any[]): Promise<any> => {
    const nextStub = config.stubs.shift();

    if (!nextStub) {
      throw new Error(`No more stubs available`);
    } else if (nextStub.function !== f) {
      throw new Error(`Other function than expected called`);
    }

    if (!isEqual(args, nextStub.params)) {
      throw new Error(`Function parameters differ`); // TODO: Include helpful diff
    }

    // TODO: Not ideal, maybe someone wants to pass Error instances in the success result
    if (nextStub.result instanceof Error) {
      return Promise.reject(nextStub.result);
    } else {
      return Promise.resolve(nextStub.result);
    }
  };

  const putStub = async (message: any): Promise<void> => {
    // TODO: Remove any
    const nextExpectedPut = config.puts.shift();

    if (!nextExpectedPut) {
      throw new Error(`put: No more stubs available`);
    }

    if (!isEqual(message, nextExpectedPut)) {
      throw new Error(`put action differs from expectation`); // TODO: Include helpful diff
    }

    return Promise.resolve();
  };

  const selectStub = <T>(selector: (...args: any[]) => T, ...args: any[]): T => {
    const stubIndex = config.selectStubs.findIndex((stub) => stub.selector === selector);
    if (stubIndex < 0) {
      throw new Error(`select: No stub value for selector "${selector}"`);
    }

    const stub = config.selectStubs.splice(stubIndex, 1)[0];

    return stub.value;
  };

  return {
    ctx: {
      call: stubCall,
      put: putStub,
      select: selectStub,
    },
    isDone: () => {
      if (config.stubs.length !== 0) {
        throw new Error(`Unused \`call\` stubs left`);
      }

      if (Object.keys(config.selectStubs).length !== 0) {
        throw new Error(`Unused \`select\` stubs left`);
      }

      if (config.puts.length !== 0) {
        throw new Error(`Unused \`put\` stubs left`);
      }
    },
  };
}
