/** @type {import('jest').Config} */
module.exports = {
  // Test environment
  testEnvironment: 'jsdom',

  // Setup files - use the more comprehensive setupTests.js
  setupFilesAfterEnv: ['<rootDir>/frontend/src/setupTests.js'],

  // Module paths
  roots: ['<rootDir>/frontend/src'],

  // Test match patterns
  testMatch: [
    '<rootDir>/frontend/src/**/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/frontend/src/**/*.(spec|test).[jt]s?(x)',
  ],

  // Transform files with babel
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        '@babel/preset-env',
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript',
      ],
    }],
  },

  // Module name mapper for static assets and styles
  moduleNameMapper: {
    // CSS modules
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',

    // Static assets
    '\\.(jpg|jpeg|png|gif|svg|woff|woff2|ttf|eot)$': '<rootDir>/frontend/src/__mocks__/fileMock.js',

    // Absolute imports (if using path aliases)
    '^@/(.*)$': '<rootDir>/frontend/src/$1',
    '^@components/(.*)$': '<rootDir>/frontend/src/components/$1',
    '^@hooks/(.*)$': '<rootDir>/frontend/src/hooks/$1',
    '^@pages/(.*)$': '<rootDir>/frontend/src/pages/$1',

    // React packages (ensure correct resolution)
    '^react$': '<rootDir>/node_modules/react',
    '^react-dom$': '<rootDir>/node_modules/react-dom',
    '^react-dom/client$': '<rootDir>/node_modules/react-dom/client',
  },

  // Coverage configuration
  collectCoverageFrom: [
    'frontend/src/**/*.{js,jsx,ts,tsx}',
    '!frontend/src/**/*.d.ts',
    '!frontend/src/**/*.stories.{js,jsx,ts,tsx}',
    '!frontend/src/**/__tests__/**',
    '!frontend/src/**/*.test.{js,jsx,ts,tsx}',
    '!frontend/src/**/*.spec.{js,jsx,ts,tsx}',
    '!frontend/src/index.jsx',
    '!frontend/src/setupTests.js',
  ],

  // Coverage thresholds (start low, increase over time)
  coverageThreshold: {
    global: {
      statements: 50,
      branches: 40,
      functions: 50,
      lines: 50,
    },
  },

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
  ],

  // Coverage directory
  coverageDirectory: '<rootDir>/coverage',

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/',
    '/coverage/',
  ],

  // Transform ignore patterns - allow ESM modules
  transformIgnorePatterns: [
    'node_modules/(?!(lucide-react|@tanstack)/)',
  ],

  // Module file extensions
  moduleFileExtensions: [
    'js',
    'jsx',
    'ts',
    'tsx',
    'json',
    'node',
  ],

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Reset mocks between tests
  resetMocks: true,

  // Timeout for tests (in milliseconds)
  testTimeout: 10000,
};
