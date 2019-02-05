/**
 * library
 */
export interface Action<T = any> {
  type: string;
  payload: T;
}
