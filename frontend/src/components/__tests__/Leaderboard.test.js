import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { server } from '../../__mocks__/msw/server';
import { renderWithProviders } from '../../test-utils';
import Leaderboard from '../Leaderboard';

// Mock Loader component to avoid animation issues in tests
jest.mock('../Loader', () => () => <div>Loading Leaderboard...</div>);

describe('Leaderboard Component', () => {
  test('renders loading state initially', () => {
    renderWithProviders(<Leaderboard seasonSlug="2024-25" />);
    expect(screen.getByText(/Loading Leaderboard/i)).toBeInTheDocument();
  });

  test('renders leaderboard data when loaded', async () => {
    renderWithProviders(<Leaderboard seasonSlug="2024-25" />);

    // Wait for the leaderboard to load (data comes from default handlers)
    await waitFor(() => {
      expect(screen.getByText(/Leaderboard \(2024-25\)/)).toBeInTheDocument();
    });

    // Check if user data is displayed (based on handlers.js data)
    expect(screen.getByText('Player One')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('Player Two')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  test('displays error message when API call fails', async () => {
    // Override handler to return error
    server.use(
      rest.get('/api/v2/leaderboards/:season', (req, res, ctx) => {
        return res(ctx.status(500));
      }),
      rest.get('/api/v2/leaderboard/:season', (req, res, ctx) => {
        return res(ctx.status(500));
      }),
      rest.get('/api/leaderboard/:season/', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    renderWithProviders(<Leaderboard seasonSlug="2024-25" />);

    // Wait for the error message to appear
    await waitFor(() => {
      expect(screen.getByText('Failed to load leaderboard. Please try again later.')).toBeInTheDocument();
    });
  });

  test('handles empty leaderboard data', async () => {
    // Override the default handler to return empty data
    server.use(
      rest.get('/api/v2/leaderboards/:season', (req, res, ctx) => {
        return res(ctx.json([]));
      }),
      rest.get('/api/v2/leaderboard/:season', (req, res, ctx) => {
        return res(ctx.json({ top_users: [] }));
      }),
      rest.get('/api/leaderboard/:season/', (req, res, ctx) => {
        return res(ctx.json([]));
      })
    );

    renderWithProviders(<Leaderboard seasonSlug="2024-25" />);

    await waitFor(() => {
      expect(screen.getByText(/No leaderboard data available/i)).toBeInTheDocument();
    });
  });
});
