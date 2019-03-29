import { BoundFunc } from '../types';

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
  func: BoundFunc<State, any[], Return>;
  value: Return;
}

export interface SpawnMock<State, Return> {
  type: 'spawn';
  used: boolean;
  func: BoundFunc<State, any[], Return>;
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

export function call<Return>(func: () => Return, value: Return): CallMock<Return> {
  return {
    type: 'call',
    used: false,
    func,
    value,
  };
}

export function select<State, Return>(func: (state: State) => Return, value: Return): SelectMock<State, Return> {
  return {
    type: 'select',
    used: false,
    func,
    value,
  };
}

export function run<State, Return>(func: BoundFunc<State, any[], Return>, value: Return): RunMock<State, Return> {
  return {
    type: 'run',
    used: false,
    func,
    value,
  };
}

export function spawn<State, Return>(func: BoundFunc<State, any[], Return>, value: Return): SpawnMock<State, Return> {
  return {
    type: 'spawn',
    used: false,
    func,
    value,
  };
}
