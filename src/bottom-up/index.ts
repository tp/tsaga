import { Store, applyMiddleware, Middleware } from 'redux';
import actionCreatorFactory, { isType, ActionCreator, Action as FSAAction } from 'typescript-fsa';
import { createNoSubstitutionTemplateLiteral } from 'typescript';

/**
 * library
 */
type Action = { type: string; payload: any }; // TODO: Use better action creators / types like FSA

// function select<State, T>(selector: (state: State) => T, p1?: never, p2?: never): T;
// function select<State, P1, T>(selector: (state: State, p1: P1) => T, p1: P1, p2?: never): T;
// function select<State, P1, P2, T>(selector: (state: State, p1: P1, p2: P2) => T, p1: P1, p2: P2): T {
//   throw new Error(`not to be called`);
// }

class Context<StateT, ActionT extends Action> {
  constructor(private store: Store<StateT, ActionT>) {
    (this as any).call = this.call.bind(this);
    (this as any).select = this.select.bind(this);
    (this as any).put = this.put.bind(this);
  }

  public put(action: ActionT): void {
    // console.error(`put`, action);
    this.store.dispatch(action);
    // console.error(`state after put`, this.store.getState());
  }

  public call<T>(f: () => T): T extends Promise<any> ? T : Promise<T>;
  public call<T, P1>(f: (p1: P1) => T, p1: P1): T extends Promise<any> ? T : Promise<T>;
  public call(f: Function, ...args: any[]): any {
    return Promise.resolve(f(...args));
  }

  public select<T>(selector: (state: StateT) => T, p1?: never, p2?: never): T;
  public select<P1, T>(selector: (state: StateT, p1: P1) => T, p1: P1, p2?: never): T;
  public select<P1, P2, T>(selector: (state: StateT, p1: P1, p2: P2) => T, p1: P1, p2: P2): T;
  public select<T>(selector: (state: StateT, ...args: any[]) => T, ...args: any[]): T {
    return selector(this.store.getState(), ...args);
  }
}

type Saga<StateT, ActionT extends Action, Payload> = {
  actionCreator: ActionCreator<Payload>;
  saga: (ctx: Context<StateT, ActionT>, action: FSAAction<Payload>) => void;
};

function createTypedForEvery<StateT, ActionT extends Action>(): (<Payload>(
  actionCreator: ActionCreator<Payload>,
  saga: (ctx: Context<StateT, ActionT>, action: FSAAction<Payload>) => void,
) => Saga<StateT, ActionT, Payload>) {
  return (actionCreator, saga) => {
    return {
      actionCreator,
      saga,
    };
  };
}

type AnySaga = Saga<any, any, any>;

export function tsagaReduxMiddleware(...sagas: AnySaga[]) {
  // TODO: Remove completed sagas from this (currently leaks all results)
  const sagaPromises: any = [];

  const middleWare: Middleware = (api) => {
    return function next(next) {
      return function(action) {
        // console.error(`action`, action, `state`, api.getState());

        next(action);

        for (const saga of sagas) {
          if (isType(action, saga.actionCreator)) {
            const context = new Context(api as any /* subscribe is missing, but that's fine for now */);

            // console.error(`action matches expected creator`, action, `running saga`);

            sagaPromises.push(saga.saga(context, action));
          }
        }
      };
    };
  };

  const sagaCompletion = async (): Promise<void> => {
    const promises = sagaPromises.slice(0);

    await Promise.all(promises);
  };

  return { middleware: middleWare, sagaCompletion };
}

/**
 * consumer
 *
 *
 */

// Know the store here already? Or add that later?
const forEvery = createTypedForEvery<AppState, Action>();

type User = {
  id: number;
  name: string;
};

type AppState = {
  selectedUser: number | null;
  usersById: { [key: number]: User | undefined };
};

// action creators
const createActionCreator = actionCreatorFactory('User');
export const userSelected = createActionCreator<{ id: number }>('selected');
export const userLoaded = createActionCreator<{ user: User }>('loaded');

// selectors
const getSelectedUserId = (state: AppState) => state.selectedUser;
const getUserById = (state: AppState, id: number) => state.usersById[id];

const initialState: AppState = {
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
