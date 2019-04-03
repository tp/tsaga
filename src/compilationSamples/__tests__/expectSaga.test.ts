import { diagnosticsForFile } from '../helpers/helpers';

test('expectSaga forces compiler errors when invalid types are used', async () => {
  const diagnostics = diagnosticsForFile(`${__dirname}/../samples/expectSaga-test.ts`);

  expect(diagnostics).toMatchSnapshot();

  // explicit alignment with comments in file, to catch accidental snapshot overwrite
  expect(diagnostics.length).toBe(4);
});
