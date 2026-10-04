const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

/**
 * Architecture boundaries are enforced by lint rules rather than convention:
 *
 * - `src/domain` is the pure business core. It may not import React, React Native
 *   or Expo, so it stays testable in plain Node and reusable by future clients.
 * - Screens and feature modules may not talk to SQLite or the network directly;
 *   they must go through repositories and domain services.
 */
module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: [
      'dist/*',
      'coverage/*',
      'android/*',
      'ios/*',
      '.expo/*',
      'node_modules/*',
      'expo-env.d.ts',
    ],
  },
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react/*',
                'react-native',
                'react-native/*',
                'expo',
                'expo-*',
                'expo-*/*',
                '@expo/*',
                'react-native-*',
              ],
              message:
                'The domain layer must stay free of React Native/Expo imports so it remains pure and testable.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/**/*.tsx', 'src/app/**/*.ts', 'src/features/**/*.tsx', 'src/features/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['expo-sqlite', 'src/data/local/**', '@/data/local/**'],
              message:
                'UI must not access SQLite directly. Depend on a repository interface instead.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'tests/**/*.ts', 'tests/**/*.tsx', 'scripts/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
]);
