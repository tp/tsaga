import { applyMiddleware, createStore, DeepPartial, Reducer } from 'redux';
import { Action } from 'typescript-fsa';
import { sleep } from '../environment';
import { Saga, SagaFunc } from '../types';
import { Asserts } from './assertions';
import { createTestSagaMiddleware } from './create-test-saga-middleware';
import { Mocks } from './mocks';

interface WithReducerStage<State, Payload> extends WithMocksStage<State, Payload> {
  withReducer(reducer: Reducer<State, any>, initialState?: DeepPartial<State>): WithMocksStage<State, Payload>;
}

interface WithMocksStage<State, Payload> extends AssertionStage<State, Payload> {
  withMocks(mocks: Mocks<State>): AssertionStage<State, Payload>;
}

interface AssertionStage<State, Payload> extends ExpectSagaStage4<State, Payload> {
  toCall<Args extends any[], Return>(fn: (...args: Args) => Return, ...args: Args): AssertionStage<State, Payload>;

  toRun<Args extends any[], Return>(
    effect: SagaFunc<State, Args, Return>,
    ...args: Args
  ): AssertionStage<State, Payload>;

  toSpawn<Args extends any[], Return>(
    effect: SagaFunc<State, Args, Return>,
    ...args: Args
  ): AssertionStage<State, Payload>;

  toDispatch<DispatchPayload>(action: Action<DispatchPayload>): AssertionStage<State, Payload>;

  toTake<TakePayload>(action: Action<TakePayload>): AssertionStage<State, Payload>;
}

interface ExpectSagaStage4<State, Payload> {
  dispatch(action: Action<Payload>): FinalStateStage<State, Payload>;
}

interface FinalStateStage<State, Payload> extends RunStage {
  toHaveFinalState(state: State): RunStage;
}

interface RunStage {
  run(timeout?: number): Promise<void>;
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

  public withReducer(reducer: Reducer<State>, initialState?: DeepPartial<State>): WithMocksStage<State, Payload> {
    this.reducer = reducer;
    this.initialState = initialState;

    return this;
  }

  public withMocks(mocks: Mocks<State>): AssertionStage<State, Payload> {
    this.mocks = mocks;

    return this;
  }

  public toCall<Args extends any[], Return>(
    func: (...args: Args) => Return,
    ...args: Args
  ): AssertionStage<State, Payload> {
    this.asserts.push({
      type: 'call',
      func,
      args,
    });

    return this;
  }
  public toRun<Args extends any[], Return>(
    func: SagaFunc<State, Args, Return>,
    ...args: Args
  ): AssertionStage<State, Payload> {
    this.asserts.push({
      type: 'run',
      func,
      args,
    });

    return this;
  }

  public toSpawn<Args extends any[], Return>(
    func: SagaFunc<State, Args, Return>,
    ...args: Args
  ): AssertionStage<State, Payload> {
    this.asserts.push({
      type: 'spawn',
      func,
      args,
    });

    return this;
  }

  public toDispatch<DispatchPayload>(action: Action<DispatchPayload>): AssertionStage<State, Payload> {
    this.asserts.push({
      type: 'dispatch',
      action,
    });

    return this;
  }

  public toTake<TakePayload>(action: Action<TakePayload>): AssertionStage<State, Payload> {
    this.asserts.push({
      type: 'take',
      action,
    });

    return this;
  }

  public dispatch(action: Action<Payload>): FinalStateStage<State, Payload> {
    this.action = action;

    return this;
  }

  public toHaveFinalState(state: State): RunStage {
    this.finalState = state;

    return this;
  }

  public async run(timeout: number = 10 * 1000) {
    const { middleware, sagaCompletion } = createTestSagaMiddleware([this.saga], this.asserts, this.mocks);

    const store = createStore(
      this.reducer || ((state = ({} as unknown) as State) => state),
      this.initialState,
      applyMiddleware(middleware),
    );

    if (this.action === null) {
      throw new Error('Missing action for starting the saga');
    }

    store.dispatch(this.action);

    const val = await Promise.race([sagaCompletion(), sleep(timeout)]);

    if (val === 'timeout') {
      throw new Error(`Saga didn't finish within the timeout of ${timeout / 1000} seconds`);
    }

    if (this.asserts.length > 0) {
      throw new Error(`Saga didn't full fil ${this.asserts.length} assert${this.asserts.length === 1 ? '' : 's'}`);
    }

    if (this.finalState) {
      const state = store.getState();

      for (const key in this.finalState) {
        if (this.finalState.hasOwnProperty(key)) {
          expect(state[key]).toEqual(this.finalState[key]);
        }
      }
    }

    for (const mock of this.mocks) {
      if (!mock.used) {
        throw new Error(`Saga test has an unused ${mock.type} mock`);
      }
    }
  }
}

export function expectSaga<State, Payload>(saga: Saga<State, Payload>): WithReducerStage<State, Payload> {
  return new SagaTest(saga);
}
