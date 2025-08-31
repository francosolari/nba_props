import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useMemo } from 'react';

/**
 * Custom hook for fetching and processing leaderboard data
 * @param {string} seasonSlug - The season identifier, defaults to 'current'
 * @returns {Object} - Returns data, error, isLoading states and calculated totals
 */
function normalizeLeaderboardData(raw) {
  // New optimized endpoint returns a list
  if (Array.isArray(raw)) {
    return raw.map((u) => ({
      rank: u.rank,
      user: {
        id: u.id,
        username: u.username,
        display_name: u.display_name,
        avatar: u.avatar ?? null,
        total_points: u.total_points ?? u.points ?? 0,
        accuracy: u.accuracy,
        categories: u.categories || {},
        badges: u.badges || [],
      },
    }));
  }

  // Answers endpoint shape: { items: [ { user, answers: [] } ], count }
  if (raw && Array.isArray(raw.items)) {
    return raw.items.map((it) => ({
      user: {
        id: it.user?.id,
        username: it.user?.username,
        display_name: it.user?.display_name || it.user?.username,
        avatar: null,
        total_points: it.user?.points ?? 0,
        accuracy: undefined,
        categories: {},
      },
    }));
  }

  // Temp leaderboard shape: { top_users: [ { user: {...}, points } ] }
  if (raw && Array.isArray(raw.top_users)) {
    return raw.top_users.map((t) => ({
      user: {
        id: t.user?.id,
        username: t.user?.username,
        display_name: t.user?.display_name || t.user?.first_name || t.user?.username,
        avatar: null,
        total_points: t.points ?? 0,
        accuracy: undefined,
        categories: {},
        badges: [],
      },
    }));
  }

  return [];
}

function useLeaderboard(seasonSlug = 'current') {
  const { data, error, isLoading } = useQuery({
    queryKey: ['leaderboard', seasonSlug],
    queryFn: async () => {
      // Prefer the optimized leaderboard route
      try {
        const res = await axios.get(`/api/v2/leaderboards/${seasonSlug}`);
        return normalizeLeaderboardData(res.data);
      } catch (e) {
        // Fallback to temporary leaderboard route
        try {
          const res2 = await axios.get(`/api/v2/leaderboard/${seasonSlug}`);
          return normalizeLeaderboardData(res2.data);
        } catch (e2) {
          // Optional: fallback to answers aggregation shape
          const res3 = await axios.get(`/api/v2/answers/all-by-season/`, { params: { season_slug: seasonSlug } });
          return normalizeLeaderboardData(res3.data);
        }
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Calculate memoized totals from the leaderboard data
  const leaderboardData = Array.isArray(data) ? data : [];

  const totals = useMemo(() => {
    if (!Array.isArray(leaderboardData) || leaderboardData.length === 0) {
      return { totalPlayers: 0, totalPredictions: 0, avgAccuracy: 0 };
    }

    const totalPlayers = leaderboardData.length;

    // Aggregate totals across all users/categories
    let totalPredictions = 0;
    let correctCount = 0;
    let consideredCount = 0;

    leaderboardData.forEach((entry) => {
      const cats = entry?.user?.categories || entry?.categories || {};
      const catList = Array.isArray(cats) ? cats : Object.values(cats || {});
      catList.forEach((c) => {
        const preds = c?.predictions || [];
        totalPredictions += preds.length;
        preds.forEach((p) => {
          // Only consider predictions with a resolved result
          if (p && typeof p.correct === 'boolean') {
            consideredCount += 1;
            if (p.correct) correctCount += 1;
          }
        });
      });
    });

    const avgAccuracy = consideredCount > 0 ? correctCount / consideredCount : 0;

    return { totalPlayers, totalPredictions, avgAccuracy };
  }, [leaderboardData]);
  
  return { data: leaderboardData, error, isLoading, totals };
}

export default useLeaderboard;
