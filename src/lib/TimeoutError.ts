import { ActionCreator } from 'typescript-fsa';

export default class TimeoutError extends Error {
  constructor(actionCreator: ActionCreator<any>) {
    super(`An actions wasn't fired within the timeout: ${actionCreator.type}`);
  }
}