/**
 * Jest setup file for frontend tests.
 *
 * This file runs before each test file and sets up the testing environment.
 */

// Import jest-dom matchers
import '@testing-library/jest-dom';

// Mock Service Worker for API mocking
import { server } from './__mocks__/msw/server';

// Global test utilities
import { cleanup } from '@testing-library/react';

// ============================================================================
// MSW Setup (Mock Service Worker)
// ============================================================================

// Start MSW server before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn', // Warn about unhandled requests
  });
});

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
  cleanup(); // Cleanup React Testing Library
});

// Stop MSW server after all tests
afterAll(() => {
  server.close();
});

// ============================================================================
// Global Mocks
// ============================================================================

// Mock window.matchMedia (used by some components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver (used by some components)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
};

// Mock ResizeObserver (used by some components)
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock console methods to reduce noise in tests
// Uncomment if needed
// global.console = {
//   ...console,
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// ============================================================================
// Custom Matchers
// ============================================================================

// Add custom matchers if needed
expect.extend({
  // Example custom matcher
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// ============================================================================
// Environment Variables for Tests
// ============================================================================

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.REACT_APP_API_URL = 'http://localhost:8000';
