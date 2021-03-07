module.exports = {
  allowUncaught: false,
  bail: false,
  delay: false,
  ui: 'bdd',
  timeout: 5000,
  recursive: true,
  exit: true,
  useStrict: true,
  extensions: ['.ts'],
  require: ['ts-node/register'],
  reporter: 'min',
  spec: ['src/__tests__/**/*.test.ts'],
};
