import { Store, Middleware } from 'redux';
import actionCreatorFactory, { isType, ActionCreator, Action as FSAAction } from 'typescript-fsa';

/**
 * library
 */
type Action = { type: string; payload: any };

class SagaCancelledError extends Error {
  constructor(...args: any[]) {
    super(...args);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SagaCancelledError);
    }
  }
}

class CancellationToken {
  private _canceled = false;

  public cancel() {
    console.error(`cancelling via token`);
    this._canceled = true;
  }

  public get canceled() {
    return this._canceled;
  }
}

class Context<StateT, ActionT extends Action> {
  constructor(private store: Store<StateT, ActionT>, private cancellationToken?: CancellationToken) {
    (this as any).call = this.call.bind(this);
    (this as any).select = this.select.bind(this);
    (this as any).put = this.put.bind(this);
  }

  public put(action: ActionT): void {
    if (this.cancellationToken && this.cancellationToken.canceled) {
      throw new SagaCancelledError(`Saga has been cancelled`);
    }
    // console.error(`put`, action);
    this.store.dispatch(action);
    // console.error(`state after put`, this.store.getState());
  }

  public call<T>(f: () => T): T extends Promise<any> ? T : Promise<T>;
  public call<T, P1>(f: (p1: P1) => T, p1: P1): T extends Promise<any> ? T : Promise<T>;
  public call(f: Function, ...args: any[]): any {
    if (this.cancellationToken && this.cancellationToken.canceled) {
      throw new SagaCancelledError(`Saga has been cancelled`);
    }

    return Promise.resolve(f(...args));
  }

  public select<T>(selector: (state: StateT) => T, p1?: never, p2?: never): T;
  public select<P1, T>(selector: (state: StateT, p1: P1) => T, p1: P1, p2?: never): T;
  public select<P1, P2, T>(selector: (state: StateT, p1: P1, p2: P2) => T, p1: P1, p2: P2): T;
  public select<T>(selector: (state: StateT, ...args: any[]) => T, ...args: any[]): T {
    if (this.cancellationToken && this.cancellationToken.canceled) {
      throw new SagaCancelledError(`Saga has been cancelled`);
    }

    return selector(this.store.getState(), ...args);
  }
}

type Saga<StateT, ActionT extends Action, Payload> = {
  actionCreator: ActionCreator<Payload>;
  saga: (ctx: Context<StateT, ActionT>, action: FSAAction<Payload>) => Promise<void>;
  type: 'every' | 'latest';
};

function createTypedForEvery<StateT, ActionT extends Action>(): (<Payload>(
  actionCreator: ActionCreator<Payload>,
  saga: (ctx: Context<StateT, ActionT>, action: FSAAction<Payload>) => Promise<void>,
) => Saga<StateT, ActionT, Payload>) {
  return (actionCreator, saga) => {
    return {
      actionCreator,
      saga,
      type: 'every',
    };
  };
}

function createTypedForLatest<StateT, ActionT extends Action>(): (<Payload>(
  actionCreator: ActionCreator<Payload>,
  saga: (ctx: Context<StateT, ActionT>, action: FSAAction<Payload>) => Promise<void>,
) => Saga<StateT, ActionT, Payload>) {
  return (actionCreator, saga) => {
    return {
      actionCreator,
      saga,
      type: 'latest',
    };
  };
}

type AnySaga = Saga<any, any, any>;

export function tsagaReduxMiddleware(...sagas: AnySaga[]) {
  // TODO: Remove completed sagas from this (currently leaks all results)
  const sagaPromises: any = [];
  const cancellationTokens = new Map<AnySaga, CancellationToken>();

  const middleWare: Middleware = (api) => {
    return function next(next) {
      return function(action) {
        console.error(`action`, action, `state`, api.getState());

        next(action);

        for (const saga of sagas) {
          if (isType(action, saga.actionCreator)) {
            let cancellationToken;
            if (saga.type === 'latest') {
              const runningSagaCancellationToken = cancellationTokens.get(saga);
              if (runningSagaCancellationToken) {
                runningSagaCancellationToken.cancel();
              }

              cancellationToken = new CancellationToken();
              cancellationTokens.set(saga, cancellationToken);
            }

            const context = new Context(
              api as any /* subscribe is missing, but that's fine for now */,
              cancellationToken,
            );
            // console.error(`action matches expected creator`, action, `running saga`);

            sagaPromises.push(
              saga
                .saga(context, action)
                .then((e) => 'completed')
                .catch((e) => {
                  if (e instanceof SagaCancelledError) {
                    return 'cancelled';
                  }

                  console.error(`Saga failed`, e);
                  return 'failed';
                }),
            );
          }
        }
      };
    };
  };

  const sagaCompletion = async (): Promise<void> => {
    const promises = sagaPromises.slice(0);

    const res = await Promise.all(promises);
    console.error(`res`, res);
  };

  return { middleware: middleWare, sagaCompletion };
}

