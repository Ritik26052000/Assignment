/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  setupFiles: ['<rootDir>/src/test/polyfills.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testMatch: ['**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    // `import.meta.env` is not valid in CommonJS/Jest, so config is mocked.
    '^@/lib/config$': '<rootDir>/src/test/config.mock.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|svg|png|jpg)$': 'identity-obj-proxy',
  },
  clearMocks: true,
}
