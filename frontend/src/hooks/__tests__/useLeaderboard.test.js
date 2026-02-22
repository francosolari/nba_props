/**
 * Tests for useLeaderboard hook.
 *
 * The hook fetches leaderboard data from /api/v2/leaderboards/:season (array format),
 * normalizes it, and returns { data, season, error, isLoading, totals }.
 *
 * `data` is the normalized leaderboard array (not an object with .leaderboard).
 * `season` comes from the API response (null when the array endpoint is used).
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { rest } from 'msw';
import { server } from '../../__mocks__/msw/server';
import { useLeaderboard } from '../../hooks';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useLeaderboard', () => {
  it('fetches leaderboard data successfully', async () => {
    const { result } = renderHook(
      () => useLeaderboard('2024-25'),
      { wrapper: createWrapper() }
    );

    // Initially loading with empty data
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toEqual([]);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // data is the normalized leaderboard array
    expect(result.current.data).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('returns normalized user entries with expected fields', async () => {
    const { result } = renderHook(
      () => useLeaderboard('2024-25'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const first = result.current.data[0];
    expect(first.rank).toBe(1);
    expect(first.user.id).toBe(1);
    expect(first.user.username).toBe('player1');
    expect(first.user.display_name).toBe('Player One');
    expect(first.user.total_points).toBe(150);
    expect(first.user.categories).toBeDefined();
  });

  it('returns totals computed from the leaderboard data', async () => {
    const { result } = renderHook(
      () => useLeaderboard('2024-25'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.totals).toBeDefined();
    expect(result.current.totals.totalPlayers).toBe(2);
    // MSW mock data has empty predictions arrays, so totalPredictions is 0
    expect(result.current.totals.totalPredictions).toBe(0);
  });

  it('handles loading state', () => {
    const { result } = renderHook(
      () => useLeaderboard('2024-25'),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toEqual([]);
  });

  it('handles error state when all endpoints fail', async () => {
    // Override MSW handlers to return errors for all leaderboard endpoints
    server.use(
      rest.get('/api/v2/leaderboards/:season', (req, res, ctx) =>
        res(ctx.status(500), ctx.json({ error: 'Server error' }))
      ),
      rest.get('/api/v2/leaderboard/:season', (req, res, ctx) =>
        res(ctx.status(500), ctx.json({ error: 'Server error' }))
      ),
      rest.get('/api/v2/answers/all-by-season/', (req, res, ctx) =>
        res(ctx.status(500), ctx.json({ error: 'Server error' }))
      ),
    );

    const { result } = renderHook(
      () => useLeaderboard('2024-25'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });

  it('correctly ranks leaderboard entries by total_points', async () => {
    const { result } = renderHook(
      () => useLeaderboard('2024-25'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.data).toHaveLength(2);
    });

    expect(result.current.data[0].rank).toBe(1);
    expect(result.current.data[1].rank).toBe(2);
    expect(result.current.data[0].user.total_points).toBeGreaterThan(
      result.current.data[1].user.total_points
    );
  });

  it('includes category breakdowns for each user', async () => {
    const { result } = renderHook(
      () => useLeaderboard('2024-25'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.data).toHaveLength(2);
    });

    const firstUser = result.current.data[0].user;
    expect(firstUser.categories).toBeDefined();
    expect(firstUser.categories['Regular Season Standings']).toBeDefined();
    expect(firstUser.categories['Player Awards']).toBeDefined();
    expect(firstUser.categories['Props & Yes/No']).toBeDefined();
  });
});
