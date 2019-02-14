/**
 * Types used in the app
 */

export interface AppState {
  count: number;
  selectedUser: number | null;
  usersById: { [key: number]: User | undefined };
}

export interface User {
  id: number;
  name: string;
}
