module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/frontend/jest.setup.js'],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest',
  },
  testMatch: [
    '<rootDir>/frontend/src/**/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/frontend/src/**/*.(spec|test).[jt]s?(x)',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(lucide-react)/)',
  ],
  moduleNameMapper: {
    '^react$': '<rootDir>/node_modules/react',
    '^react-dom$': '<rootDir>/node_modules/react-dom',
    '^react-dom/client$': '<rootDir>/node_modules/react-dom/client',
  },
};
