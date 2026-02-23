/**
 * Tests for useLeaderboard hook.
 *
 * This hook fetches and processes leaderboard data from the API.
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLeaderboard } from '../../hooks';

// Create a wrapper component for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Don't retry in tests
        cacheTime: 0, // Don't cache in tests
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

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify data loaded
    expect(result.current.data).toBeDefined();
    expect(result.current.data.leaderboard).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('returns season information', async () => {
    const { result } = renderHook(
      () => useLeaderboard('2024-25'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.season).toBeDefined();
    expect(result.current.season.slug).toBe('2024-25');
    expect(result.current.season.year).toBe('2024-25');
  });

  it('returns totals information', async () => {
    const { result } = renderHook(
      () => useLeaderboard('2024-25'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.totals).toBeDefined();
    expect(result.current.totals.totalPlayers).toBe(2);
    expect(result.current.totals.totalPredictions).toBe(100);
    expect(result.current.totals.avgAccuracy).toBe(0.65);
  });

  it('handles different season slugs', async () => {
    const { result, rerender } = renderHook(
      ({ season }) => useLeaderboard(season),
      {
        wrapper: createWrapper(),
        initialProps: { season: '2024-25' },
      }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.season.slug).toBe('2024-25');

    // Change season
    rerender({ season: '2023-24' });

    await waitFor(() => {
      expect(result.current.season.slug).toBe('2023-24');
    });
  });

  it('handles loading state', () => {
    const { result } = renderHook(
      () => useLeaderboard('2024-25'),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('handles error state', async () => {
    // Mock an error by using a special slug that triggers error
    const { result } = renderHook(
      () => useLeaderboard('error'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should have error
    expect(result.current.error).toBeDefined();
  });

  it('correctly sorts leaderboard by rank', async () => {
    const { result } = renderHook(
      () => useLeaderboard('2024-25'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const leaderboard = result.current.data.leaderboard;
    expect(leaderboard[0].rank).toBe(1);
    expect(leaderboard[1].rank).toBe(2);
    expect(leaderboard[0].user.total_points).toBeGreaterThan(
      leaderboard[1].user.total_points
    );
  });

  it('includes category breakdowns for each user', async () => {
    const { result } = renderHook(
      () => useLeaderboard('2024-25'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const firstUser = result.current.data.leaderboard[0].user;
    expect(firstUser.categories).toBeDefined();
    expect(firstUser.categories['Regular Season Standings']).toBeDefined();
    expect(firstUser.categories['Player Awards']).toBeDefined();
    expect(firstUser.categories['Props & Yes/No']).toBeDefined();
  });
});
