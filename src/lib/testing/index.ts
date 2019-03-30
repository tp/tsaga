import { applyMiddleware, createStore, DeepPartial, Reducer } from 'redux';
import { Action } from 'typescript-fsa';
import { createSagaMiddleware } from '../createSagaMiddleware';
import { BoundFunc, Saga } from '../types';
import { createTestEnvironment } from './create-test-env';
import { NoActionError, SagaTimeoutError, TooManyAssertsError, UnusedMockError } from './errors';
import { Mocks } from './mocks';
import { createTestSagaMiddleware } from './create-test-saga-middleware';

interface ExpectSagaStage1<State, Payload> {
  withReducer(reducer: Reducer<State, any>, initialState?: DeepPartial<State>): ExpectSagaStage2<State, Payload>;
}

interface ExpectSagaStage2<State, Payload> extends ExpectSagaStage3<State, Payload> {
  withMocks(mocks: Mocks<State>): ExpectSagaStage3<State, Payload>;
}

interface ExpectSagaStage3<State, Payload> extends ExpectSagaStage4<State, Payload> {
  toCall<Args extends any[], Return>(fn: (...args: Args) => Return, ...args: Args): ExpectSagaStage3<State, Payload>;

  toRun<Args extends any[], Return>(
    effect: BoundFunc<State, Args, Return>,
    ...args: Args
  ): ExpectSagaStage3<State, Payload>;

  toSpawn<Args extends any[], Return>(
    effect: BoundFunc<State, Args, Return>,
    ...args: Args
  ): ExpectSagaStage3<State, Payload>;

  toDispatch<DispatchPayload>(action: Action<DispatchPayload>): ExpectSagaStage3<State, Payload>;

  toTake<TakePayload>(action: Action<TakePayload>): ExpectSagaStage3<State, Payload>;
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
  func: (...args: Args) => Return;
  args: Args;
}

interface RunAssert<State, Args extends any[], Return> {
  type: 'run';
  func: BoundFunc<State, Args, Return>;
  args: Args;
}

interface SpawnAssert<State, Args extends any[], Return> {
  type: 'spawn';
  func: BoundFunc<State, Args, Return>;
  args: Args;
}

type Assert<State> =
  | DispatchAssert<any>
  | TakeAssert<any>
  | CallAssert<any, any>
  | RunAssert<State, any, any>
  | SpawnAssert<State, any, any>;

export type Asserts<State> = Array<Assert<State>>;

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

  public withReducer(reducer: Reducer<State>, initialState?: DeepPartial<State>): ExpectSagaStage2<State, Payload> {
    this.reducer = reducer;
    this.initialState = initialState;

    return this;
  }

  public withMocks(mocks: Mocks<State>): ExpectSagaStage3<State, Payload> {
    this.mocks = mocks;

    return this;
  }

  public toCall<Args extends any[], Return>(
    func: (...args: Args) => Return,
    ...args: Args
  ): ExpectSagaStage3<State, Payload> {
    this.asserts.push({
      type: 'call',
      func,
      args,
    });

    return this;
  }
  public toRun<Args extends any[], Return>(
    func: BoundFunc<State, Args, Return>,
    ...args: Args
  ): ExpectSagaStage3<State, Payload> {
    this.asserts.push({
      type: 'run',
      func,
      args,
    });

    return this;
  }

  public toSpawn<Args extends any[], Return>(
    func: BoundFunc<State, Args, Return>,
    ...args: Args
  ): ExpectSagaStage3<State, Payload> {
    this.asserts.push({
      type: 'spawn',
      func,
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

  public async run(timeout: number = 10 * 1000) {
    const { middleware, sagaCompletion } = createTestSagaMiddleware(
      [this.saga],
      this.asserts,
      this.mocks,
    );

    const store = createStore(
      this.reducer || ((state = {} as any) => state),
      this.initialState,
      applyMiddleware(middleware),
    );

    if (this.action === null) {
      throw new NoActionError('Missing action for starting the saga');
    }

    store.dispatch(this.action);

    const val = await Promise.race([
      sagaCompletion(),
      new Promise((resolve) => {
        setTimeout(() => resolve('timeout'), timeout);
      }) as Promise<'timeout'>,
    ]);

    if (val === 'timeout') {
      throw new SagaTimeoutError(`Saga didn't finish within the timeout of ${timeout / 1000} seconds`);
    }

    if (this.asserts.length > 0) {
      throw new TooManyAssertsError(`Saga didn't full fil ${this.asserts.length} asserts`);
    }

    if (this.finalState) {
      const state = store.getState();

      if (typeof this.finalState === 'object' && !Array.isArray(this.finalState)) {
        for (const key in this.finalState) {
          if (this.finalState.hasOwnProperty(key)) {
            expect(state[key]).toEqual(this.finalState[key]);
          }
        }
      } else {
        expect(state).toEqual(this.finalState);
      }
    }

    for (const mock of this.mocks) {
      if (!mock.used) {
        throw new UnusedMockError(`Saga test has an unused ${mock.type} mock`);
      }
    }
  }
}

export function expectSaga<State, Payload>(saga: Saga<State, Payload>): ExpectSagaStage1<State, Payload> {
  return new SagaTest(saga);
}
