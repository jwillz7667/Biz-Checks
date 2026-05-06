import { createConfig } from '@biz-checks/eslint-config';

export default [
  ...createConfig({ tsconfigRootDir: import.meta.dirname }),
  {
    rules: {
      // Fastify plugin / route registration callbacks are required to be async
      // by the framework's type contract, even when they don't await anything.
      '@typescript-eslint/require-await': 'off',
    },
  },
];
