import { deepStrictEqual } from 'assert';
import { createStore, DeepPartial, Reducer } from 'redux';
import { Action, ActionCreator, isType } from 'typescript-fsa';
import { BoundEffect, createSagaMiddleware, Saga, SagaEnvironment, Task } from '.';
import { CancellationToken } from './CancellationToken';
import { UnusedMockError } from './test-errors';
import { FuncWithEnv, WaitForAction } from './types';

interface CallMock<Return> {
  type: 'call';
  used: boolean;
  fn: () => Return;
  value: Return;
}

interface SelectMock<State, Return> {
  type: 'select';
  used: boolean;
  fn: (state: State) => Return;
  value: Return;
}

interface RunMock {
  type: 'run';
  used: boolean;
}

interface SpawnMock {
  type: 'spawn';
  used: boolean;
}

type Mock<State> = CallMock<any> | SelectMock<State, any> | RunMock | SpawnMock;

export function call<Return>(
  fn: () => Return,
  value: Return,
): CallMock<Return> {
  return {
    type: 'call',
    used: false,
    fn,
    value,
  };
}

export function select<State, Return>(
  fn: (state: State) => Return,
  value: Return,
): SelectMock<State, Return> {
  return {
    type: 'select',
    used: false,
    fn,
    value,
  };
}

export function run(): RunMock {
  return {
    type: 'run',
    used: false,
  };
}

export function spawn(): SpawnMock {
  return {
    type: 'spawn',
    used: false,
  };
}

interface ExpectSagaStage1<State, Payload> {
  withReducer(
    reducer: Reducer<State, any>,
    initialState?: DeepPartial<State>,
  ): ExpectSagaStage2<State, Payload>;
}

interface ExpectSagaStage2<State, Payload> extends ExpectSagaStage3<State, Payload> {
  withMocks(
    mocks: Array<Mock<State>>,
  ): ExpectSagaStage3<State, Payload>;
}

interface ExpectSagaStage3<State, Payload> extends ExpectSagaStage4<State, Payload> {
  toCall<Args extends any[], Return>(
    fn: (...args: Args) => Return,
    ...args: Args
  ): ExpectSagaStage3<State, Payload>;
  toRun(...args: any[]): ExpectSagaStage3<State, Payload>;
  toSpawn(...args: any[]): ExpectSagaStage3<State, Payload>;
  toDispatch<DispatchPayload>(
    action: Action<DispatchPayload>,
  ): ExpectSagaStage3<State, Payload>;
  toTake<TakePayload>(
    action: Action<TakePayload>,
  ): ExpectSagaStage3<State, Payload>;
}

interface ExpectSagaStage4<State, Payload> {
  dispatch(action: Action<Payload>): ExpectSagaStage5<State, Payload>;
}

interface ExpectSagaStage5<State, Payload> extends ExpectSagaStage6 {
  toHaveFinalState(state: State): ExpectSagaStage6;
}

interface ExpectSagaStage6 {
  run(timeout?: number): Promise<void>;
}

interface DispatchAssert<Payload> {
  type: 'dispatch';
  action: Action<Payload>;
}

interface TakeAssert<Payload> {
  type: 'take';
  action: Action<Payload>;
}

interface CallAssert<Args extends any[] = any[], Return = any> {
  type: 'call';
  fn: (...args: Args) => Return;
  args: Args;
}

type Assert = DispatchAssert<any> | TakeAssert<any> | CallAssert;

type Mocks<State> = Array<Mock<State>>;

