import { getCurrentUserId } from '../samples/redux-like-saga';
import { select } from '../samples/redux/tsaga-redux';
import { Store } from 'redux';

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
  constructor(private store: Store<StateT, ActionT>) {}

  public put(action: ActionT): void {
    this.store.dispatch(action);
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

// type Context<StateT, ActionT> = {
//   put: (action: ActionT) => void;
//   call: (...args: any[]) => Promise<any>;
//   select0: (<T>(selector: (state: StateT) => T) => T);
//   select1: (<T, P1>(selector: (state: StateT, p1: P1) => T, p1: P1) => T);
// };

function createTypedForEvery<StateT, ActionT extends Action>(): (
  actionType: string,
  saga: (ctx: Context<StateT, ActionT>, action: ActionT) => void,
) => { connectTo: (store: Store<StateT, ActionT>) => void } {
  return 0 as any;
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
const userSelected = (id: number) => ({ type: 'user_selected', payload: { id } });
const userLoaded = (user: User) => ({ type: 'user_loaded', payload: { user } });

// selectors
const getSelectedUserId = (state: AppState) => state.selectedUser;
const getUserById = (state: AppState, id: number) => state.usersById[id];

const initialState: AppState = {
  selectedUser: null,
  usersById: {},
};

export function counter(state = initialState, action: Action): AppState {
  switch (action.type) {
    case 'user_selected':
      return { ...state, selectedUser: action.payload.id };
    case 'user_loaded':
      return {
        ...state,
        usersById: {
          ...state.usersById,
          [action.payload.user.id]: action.payload.user,
        },
      };
    default:
      return state;
  }
}

async function loadUser(): Promise<User> {
  return {
    id: -1,
    name: 'Blob',
  };
}

// saga, no typing needed as they are provided by the forEvery.
// But then the question becomes, when is the forEvery being bound?
// Would the reader monad pattern be better suitable? Would require type annotations on the saga (as it's not yet connected to any particular store)?
// Also can we better match the message type to the `action` parameter, such that they are always in sync and type safe?
forEvery('user_selected', async ({ call, put, select }, action) => {
  console.log(`load user if needed`, action.payload.id);

  const currentUserId = select(getSelectedUserId); // Could of course use the action here, but wanting to test selector with different cardinatlities
  if (currentUserId !== action.payload.id) {
    throw new Error(`State does not match expectation based on action`);
  }

  const user = select(getUserById, action.payload.id);
  if (!user) {
    const user = await call(loadUser);
    put({ type: 'user_loaded', payload: user });
  }
});
