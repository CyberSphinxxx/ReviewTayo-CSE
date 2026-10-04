/**
 * Jest configuration.
 *
 * All suites share the `jest-expo` preset so that React Native, Expo modules and
 * TypeScript are transformed identically everywhere. Domain and data tests run in
 * a plain Node environment (`testEnvironment: 'node'`) and never import React
 * Native, which is what makes the domain layer genuinely testable off-device.
 *
 * Domain/data tests exercise a real SQLite database through the `node:sqlite`
 * adapter (see src/data/local/sqlite/node-database.ts), so migration and
 * repository behaviour is verified for real rather than against mocks.
 *
 * @type {import('jest').Config}
 */
module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/tests/**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@content/(.*)$': '<rootDir>/content/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/app/**', '!src/**/index.ts'],
  coverageReporters: ['text-summary', 'lcov'],
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 20000,
  maxWorkers: '50%',
};