function createTestEnvironment<State>(mocks: Mocks<State>, asserts: Assert[]) {
  const selectMocks = mocks.filter((mock): mock is SelectMock<State, any> => mock.type === 'select');
  const callMocks = mocks.filter((mock): mock is CallMock<any> => mock.type === 'call');

  return (
    store,
    waitForAction: WaitForAction,
    cancellationToken?: CancellationToken,
  ): SagaEnvironment<State> => {
    return {
      dispatch<Payload>(action: Action<Payload>) {
        const assert = asserts[0];

        if (assert && assert.type === 'dispatch' && action.type === assert.action.type) {
          asserts.shift();
          deepStrictEqual(action, assert && assert.action);
        }

        return store.dispatch(action);
      },

      select<T, Args extends any[]>(selector: (state: State, ...args: Args) => T, ...args: Args): T {
        const selectMock = selectMocks.find((mock) => mock.fn === selector);

        if (selectMock) {
          selectMock.used = true;

          return selectMock.value;
        }

        return selector(store.getState(), ...args);
      },

      async take<Payload>(actionCreator: ActionCreator<Payload>, timeout?: number): Promise<Payload> {
        const assert = asserts[0];

        if (assert && assert.type === 'take') {
          asserts.shift();
          if (!isType(assert.action, actionCreator)) {
            throw new Error();
          }

          return assert.action.payload;
        }

        // TODO what to do?
        throw new Error();
      },

      run<Args extends any[], T>(effectOrEffectCreator: BoundEffect<SagaEnvironment<State>, Args, T>, ...args): T {

      },

      spawn<T, Args extends any[]>(
        effectOrEffectCreator: BoundEffect<SagaEnvironment<State>, Args, T> | FuncWithEnv<State, Args, T>,
        ...args
      ): Task<T> {
      },

      call(fn, ...args) {
        const assert = asserts[0];

        if (assert && assert.type === 'call' && assert.fn === fn) {
          asserts.shift();

          deepStrictEqual(args, assert.args);
        }

        const callMock = callMocks.find((mock) => mock.fn === fn);

        if (callMock) {
          callMock.used = true;

          return callMock.value;
        }

        return fn(...args);
      },
    };
  };
}

class SagaTest<State, Payload> {
  private readonly saga: Saga<State, Payload>;

  private mocks: Array<Mock<State>> = [];

  private asserts: Assert[] = [];

  private action: Action<Payload> | null = null;

  private finalState: State | null = null;

  private reducer: Reducer<State> | undefined;

  private initialState: undefined | DeepPartial<State> = undefined;

  constructor(saga: Saga<State, Payload>) {
    this.saga = saga;
  }

  public withReducer(
    reducer: Reducer<State>,
    initialState?: DeepPartial<State>,
  ): ExpectSagaStage2<State, Payload> {
    this.reducer = reducer;
    this.initialState = initialState;

    return this;
  }

  public withMocks(mocks: Array<Mock<State>>): ExpectSagaStage3<State, Payload> {
    this.mocks = mocks;

    return this;
  }

  public toCall<Args extends any[], Return>(fn: (...args: Args) => Return, ...args: Args): ExpectSagaStage3<State, Payload> {
    this.asserts.push({
      type: 'call',
      fn,
      args,
    });

    return this;

  }
  public toRun(...args: any[]): ExpectSagaStage3<State, Payload> { return this; }
  public toSpawn(...args: any[]): ExpectSagaStage3<State, Payload> { return this; }

  public toDispatch<DispatchPayload>(action: Action<DispatchPayload>): ExpectSagaStage3<State, Payload> {
    this.asserts.push({
      type: 'dispatch',
      action,
    });

    return this;
  }

  public toTake<TakePayload>(action: Action<TakePayload>): ExpectSagaStage3<State, Payload> {
    this.asserts.push({
      type: 'take',
      action,
    });

    return this;
  }

  public dispatch(action: Action<Payload>): ExpectSagaStage5<State, Payload> {
    this.action = action;

    return this;
  }

  public toHaveFinalState(state: State): ExpectSagaStage6 {
    this.finalState = state;

    return this;
  }

  public async run(timeout: number = 5 * 1000) {
    const { middleware, sagaCompletion } = createSagaMiddleware([this.saga], createTestEnvironment);

    const store = createStore(
      this.reducer || ((state = {} as any) => state),
      this.initialState,
      middleware,
    );

    store.dispatch(this.action);

    const val = await Promise.race([
      sagaCompletion(),
      new Promise((resolve) => {
        setTimeout(() => resolve('timeout'), timeout);
      }) as Promise<'timeout'>,
    ]);

    if (val === 'timeout') {
      throw new Error('Saga test timeout');
    }

    if (this.asserts.length > 0) {
      throw new Error('Asserts are left');
    }

    if (this.finalState) {
      deepStrictEqual(
        store.getState(),
        this.finalState,
      );
    }

    for (const mock of this.mocks) {
      if (!mock.used) {
        throw new UnusedMockError(
          '',
        );
      }
    }
  }
}

export function expectSaga<State, Payload>(saga: Saga<State, Payload>): ExpectSagaStage1<State, Payload> {
  return new SagaTest(saga);
}
