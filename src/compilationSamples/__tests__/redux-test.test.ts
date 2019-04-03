import { diagnosticsForFile } from '../helpers/helpers';

test('Test forces compiler errors when invalid types are used', async () => {
  const diagnostics = diagnosticsForFile(`${__dirname}/../samples/redux-test.ts`);

  expect(diagnostics).toMatchSnapshot();

  // explicit alignment with comments in file, to catch accidental snapshot overwrite
  expect(diagnostics.length).toBe(5);
});
