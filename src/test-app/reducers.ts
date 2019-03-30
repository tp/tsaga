import { Action, isType } from 'typescript-fsa';
import { setCount, userLoaded, userSelected } from './actions';
import { AppState } from './types';

const initialState: AppState = {
  count: 0,
  selectedUser: null,
  usersById: {},
};

export function userReducer(state = initialState, action: Action<any>): AppState {
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
    // console.error(`reducer: set count`, action.payload);
    return {
      ...state,
      count: action.payload.count,
    };
  } else {
    // console.error(`reducer unhandled action`, action);
    return state;
  }
}
