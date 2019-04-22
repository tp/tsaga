import { createStore, DeepPartial, Reducer, Store } from 'redux';
import { Action } from 'typescript-fsa';
import { sleep } from '../environment';
import { SagaFunc } from '../types';
import { Asserts } from './assertions';
import { createTestEnvironment } from './create-test-env';
import { Mocks } from './mocks';

interface WithReducerStage<State, Args extends any[], Return> {
  withReducer(reducer: Reducer<State, any>, initialState?: DeepPartial<State>): WithMocksStage<State, Args, Return>;
}

interface WithMocksStage<State, Args extends any[], Return> extends AssertionStage<State, Args, Return> {
  withMocks(mocks: Mocks<State>): AssertionStage<State, Args, Return>;
}

interface AssertionStage<State, Args extends any[], Return> extends CallStage<State, Args, Return> {
  toCall(fn: (...args: any[]) => any, ...args: any): AssertionStage<State, Args, Return>;

  toRun(effect: SagaFunc<State, any[], any>, ...args: Args): AssertionStage<State, Args, Return>;

  toSpawn(effect: SagaFunc<State, any[], any>, ...args: Args): AssertionStage<State, Args, Return>;

  toDispatch<DispatchPayload>(action: Action<DispatchPayload>): AssertionStage<State, Args, Return>;

  toTake<TakePayload>(action: Action<TakePayload>): AssertionStage<State, Args, Return>;
}

interface CallStage<State, Args extends any[], Return> {
  call(...args: Args): ReturnStage<State, Args, Return>;
}

interface ReturnStage<State, Args extends any[], Return> extends FinalStateStage<State> {
  toReturn(value: Return): FinalStateStage<State>;
}

interface FinalStateStage<State> extends RunStage {
  toHaveFinalState(state: State): RunStage;
}

interface RunStage {
  run(timeout?: number): Promise<void>;
}

const NO_RETURN_VALUE = Symbol('NO_RETURN_VALUE');

class BoundFunctionTest<State, Args extends any[], Return> {
  private readonly func: SagaFunc<State, Args, Return>;

  private mocks: Mocks<State> = [];

  private asserts: Asserts<State> = [];

  private args: Args | null = null;

  private returnValue: Return | symbol = NO_RETURN_VALUE;

  private store: Store<State> = createStore((state = ({} as unknown) as State) => state, undefined);

  private finalState: State | undefined;

  constructor(func: SagaFunc<State, Args, Return>) {
    this.func = func;
  }

  public withReducer(reducer: Reducer<State>, initialState?: DeepPartial<State>): WithMocksStage<State, Args, Return> {
    this.store = createStore(reducer, initialState);

    return this;
  }

  public withMocks(mocks: Mocks<State>): AssertionStage<State, Args, Return> {
    this.mocks = mocks;

    return this;
  }

  public toCall<LocalArgs extends any[]>(
    func: (...args: LocalArgs) => any,
    ...args: LocalArgs
  ): AssertionStage<State, Args, Return> {
    this.asserts.push({
      type: 'call',
      func,
      args,
    });

    return this;
  }
  public toRun<LocalArgs extends any[]>(
    func: SagaFunc<State, LocalArgs, any>,
    ...args: LocalArgs
  ): AssertionStage<State, Args, Return> {
    this.asserts.push({
      type: 'run',
      func,
      args,
    });

    return this;
  }

  public toSpawn<LocalArgs extends any[]>(
    func: SagaFunc<State, LocalArgs, any>,
    ...args: LocalArgs
  ): AssertionStage<State, Args, Return> {
    this.asserts.push({
      type: 'spawn',
      func,
      args,
    });

    return this;
  }

  public toDispatch<DispatchPayload>(action: Action<DispatchPayload>): AssertionStage<State, Args, Return> {
    this.asserts.push({
      type: 'dispatch',
      action,
    });

    return this;
  }

  public toTake<TakePayload>(action: Action<TakePayload>): AssertionStage<State, Args, Return> {
    this.asserts.push({
      type: 'take',
      action,
    });

    return this;
  }

  public call(...args: Args): ReturnStage<State, Args, Return> {
    this.args = args;

    return this;
  }

  public toReturn(value: Return): FinalStateStage<State> {
    this.returnValue = value;

    return this;
  }

  public toHaveFinalState(state: State): RunStage {
    this.finalState = state;

    return this;
  }

  public async run(timeout: number = 10 * 1000) {
    if (!this.store) {
      throw new Error('Missing store');
    }

    if (this.args === null) {
      throw new Error('Missing arguments for function');
    }

    const testEnv = createTestEnvironment(this.mocks, this.asserts)(this.store);

    const val = await Promise.race([this.func(testEnv, ...this.args), sleep(timeout)]);

    if (val === 'timeout') {
      throw new Error(`Saga didn't finish within the timeout of ${timeout / 1000} seconds`);
    }

    if (this.returnValue !== NO_RETURN_VALUE) {
      expect(val).toEqual(this.returnValue);
    }

    if (this.asserts.length > 0) {
      throw new Error(`Saga didn't full fil ${this.asserts.length} assert${this.asserts.length === 1 ? '' : 's'}`);
    }

    if (this.finalState) {
      const state = this.store.getState();

      for (const key in this.finalState) {
        if (this.finalState.hasOwnProperty(key)) {
          expect(state[key]).toEqual(this.finalState[key]);
        }
      }
    }

    for (const mock of this.mocks) {
      if (!mock.used) {
        throw new Error(`Saga test has an unused ${mock.type} mock: ${mock}`);
      }
    }
  }
}

export function expectBoundFunction<State, Args extends any[], Return>(
  func: SagaFunc<State, Args, Return>,
): WithReducerStage<State, Args, Return> {
  return new BoundFunctionTest(func);
}
