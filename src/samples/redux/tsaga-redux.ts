import { createSelector, OutputSelector, OutputParametricSelector } from 'reselect';
import { stringLongerThanCountSelector } from './counter-example';
import { call } from '../../lib';
import { Store, AnyAction } from 'redux';

export function select<State, ResultType>(selector: OutputSelector<State, ResultType, any>): Promise<ResultType>;
export function select<State, Param1Type, ResultType>(selector: OutputParametricSelector<State, Param1Type, ResultType, any>, _p1: Param1Type): Promise<ResultType>;
export function select<State, ResultType>(selector: (state: State, ...args: any[]) => ResultType, ...args: any[]): Promise<ResultType> {
  return Promise.reject(`Not implemented, just base type`);
}

type ReduxTsagaContext = {
  call: typeof call;
  select: typeof select;
};

export async function postString({ call, select }: ReduxTsagaContext, s: string) {
  const isLonger = await select(stringLongerThanCountSelector, s);

  if (isLonger) {
    await call(window.fetch, `/api/stringCollector`, { method: 'POST', body: s });
  }
}

export function createReduxContext<State, Action extends AnyAction>(store: Store<State, Action>): ReduxTsagaContext {
  return {
    select: function<State, ResultType>(selector: (state: State, ...args: any[]) => ResultType, ...args: any[]): Promise<ResultType> {
      return Promise.resolve(selector.apply(window, [store.getState(), ...args]));
    },
    call: call,
  };
}
