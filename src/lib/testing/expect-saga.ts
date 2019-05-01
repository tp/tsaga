import { applyMiddleware, createStore, DeepPartial, Reducer } from 'redux';
import { Action } from 'typescript-fsa';
import { sleep } from '../environment';
import { Saga, SagaFunc } from '../types';
import { Asserts } from './assertions';
import { createTestSagaMiddleware } from './create-test-saga-middleware';
import { Mocks } from './mocks';

interface WithReducerStage<State, Payload> {
  /**
   * Sets the `reducer` for the test environment
   *
   * @param reducer
   * @param initialState Initial state. If none is provided,
   * the `reducer` will be called once without an action to generate the initial state
   */
  withReducer(reducer: Reducer<State, any>, initialState?: DeepPartial<State>): WithMocksStage<State, Payload>;
}

interface WithMocksStage<State, Payload> extends WhenDispatchedStage<State, Payload> {
  /**
   * Supply some mocks which will be used instead of the real functions.
   *
   * @param mocks The array of mocks to be used by the bound function.
   */
  andMocks(mocks: Mocks<State>): WhenDispatchedStage<State, Payload>;
}

interface WhenDispatchedStage<State, Payload> {
  /**
   * Dispatch an action to the store to start the saga.
   *
   * @param action The action to start the saga.
   */
  whenDispatched(action: Action<Payload>): AssertionStage<State>;
}

interface AssertionStage<State> {
  /**
   * Expect the bound function to call another function.
   * The arguments have to match completely.
   *
   * @param fn
   * @param args The arguments the function should be called with.
   */
  toCall<Args extends any[], Return>(fn: (...args: Args) => Return, ...args: Args): AssertionStage<State>;

  /**
   * Expect the bound function to run another bound function.
   * The arguments have to match completely.
   *
   * @param effect
   * @param args The arguments the effect should be called with.
   */
  toRun<Args extends any[], Return>(effect: SagaFunc<State, Args, Return>, ...args: Args): AssertionStage<State>;

  /**
   * Expect the bound function to spawn another bound function.
   * The arguments have to match completely.
   *
   * @param effect
   * @param args The arguments the effect should be called with.
   */
  toSpawn<Args extends any[], Return>(effect: SagaFunc<State, Args, Return>, ...args: Args): AssertionStage<State>;

  /**
   * Expect an action to be dispatched.
   *
   * @param action The action which should be dispatched.
   */
  toDispatch<DispatchPayload>(action: Action<DispatchPayload>): AssertionStage<State>;

  /**
   * Expect the bound effect to wait for an action.
   *
   * @param action - The action which the bound function is waiting for.
   * This will also be the action which will be returned to the bound function.
   */
  toTake<TakePayload>(action: Action<TakePayload>): AssertionStage<State>;

  /**
   * Assert on the final state of the reducer.
   *
   * @param state
   */
  toHaveFinalState(state: State): RunStage;
}

interface RunStage {
  /**
   * Run the function and validate the assertions.
   *
   * @param timeout An optional timeout after which the test will fail.
   */
  run(timeout?: number): Promise<void>;
}

class SagaTest<State, Payload>
  implements
    WithReducerStage<State, Payload>,
    WithMocksStage<State, Payload>,
    WhenDispatchedStage<State, Payload>,
    AssertionStage<State>,
    RunStage {
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

  public andMocks(mocks: Mocks<State>): WhenDispatchedStage<State, Payload> {
    this.mocks = mocks;

    return this;
  }

  public whenDispatched(action: Action<Payload>): AssertionStage<State> {
    this.action = action;

    return this;
  }

  public toCall<Args extends any[], Return>(func: (...args: Args) => Return, ...args: Args): AssertionStage<State> {
    this.asserts.push({
      type: 'call',
      func,
      args,
    });

    return this;
  }
  public toRun<Args extends any[], Return>(func: SagaFunc<State, Args, Return>, ...args: Args): AssertionStage<State> {
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
  ): AssertionStage<State> {
    this.asserts.push({
      type: 'spawn',
      func,
      args,
    });

    return this;
  }

  public toDispatch<DispatchPayload>(action: Action<DispatchPayload>): AssertionStage<State> {
    this.asserts.push({
      type: 'dispatch',
      action,
    });

    return this;
  }

  public toTake<TakePayload>(action: Action<TakePayload>): AssertionStage<State> {
    this.asserts.push({
      type: 'take',
      action,
    });

    return this;
  }

  public toHaveFinalState(state: State): RunStage {
    this.finalState = state;

    return this;
  }

  public async run(timeout: number = 10 * 1000) {
    if (this.action === null) {
      throw new Error('Missing action for starting the saga');
    }

    const { middleware, sagaCompletion } = createTestSagaMiddleware([this.saga], this.asserts, this.mocks);
    const store = createStore(
      this.reducer || ((state = ({} as unknown) as State) => state),
      this.initialState,
      applyMiddleware(middleware),
    );

    store.dispatch(this.action);

    const val = await Promise.race([sagaCompletion(), sleep(timeout)]);

    if (val === 'timeout') {
      throw new Error(`Saga didn't finish within the timeout of ${timeout / 1000} seconds`);
    }

    if (this.asserts.length > 0) {
      throw new Error(`Saga didn't fulfill ${this.asserts.length} assert${this.asserts.length === 1 ? '' : 's'}`);
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