/**
 * consumer
 *
 *
 */

// helpers
function sleep(timeoutMS: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), timeoutMS);
  });
}

// Know the store here already? Or add that later?
const forEvery = createTypedForEvery<AppState, Action>();
const forLatest = createTypedForLatest<AppState, Action>();

type User = {
  id: number;
  name: string;
};

type AppState = {
  count: number;
  selectedUser: number | null;
  usersById: { [key: number]: User | undefined };
};

// action creators
const createActionCreator = actionCreatorFactory('User');
export const setCount = createActionCreator<{ count: number }>('set_count');
export const userSelected = createActionCreator<{ id: number }>('selected');
export const userLoaded = createActionCreator<{ user: User }>('loaded');

// selectors
const getCount = (state: AppState) => state.count;
const getSelectedUserId = (state: AppState) => state.selectedUser;
const getUserById = (state: AppState, id: number) => state.usersById[id];

const initialState: AppState = {
  count: 0,
  selectedUser: null,
  usersById: {},
};

export function userReducer(state = initialState, action: Action): AppState {
  if (isType(action, userSelected)) {
    // console.error(`reducer: user selected`);
    return { ...state, selectedUser: action.payload.id };
  } else if (isType(action, userLoaded)) {
    // console.error(`reducer: user loaded`);
    return {
      ...state,
      usersById: {
        ...state.usersById,
        [action.payload.user.id]: action.payload.user,
      },
    };
  } else if (isType(action, setCount)) {
    console.error(`reducer: set count`, action.payload);
    return {
      ...state,
      count: action.payload.count,
    };
  } else {
    // console.error(`reducer unhandled action`, action);
    return state;
  }
}

async function loadUser(id: number): Promise<User> {
  return {
    id,
    name: 'Blob',
  };
}

// saga, no typing needed as they are provided by the forEvery.
// But then the question becomes, when is the forEvery being bound?
// Would the reader monad pattern be better suitable? Would require type annotations on the saga (as it's not yet connected to any particular store)?
// Also can we better match the message type to the `action` parameter, such that they are always in sync and type safe?
export const watchForUserSelect = forEvery(userSelected, async ({ call, put, select }, action) => {
  //   console.log(`load user ${action.payload.id} if needed`);

  const currentUserId = select(getSelectedUserId); // Could of course use the action here, but wanting to test selector with different cardinatlities
  if (currentUserId !== action.payload.id) {
    throw new Error(
      `State does not match expectation based on action \,
      currentUserId = ${currentUserId} \n
      action.payload.id = ${action.payload.id}`,
    );
  }

  const user = select(getUserById, action.payload.id);
  if (!user) {
    // console.error(`loading user`);
    const user = await call(loadUser, action.payload.id);
    put(userLoaded({ user }));
  } else {
    console.log(`not loading user, already present`);
  }
});

export const watchForUserSelectLatest = forLatest(userSelected, watchForUserSelect.saga);

function increaseCounter(ctx: Context<AppState, Action>) {
  const { call, put, select } = ctx;

  const count = select(getCount);
  console.error(`about to set new count:`, count + 1);
  put(setCount({ count: count + 1 }));
  console.error(`count set`, select(getCount));
}

export const increaseSelectedUserAfter3s = forLatest(userSelected, async (ctx, action) => {
  const { call, put, select } = ctx;

  console.error(`about to sleep`);

  await sleep(3000);

  console.error(`sleep done`);
  await call(increaseCounter, ctx);
});
