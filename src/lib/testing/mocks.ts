import { SagaFunc } from '../types';

export interface CallMock<Return> {
  type: 'call';
  used: boolean;
  func: () => Return;
  value: Return;
}

export interface SelectMock<State, Return> {
  type: 'select';
  used: boolean;
  func: (state: State) => Return;
  value: Return;
}

export interface RunMock<State, Return> {
  type: 'run';
  used: boolean;
  func: SagaFunc<State, any[], Return>;
  value: Return;
}

export interface SpawnMock<State, Return> {
  type: 'spawn';
  used: boolean;
  func: SagaFunc<State, any[], Return>;
  value: Return;
}

export type Mock<State> = CallMock<any> | SelectMock<State, any> | RunMock<State, any> | SpawnMock<State, any>;

export type Mocks<State> = Array<Mock<State>>;

export const getSelectMocks = <State>(mocks: Mocks<State>) =>
  mocks.filter((mock): mock is SelectMock<State, any> => mock.type === 'select');

export const getCallMocks = <State>(mocks: Mocks<State>) =>
  mocks.filter((mock): mock is CallMock<any> => mock.type === 'call');

export const getRunMocks = <State>(mocks: Mocks<State>) =>
  mocks.filter((mock): mock is RunMock<State, any> => mock.type === 'run');

export const getMocks = <State, MockType extends Mock<State>>(mocks: Mocks<State>, type: Mock<State>['type']) =>
  mocks.filter((mock): mock is MockType => mock.type === type);

export function call<Args extends any[], Return, F extends (...args: Args) => Return>(
  func: F,
  value: ReturnType<F>,
): CallMock<Return> {
  return {
    type: 'call',
    used: false,
    func,
    value,
  };
}

export function select<State, Return, F extends (state: State) => Return>(
  func: F,
  value: ReturnType<F>,
): SelectMock<State, Return> {
  return {
    type: 'select',
    used: false,
    func,
    value,
  };
}

export function run<State, Return, F extends SagaFunc<State, any[], Return>>(
  func: F,
  value: ReturnType<F>,
): RunMock<State, Return> {
  return {
    type: 'run',
    used: false,
    func,
    value,
  };
}

export function spawn<State, Return, F extends SagaFunc<State, any[], Return>>(
  func: F,
  value: ReturnType<F>,
): SpawnMock<State, Return> {
  return {
    type: 'spawn',
    used: false,
    func,
    value,
  };
}
