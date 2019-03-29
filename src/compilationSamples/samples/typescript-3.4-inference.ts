import { SagaEnvironment } from '../../lib';

export type AppEnv = SagaEnvironment<{}>;

function id<T>(value: T): T {
  return value;
}

const saga1 = ($: AppEnv, newCount: number) => {
  const s = $.call(id, '');

  if (typeof s === 'string') {
    return;
  }

  return s.toString(); // due to the return above, `s` should be never and doesn't provide `toString()`
};

const saga2 = ($: AppEnv, newCount: number) => {
  let n = $.call(id, (() => newCount)());

  n = 'string'; // string should not be assignable to number

  console.log(n);
};
