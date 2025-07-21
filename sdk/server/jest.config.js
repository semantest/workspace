module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/test-setup.ts',
    '!src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1',
    '@semantest/core': '<rootDir>/../core/src',
    '@semantest/contracts': '<rootDir>/../contracts/src'
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  // Increase timeout for integration tests
  testTimeout: 30000
};