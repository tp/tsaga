export default {
  concurrency: 5,
  failWithoutAssertions: true,
  files: ['**/tests/*.test.ts'],
  compileEnhancements: false,
  extensions: ['ts'],
  require: ['ts-node/register'],
};
