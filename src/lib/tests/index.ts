import { deepStrictEqual } from 'assert';
import { applyMiddleware, createStore, DeepPartial, MiddlewareAPI, Reducer } from 'redux';
import { Action, ActionCreator, isType } from 'typescript-fsa';
import { createSagaMiddleware, Task } from '../';
import { BoundEffect, FuncWithEnv, Saga, SagaEnvironment, SagaEnvironmentCreator } from '../types';
import { SagaTimeoutError, TooManyAssertsError, UnusedMockError, NoActionError } from './errors';
import { getCallMocks, getSelectMocks, Mocks } from './mocks';

interface ExpectSagaStage1<State, Payload> {
  withReducer(
    reducer: Reducer<State, any>,
    initialState?: DeepPartial<State>,
  ): ExpectSagaStage2<State, Payload>;
}

interface ExpectSagaStage2<State, Payload> extends ExpectSagaStage3<State, Payload> {
  withMocks(mocks: Mocks<State>): ExpectSagaStage3<State, Payload>;
}

interface ExpectSagaStage3<State, Payload> extends ExpectSagaStage4<State, Payload> {
  toCall<Args extends any[], Return>(
    fn: (...args: Args) => Return,
    ...args: Args
  ): ExpectSagaStage3<State, Payload>;

  toRun<Args extends any[], Return>(
    effect: BoundEffect<State, Args, Return>,
    ...args: Args,
  ): ExpectSagaStage3<State, Payload>;

  toRun<Args extends any[], Return>(
    effect: FuncWithEnv<State, Args, Return>,
    ...args: Args,
  ): ExpectSagaStage3<State, Payload>;

  toSpawn<Args extends any[], Return>(
    effect: BoundEffect<State, Args, Return>,
    ...args: Args
  ): ExpectSagaStage3<State, Payload>;

  toSpawn<Args extends any[], Return>(
    effect: FuncWithEnv<State, Args, Return>,
    ...args: Args
  ): ExpectSagaStage3<State, Payload>;

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

interface CallAssert<Args extends any[], Return> {
  type: 'call';
  fn: (...args: Args) => Return;
  args: Args;
}

interface RunAssert<State, Args extends any[], Return> {
  type: 'run',
  fn: FuncWithEnv<State, Args, Return> | BoundEffect<State, Args, Return>,
  args: Args,
}

interface SpawnAssert<State, Args extends any[], Return> {
  type: 'spawn',
  fn: FuncWithEnv<State, Args, Return> | BoundEffect<State, Args, Return>,
  args: Args,
}

type Assert<State> =
  | DispatchAssert<any>
  | TakeAssert<any>
  | CallAssert<any[], any>
  | RunAssert<State, any, any>
  | SpawnAssert<State, any, any>;

type Asserts<State> = Array<Assert<State>>;

function createTestEnvironment<State>(mocks: Mocks<State>, asserts: Asserts<State>): SagaEnvironmentCreator {
  const selectMocks = getSelectMocks(mocks);
  const callMocks = getCallMocks(mocks);

  return (store: MiddlewareAPI<any, State>) => {
    return {
      dispatch(action) {
        const assert = asserts[0];

        if (assert && assert.type === 'dispatch' && action.type === assert.action.type) {
          asserts.shift();
          deepStrictEqual(action, assert && assert.action);
        }

        return store.dispatch(action);
      },

      select(selector, ...args) {
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

  private mocks: Mocks<State> = [];

  private asserts: Asserts<State> = [];

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

  public withMocks(mocks: Mocks<State>): ExpectSagaStage3<State, Payload> {
    this.mocks = mocks;

    return this;
  }

  public toCall<Args extends any[], Return>(
    fn: (...args: Args) => Return,
    ...args: Args
  ): ExpectSagaStage3<State, Payload> {
    this.asserts.push({
      type: 'call',
      fn,
      args,
    } as any); // TODO

    return this;

  }
  public toRun<Args extends any[], Return>(
    fn: FuncWithEnv<State, Args, Return> | BoundEffect<State, Args, Return>,
    ...args: Args
  ): ExpectSagaStage3<State, Payload> {
    this.asserts.push({
      type: 'run',
      fn,
      args,
    });

    return this;
  }

  public toSpawn<Args extends any[], Return>(
    fn: FuncWithEnv<State, Args, Return> | BoundEffect<State, Args, Return>,
    ...args: Args
  ): ExpectSagaStage3<State, Payload> {
    this.asserts.push({
      type: 'spawn',
      fn,
      args,
    });

    return this;
  }

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
    const { middleware, sagaCompletion } = createSagaMiddleware(
      [this.saga],
      createTestEnvironment(this.mocks, this.asserts),
    );

    const store = createStore(
      this.reducer || ((state = {} as any) => state),
      this.initialState,
      applyMiddleware(middleware),
    );

    if (this.action === null) {
      throw new NoActionError('Missing action');
    }

    store.dispatch(this.action);

    const val = await Promise.race([
      sagaCompletion(),
      new Promise((resolve) => {
        setTimeout(() => resolve('timeout'), timeout);
      }) as Promise<'timeout'>,
    ]);

    if (val === 'timeout') {
      throw new SagaTimeoutError('');
    }

    if (this.asserts.length > 0) {
      throw new TooManyAssertsError('');
    }

    if (this.finalState) {
      deepStrictEqual(
        store.getState(),
        this.finalState,
      );
    }

    for (const mock of this.mocks) {
      if (!mock.used) {
        throw new UnusedMockError('');
      }
    }
  }
}

export function expectSaga<State, Payload>(saga: Saga<State, Payload>): ExpectSagaStage1<State, Payload> {
  return new SagaTest(saga);
}
