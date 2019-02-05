import { ReduxTsagaContext } from './tsaga-redux';
import { CountReducerState } from '../redux-like-with-reducer/saga-with-reducer';
import { RequestContext } from 'node-fetch';

type MessageMatcher<T> = {
  handleMessage(message: T): Promise<void>;
};

const STALLING_PROMISE: Promise<any> = new Promise(() => {});

function delay(ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    // console.error(`ms`, ms);
    setTimeout(() => {
      //   console.error(`Resolve timer`, ms);
      resolve();
    }, ms);
  });
}

// function forEvery<T, State>(
//   action: T,
// ): { spawn: (saga: (ctx: ReduxTsagaContext<State>, action: T) => void) => MessageMatcher } {
//   return {
//     spawn: (saga) => {
//       saga('ctx' as any, action);
//     },
//   };
// }

// TODO: Support args for to the saga; message should be 2 argument for saga to support variadic arguments (contrary to redux-sage)
export function withLatest<T, State>( // TODO: Move `State` down to `run`
  actionMatcher: T,
): { run: (saga: (ctx: ReduxTsagaContext<State>, action: T) => Promise<void>) => MessageMatcher<T> } {
  return {
    run: (saga) => {
      let prevContext: (ReduxTsagaContext<State> & { cancellationToken: { canceled: boolean } }) | undefined;

      return {
        handleMessage: async (message) => {
          if (typeof actionMatcher !== typeof message) {
            // TODO: Proper check
            return;
          }

          return new Promise<void>((resolve, reject) => {
            // add store
            if (prevContext) {
              prevContext.cancellationToken.canceled = true;
            }

            const cancellationToken = { canceled: false };
            const ctx: ReduxTsagaContext<State> & { cancellationToken: { canceled: boolean } } = {
              call: async <T>(f: (...args: any[]) => Promise<T>, ...args: any[]): Promise<T> => {
                //   console.error(new Date().toJSON(), `called`);

                if (cancellationToken.canceled) {
                  reject(new Error('Cancelled'));
                  return STALLING_PROMISE;
                }

                const result = await f.call(window, ...args);

                //   console.error(new Date().toJSON(), `result came in for `, cancellationToken.canceled, message);

                if (cancellationToken.canceled) {
                  reject(new Error('Cancelled'));
                  return STALLING_PROMISE;
                }

                return result;
              },
              select: async (): Promise<any> => {
                if (cancellationToken.canceled) {
                  reject(new Error('Cancelled'));
                  return STALLING_PROMISE;
                }
              },
              cancellationToken,
            };
            prevContext = ctx;

            void saga(ctx, message).then(resolve);
          });
        },
      };
    },
  };
}

export async function loadProfile({ call, select }: ReduxTsagaContext<CountReducerState>, message: number) {
  await call(delay, 3000);
  //   console.error(`1s after saga was called with ${message}`);
}

withLatest<number, CountReducerState>(1).run(loadProfile);
// forEvery(1).spawn(loadProfile);
