import { withLatest, loadProfile } from '../saga-with-take';
import { CountReducerState } from '../../redux-like-with-reducer/saga-with-reducer';

describe('foo', () => {
  beforeEach(() => jest.useRealTimers());

  it('takes', async () => {
    const watcher = withLatest<number, CountReducerState>(1).run(loadProfile);

    const saga1 = watcher.handleMessage(1);
    const saga2 = watcher.handleMessage(2);

    await saga2;

    try {
      await saga1;
    } catch (e) {
      expect(e.message).toEqual(expect.stringContaining('Cancelled'));

      return;
    }

    expect(false).toBe(true); // should not be reached, saga1 should be cancelled
  });
});
