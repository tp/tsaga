import { deepStrictEqual } from 'assert';
import { MiddlewareAPI } from 'redux';
import { isType } from 'typescript-fsa';
import { SagaEnvironment } from '../types';
import { Asserts } from './index';
import { CallMock, getMocks, Mocks, RunMock, SelectMock, SpawnMock } from './mocks';

export function createTestEnvironment<State>(mocks: Mocks<State>, asserts: Asserts<State>) {
  const selectMocks = getMocks<State, SelectMock<State, any>>(mocks, 'select');
  const callMocks = getMocks<State, CallMock<any>>(mocks, 'call');
  const runMocks = getMocks<State, RunMock<State, any>>(mocks, 'run');
  const spawnMocks = getMocks<State, SpawnMock<State, any>>(mocks, 'spawn');

  return (store: MiddlewareAPI<any, State>) => {
    const env: SagaEnvironment<State> = {
      dispatch(action) {
        const assert = asserts[0];

        if (assert && assert.type === 'dispatch' && action.type === assert.action.type) {
          asserts.shift();
          deepStrictEqual(action, assert && assert.action);
        }

        return store.dispatch(action);
      },

      select(selector, ...args) {
        const selectMock = selectMocks.find((mock) => mock.func === selector);

        if (selectMock) {
          selectMock.used = true;

          return selectMock.value;
        }

        return selector(store.getState(), ...args);
      },

      // TODO: Support triggering a timeout
      async take(actionCreator) {
        const assert = asserts[0];

        if (assert && assert.type === 'take') {
          asserts.shift();
          if (!isType(assert.action, actionCreator)) {
            throw new Error();
          }

          return assert.action.payload;
        }

        throw new Error();
      },

      run(func, ...args) {
        const assert = asserts[0];

        if (assert && assert.type === 'run' && assert.func === func) {
          asserts.shift();

          deepStrictEqual(args, assert.args);
        }

        const runMock = runMocks.find((mock) => mock.func === func);

        if (runMock) {
          runMock.used = true;

          return runMock.value;
        }

        return func(env, ...args);
      },

      spawn(func, ...args) {
        const assert = asserts[0];

        if (assert && assert.type === 'spawn' && assert.func === func) {
          asserts.shift();

          deepStrictEqual(args, assert.args);
        }

        const spawnMock = spawnMocks.find((mock) => mock.func === func);

        if (spawnMock) {
          spawnMock.used = true;

          return {
            cancel: () => null,
            result: spawnMock.value,
          };
        }

        // We don't expect any asserts in a spawn function
        const childEnv = createTestEnvironment(mocks, [])(store);

        // TODO: Do we need to support cancellation?
        return {
          cancel: () => null,
          result: func(childEnv, ...args),
        };
      },

      call(fn, ...args) {
        const assert = asserts[0];

        if (assert && assert.type === 'call' && assert.func === fn) {
          asserts.shift();

          deepStrictEqual(args, assert.args);
        }

        const callMock = callMocks.find((mock) => mock.func === fn);

        if (callMock) {
          callMock.used = true;

          return callMock.value;
        }

        return fn(...args);
      },
    };

    return env;
  };
}
