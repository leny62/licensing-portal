module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin', 'security', 'no-secrets'],
  extends: ['plugin:@typescript-eslint/recommended', 'plugin:security/recommended'],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist/**', 'node_modules/**', 'coverage/**'],
  overrides: [
    {
      files: ['test/**/*.ts'],
      rules: {
        'no-secrets/no-secrets': 'off',
      },
    },
    {
      files: ['src/seed/**/*.ts'],
      rules: {
        'no-console': 'off',
        'no-secrets/no-secrets': 'off',
        'security/detect-non-literal-fs-filename': 'off',
      },
    },
  ],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'error',
    'no-secrets/no-secrets': 'error',
    // TypeScript's type system already prevents unintended property access;
    // this rule generates false positives on bracket notation with constant keys.
    'security/detect-object-injection': 'off',
  },
};
