import { createReactConfig } from '@biz-checks/eslint-config/react.js';

export default [
  ...createReactConfig({ tsconfigRootDir: import.meta.dirname }),
  {
    rules: {
      // Next.js conventions diverge from the strict-by-default base.
      '@typescript-eslint/no-misused-promises': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },
];
