import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import jsdoc from 'eslint-plugin-jsdoc';
import n from 'eslint-plugin-n';
import security from 'eslint-plugin-security';
import globals from 'globals';

const nodeFiles = ['**/*.{js,mjs,cjs}'];

export default [
  {
    ignores: [
      'attestations/**',
      'artifacts/**',
      'broadcast/**',
      'cache/**',
      'deployments/**',
      'node_modules/**',
      'out/**'
    ]
  },
  js.configs.recommended,
  {
    files: nodeFiles,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    },
    plugins: {
      jsdoc,
      n,
      security
    },
    rules: {
      'array-callback-return': 'error',
      'consistent-return': 'error',
      'default-case': 'error',
      eqeqeq: ['error', 'always'],
      'jsdoc/check-alignment': 'error',
      'jsdoc/check-indentation': 'error',
      'jsdoc/require-description': 'off',
      'jsdoc/require-jsdoc': 'off',
      'n/no-missing-import': 'off',
      'n/no-process-exit': 'off',
      'n/no-unpublished-import': 'off',
      'no-console': 'off',
      'no-implicit-coercion': 'error',
      'no-shadow': 'error',
      'no-undef-init': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'object-shorthand': ['error', 'always'],
      'prefer-arrow-callback': ['error', { allowNamedFunctions: true }],
      'prefer-const': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'off',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-new-buffer': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-non-literal-require': 'error',
      'security/detect-object-injection': 'off',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'error'
    }
  },
  eslintConfigPrettier
];
