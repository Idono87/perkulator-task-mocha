const isIntegrationTest = Boolean(process.env.INTEGRATION_TEST);

module.exports = {
  allowUncaught: false,
  bail: false,
  delay: false,
  ui: 'bdd',
  timeout: 5000,
  recursive: true,
  exit: true,
  useStrict: true,
  extensions: ['.test.ts'],
  exclude: ['**/fixtures/**/*'],
  require: ['ts-node/register'],
  reporter: 'min',
  spec: isIntegrationTest ? 'src/__tests__/integration/**/*' : 'src/__tests__/unit/**/*',
};
