import { ActionCreator } from 'typescript-fsa';

export default class TimeoutError extends Error {
  public readonly type = 'timeout';

  constructor(actionCreator: ActionCreator<any>) {
    super(`Action wasn't dispatched within the timeout: ${actionCreator.type}`);
  }
}
