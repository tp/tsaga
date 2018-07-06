import test from 'ava';

test('foo', (t) => {
  const a = { a: 3 };
  const b: any = 3;

  t.deepEqual(a, b);
});
