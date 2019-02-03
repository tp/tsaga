import { Saga, SagaEnvironment, Provider, Expectation } from './types';
import { SelectError } from './errors/SelectError';
import { createStore, Store, DeepPartial, Reducer } from 'redux';
import { Action } from 'typescript-fsa';
import deepEqual from 'fast-deep-equal';
import { ExpectationError } from './errors/ExpectationError';

function createTestEnvironment<State>(
  providers: Provider<any, any>[],
  store: Store<State> | null = null,
): SagaEnvironment<State> {
  return {
    select(selector, ...args) {
      const provider = providers.find(
        provider => provider.type === 'select' && provider.fn === selector,
      );

      if (provider) {
        return typeof provider.value === 'function'
          ? provider.value(...args)
          : provider.value;
      }

      if (store !== null) {
        return selector(store.getState(), ...args);
      }

      throw new SelectError(
        'Either provide a reducer, state or mock all of the select calls',
      );
    },

    dispatch(action: Action<any>) {
      if (store !== null) {
        store.dispatch(action);
      }
    },

    async call(fn, ...args) {
      const provider = providers.find(
        provider => provider.type === 'call' && provider.fn === fn,
      );

      if (provider) {
        return typeof provider.value === 'function'
          ? provider.value(...args)
          : provider.value;
      }

      return fn(...args);
    },
  };
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

  withSelect<Return, Args extends any[]>(
    fn: (state: State, ...args: Args) => Return,
    value: Return | ((...args: Args) => Return),
  ) {
    this.providers.push({
      value,
      fn,
      type: 'select',
    });

    return this;
  }

  withCall<Return, Args extends any[]>(
    fn: (...args: Args) => Return,
    value: Return | ((...args: Args) => Return),
  ) {
    this.providers.push({
      value,
      fn,
      type: 'call',
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
    const env = createTestEnvironment(this.providers, this.store);

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

function createSagaTest<State, Payload>(
  saga: Saga<State, Payload>,
  payload: Payload,
) {
  return new SagaTest<State, Payload>(saga, payload);
}
