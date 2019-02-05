import { createStore } from 'redux';
import { createSelector } from 'reselect';

type Action = { type: string };
type CounterState = { count: number };

export function counter(state = { count: 0 }, action: Action): CounterState {
  switch (action.type) {
    case 'INCREMENT':
      return { count: state.count + 1 };
    case 'DECREMENT':
      return { count: state.count - 1 };
    default:
      return state;
  }
}

export function createSampleReduxStore() {
  let store = createStore(counter);

  store.subscribe(() => console.log(store.getState()));

  store.dispatch({ type: 'INCREMENT' });

  store.dispatch({ type: 'INCREMENT' });

  store.dispatch({ type: 'DECREMENT' });

  return store;
}

export const nullStateSelector = (state: null) => null;

export const countSelector = (state: CounterState) => state.count;

const someCountedSelector = createSelector(countSelector, (count) => count > 0);

function param<T>(): (_state: any, param: T) => T {
  return (_, param) => param;
}

export const stringLongerThanCountSelector = createSelector(
  [param<string>(), countSelector],

  (s, count) => {
    return s.length > count;
  },
);

const stringParamLengthSelector = createSelector([(_: CounterState, param: string) => param], (s: string) => s.length);
