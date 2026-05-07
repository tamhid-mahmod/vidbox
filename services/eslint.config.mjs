// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'eslint.config.mjs'],
  },

  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,

  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    rules: {
      /**
       * NestJS-friendly TypeScript rules
       */
      '@typescript-eslint/no-explicit-any': 'off',

      /**
       * Keep async-related issues visible.
       */
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',

      /**
       * These are too noisy in NestJS because of decorators,
       * dependency injection tokens, guards, interceptors,
       * request objects, and some third-party libraries.
       */
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',

      /**
       * Warn for assigned but unused variables/imports.
       * Prefix with "_" when intentionally unused.
       */
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],

      /**
       * Commonly noisy with NestJS classes/controllers/services.
       */
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-useless-constructor': 'off',

      /**
       * Prettier
       */
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
);
