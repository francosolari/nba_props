/**
 * MSW server setup for Node.js test environment.
 *
 * This server intercepts API requests during tests and returns mock responses.
 */
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup MSW server with default handlers
export const server = setupServer(...handlers);
