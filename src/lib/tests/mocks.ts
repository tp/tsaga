import { FuncWithEnv } from '../types';

export interface CallMock<Return> {
  type: 'call';
  used: boolean;
  fn: () => Return;
  value: Return;
}

export interface SelectMock<State, Return> {
  type: 'select';
  used: boolean;
  fn: (state: State) => Return;
  value: Return;
}

export interface RunMock<State, Args extends any[] = any[]> {
  type: 'run';
  used: boolean;
  fn: FuncWithEnv<State>;
}

export interface SpawnMock {
  type: 'spawn';
  used: boolean;
}

export type Mock<State> =
  | CallMock<any>
  | SelectMock<State, any>
  | RunMock
  | SpawnMock;
export type Mocks<State> = Array<Mock<State>>;

export function getSelectMocks<State>(mocks: Mocks<State>) {
  return mocks.filter(
    (mock): mock is SelectMock<State, any> => mock.type === 'select',
  );
}

export function getCallMocks<State>(mocks: Mocks<State>) {
  return mocks.filter((mock): mock is CallMock<any> => mock.type === 'call');
}

export function call<Return>(
  fn: () => Return,
  value: Return,
): CallMock<Return> {
  return {
    type: 'call',
    used: false,
    fn,
    value,
  };
}

export function select<State, Return>(
  fn: (state: State) => Return,
  value: Return,
): SelectMock<State, Return> {
  return {
    type: 'select',
    used: false,
    fn,
    value,
  };
}

export function run(): RunMock {
  return {
    type: 'run',
    used: false,
  };
}

export function spawn(): SpawnMock {
  return {
    type: 'spawn',
    used: false,
  };
}
