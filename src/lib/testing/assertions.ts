import { Action } from 'typescript-fsa';
import { SagaFunc } from '../types';

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
  func: SagaFunc<State, Args, Return>;
  args: Args;
}

interface SpawnAssert<State, Args extends any[], Return> {
  type: 'spawn';
  func: SagaFunc<State, Args, Return>;
  args: Args;
}

export type Assert<State> =
  | DispatchAssert<any>
  | TakeAssert<any>
  | CallAssert<any, any>
  | RunAssert<State, any, any>
  | SpawnAssert<State, any, any>;

export type Asserts<State> = Array<Assert<State>>;
