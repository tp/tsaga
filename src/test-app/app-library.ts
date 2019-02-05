import { User } from './types';

export function sleep(timeoutMS: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), timeoutMS);
  });
}

export async function loadUser(id: number): Promise<User> {
  return {
    id,
    name: 'Blob',
  };
}
