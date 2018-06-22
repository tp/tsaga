import { isEqual } from 'lodash';

export function call<R>(f: () => Promise<R>): Promise<R>;
export function call<R, A>(f: (_0: A) => Promise<R>, _0: A): Promise<R>;
export function call<R, A, B>(f: (_0: A, _1: B) => Promise<R>, _0: A, _1: B): Promise<R>;
export function call(f: (...args: any[]) => Promise<any>, ...args: any[]): Promise<any> {
  if (!f) {
    throw new Error(`call: function to be called is undefined`);
  }
  if (typeof f !== 'function') {
    throw new Error(`call: function to be called is not a function`);
  }

  return f.call(window, ...args);
}

export interface SagaContext {
  call: typeof call;
}

/**
 * Context for live/production usage
 *
 * Executes everything unchanged
 */
export const pureContext: SagaContext = {
  call: call,
};

export interface TestContextResult<T extends SagaContext = SagaContext> {
  ctx: T;
  isDone: () => void;
}

export interface TestContextConfiguration {
  stubs: TestContextStub[];
}

interface TestContextStub {
  function: (x: string) => Promise<any>;
  params: [string] | [string, any];
  result: any;
}

export function createTestContext(config: TestContextConfiguration): TestContextResult {
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

    return Promise.resolve(nextStub.result);
  };

  return {
    ctx: { call: stubCall },
    isDone: () => {
      if (config.stubs.length !== 0) {
        throw new Error(`Unused stubs left`);
      }
    },
  };
}
