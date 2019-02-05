/**
 * Types used in the app
 */

export type AppState = {
  count: number;
  selectedUser: number | null;
  usersById: { [key: number]: User | undefined };
};

export type User = {
  id: number;
  name: string;
};
