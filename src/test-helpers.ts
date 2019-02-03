import { Saga, SagaEnvironment } from './types';
import { SelectError } from './errors/SelectError';
import { createStore, Store, DeepPartial, Reducer } from 'redux';
import { Action } from 'typescript-fsa';
import deepEqual from 'fast-deep-equal';
import { ExpectationError } from './errors/ExpectationError';

interface CallExpectation<Return, Args extends any[]> {
  type: 'call',
  fn: (...args: Args) => Return,
  args: Args,
}

interface DispatchExpectation<Payload> {
  type: 'dispatch',
  action: Action<Payload>,
}

type Expectation = CallExpectation<any, any> | DispatchExpectation<any>;

interface Provider<Value, Args extends any[]> {
  type: 'call' | 'select',
  args: Args | null,
  fn: (...args: Args) => Value,
  value: Value,
}

class TestEnvironment<State> implements SagaEnvironment<State> {
  private providers: Provider<any, any>[];

  private readonly store: Store<State> | null = null;

  constructor(providers: Provider<any, any>[], store?: Store<State>) {
    this.providers = providers;

    if (store) {
      this.store = store;
    }
  }

  public select<Return, Args extends any[]>(
    selector: (state: State, ...args: Args) => Return,
    ...args: Args
  ) {
    const provider = this.providers.find(provider => {
      if (provider.type !== 'select' || provider.fn !== selector) {
        return false;
      }

      if (provider.args === null) {
        return true;
      }

      return deepEqual(args, provider.args);
    });

    if (provider) {
      return provider.value;
    }

    if (this.store !== null) {
      return selector(this.store.getState(), ...args);
    }

    throw new SelectError('Either provide a reducer, state or mock all of the select calls');
  }

  public dispatch(action: Action<any>) {
    if (this.store !== null) {
      this.store.dispatch(action);
    }
  }

  public async call<Return, Args extends any[]>(
    fn: (...args: Args) => Return,
    ...args: Args
  ) {
    const provider = this.providers.find(provider => {
      if (provider.type !== 'call' || provider.fn !== fn) {
        return false;
      }

      if (provider.args === null) {
        return true;
      }

      return deepEqual(args, provider.args);
    });

    return provider ? provider.value : fn(...args);
  }
}

class SagaTest<State, Payload> {
  private readonly saga: Saga<State, Payload>;

  private readonly payload: Payload;

  private providers: Provider<any, any>[] = [];

  private expectations: Expectation[] = [];

  private store?: Store<State>;

  private resultingState?: State;

  constructor(saga: Saga<State, Payload>, payload: Payload) {
    this.saga = saga;
    this.payload = payload;
  }

  withSelect<Value, Args extends any[]>(
    matcher: ((state: any, ...args: Args) => Value) | [(state: any, ...args: Args) => Value, ...Args],
    value: Value,
  ) {
    this.providers.push({
      value,
      type: 'select',
      fn: Array.isArray(matcher) ? matcher[0] : matcher,
      args: Array.isArray(matcher) ? matcher.slice(1) : null,
    });

    return this;
  }

  withCall<Value, Args extends any[]>(
    matcher: ((...args: Args) => Value) | [(...args: Args) => Value, ...Args],
    value: Value,
  ) {
    this.providers.push({
      value,
      type: 'call',
      fn: Array.isArray(matcher) ? matcher[0] : matcher,
      args: Array.isArray(matcher) ? matcher.slice(1) : null,
    });

    return this;
  }

  toDispatch(action: Action<any>) {
    this.expectations.push({
      type: 'dispatch',
      action,
    });

    return this;
  }

  toCall<Return, Args extends any[]>(
    fn: (...args: Args) => Return,
    ...args: Args
  ) {
    this.expectations.push({
      type: 'call',
      fn,
      args,
    });

    return this;
  }

  withReducer(reducer: Reducer<State>, initialState: DeepPartial<State>) {
    this.store = createStore(reducer, initialState);

    return this;
  }

  withState(state: DeepPartial<State>) {
    this.store = createStore(() => state);

    return this;
  }

  hasResultingState(state: State) {
    this.resultingState = state;

    return this;
  }

  async run() {
    const env = new TestEnvironment(this.providers, this.store);

    await this.saga.handler(env, this.payload);

    this.validateState();
  }

  validateState() {
    if (this.resultingState) {
      if (!this.store) {
        // TODO: Better error
        throw new Error();
      }

      if (!deepEqual(this.store.getState(), this.resultingState)) {
        // TODO: Error message + diff
        throw new ExpectationError();
      }
    }
  }
}

function createSagaTest<State, Payload>(saga: Saga<State, Payload>, payload: Payload) {
  return new SagaTest<State, Payload>(saga, payload);
}