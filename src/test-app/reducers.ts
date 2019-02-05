import { AppState } from './types';
import { isType } from 'typescript-fsa';
import { Action } from '../lib/types';
import { userSelected, userLoaded, setCount } from './actions';

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
