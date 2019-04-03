import { diagnosticsForFile } from '../helpers/helpers';

test('Generic types are not correctly inferred (TS 3.4)', async () => {
  const diagnostics = diagnosticsForFile(`${__dirname}/../samples/typescript-3.4-inference.ts`);

  expect(diagnostics).toMatchSnapshot();

  // explicit alignment with comments in file, to catch accidental snapshot overwrite
  expect(diagnostics.length).toBe(2);
});
