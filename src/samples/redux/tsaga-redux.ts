import { createSelector, OutputSelector, OutputParametricSelector, Selector } from 'reselect';
import { stringLongerThanCountSelector, countSelector, nullStateSelector } from './counter-example';
import { call } from '../../lib';
import { Store, AnyAction } from 'redux';
import { CountReducerState } from '../redux-like-with-reducer/saga-with-reducer';

export function select<State, ResultType>(selector: OutputSelector<State, ResultType, any> | Selector<State, ResultType>): Promise<ResultType>;
export function select<State, Param1Type, ResultType>(selector: OutputParametricSelector<State, Param1Type, ResultType, any>, _p1: Param1Type): Promise<ResultType>;
export function select<State, ResultType>(selector: (state: State, ...args: any[]) => ResultType, ...args: any[]): Promise<ResultType> {
  return Promise.reject(`Not implemented, just base type`);
}

type ContextSelect<State> = {
  <ResultType>(selector: Selector<State, ResultType> | OutputSelector<State, ResultType, any>): Promise<ResultType>;
  <Param1Type, ResultType>(selector: OutputParametricSelector<State, Param1Type, ResultType, any>, _p1: Param1Type): Promise<ResultType>;
};

type ReduxTsagaContext<State> = {
  call: typeof call;
  select: ContextSelect<State>;
};

export async function postString({ call, select }: ReduxTsagaContext<CountReducerState>, s: string) {
  const isLonger = await select(stringLongerThanCountSelector, s);

  // NOTE: Commenting this in should fail compilation, as the selector operates on another state type
  // const x = await select(nullStateSelector);

  if (isLonger) {
    await call(window.fetch, `/api/stringCollector`, { method: 'POST', body: s });
  }
}

export function createReduxContext<State, Action extends AnyAction>(store: Store<State, Action>): ReduxTsagaContext<State> {
  return {
    select: function<State, ResultType>(selector: (state: State, ...args: any[]) => ResultType, ...args: any[]): Promise<ResultType> {
      return Promise.resolve(selector.apply(window, [store.getState(), ...args]));
    },
    call: call,
  };
}
