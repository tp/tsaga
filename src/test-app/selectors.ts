import { AppState } from './types';

export const getCount = (state: AppState) => state.count;
export const getSelectedUserId = (state: AppState) => state.selectedUser;
export const getUserById = (state: AppState, id: number) => state.usersById[id];
