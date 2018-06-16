import { ReduxLikeSagaContext } from '../../lib/redux-like';
import { TestContextConfiguration, call, TestContextResult } from '../../lib';
import { isEqual } from 'lodash';

export async function loadCurrentUser({ call, select, put }: ReduxLikeSagaContext, forceReload = false) {
  const currentUserId = await select('currentUser');

  const userLoaded = (await select(`user[${currentUserId}].id`)) === currentUserId;

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
  selectStubs: { [selector: string]: number | undefined };
  puts: any[];
  // TODO: Allow assertions on put
};

export function createReduxSagaLikeTestContext(config: ReduxLikeTestContextConfiguration): TestContextResult<ReduxLikeSagaContext> {
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

  const selectStub = async (selector: string): Promise<number> => {
    const value = config.selectStubs[selector];
    delete config.selectStubs[selector];

    if (value === undefined) {
      throw new Error(`select: No stub value for selector "${selector}"`);
    }

    return Promise.resolve(value);
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
