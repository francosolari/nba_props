import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useMemo } from 'react';

/**
 * Custom hook for fetching IST (In-Season Tournament) data
 * @param {string} seasonSlug - The season identifier, defaults to 'current'
 * @returns {Object} - Returns standings, userLeaderboard, error, isLoading states
 */
function useISTData(seasonSlug = 'current') {
  // Fetch IST standings grouped by conference and group
  const {
    data: standingsData,
    error: standingsError,
    isLoading: standingsLoading
  } = useQuery({
    queryKey: ['ist-standings', seasonSlug],
    queryFn: async () => {
      const res = await axios.get(`/api/v2/standings/ist/${seasonSlug}`);
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch IST user leaderboard (users ranked by IST points only)
  const {
    data: leaderboardData,
    error: leaderboardError,
    isLoading: leaderboardLoading
  } = useQuery({
    queryKey: ['ist-leaderboard', seasonSlug],
    queryFn: async () => {
      // This endpoint needs to be created - for now we'll use a placeholder
      // that filters regular leaderboard data for IST-specific points
      try {
        const res = await axios.get(`/api/v2/leaderboards/ist/${seasonSlug}`);
        return res.data;
      } catch (e) {
        // Fallback: fetch all user answers and filter for IST questions
        const res = await axios.get(`/api/v2/answers/all-by-season/`, {
          params: { season_slug: seasonSlug }
        });

        // Process to extract IST-specific points
        const istUsers = new Map();

        if (res.data?.items) {
          res.data.items.forEach(item => {
            const user = item.user;
            const istAnswers = (item.answers || []).filter(a =>
              a.question_type === 'ist'
            );

            if (istAnswers.length > 0) {
              const totalPoints = istAnswers.reduce((sum, a) =>
                sum + (a.points_earned || 0), 0
              );

              const correctAnswers = istAnswers.filter(a => a.is_correct === true).length;
              const accuracy = istAnswers.length > 0
                ? correctAnswers / istAnswers.length
                : 0;

              istUsers.set(user.id, {
                id: user.id,
                username: user.username,
                display_name: user.display_name || user.username,
                avatar: user.avatar || null,
                total_points: totalPoints,
                accuracy: accuracy,
                predictions: istAnswers.map(a => ({
                  question: a.question_text,
                  answer: a.answer,
                  points: a.points_earned || 0,
                  correct: a.is_correct,
                  prediction_type: a.prediction_type,
                })),
              });
            }
          });
        }

        // Convert to array and sort by points
        const leaderboard = Array.from(istUsers.values())
          .sort((a, b) => b.total_points - a.total_points)
          .map((user, index) => ({
            rank: index + 1,
            user: user,
          }));

        return { leaderboard };
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Process standings data into a more usable format
  const processedStandings = useMemo(() => {
    if (!standingsData) return { East: {}, West: {} };

    // Data is already organized by conference and group
    // Example: { East: { "East Group A": [...], "East Group B": [...] }, West: {...} }
    return standingsData;
  }, [standingsData]);

  // Extract user leaderboard
  const userLeaderboard = useMemo(() => {
    if (!leaderboardData?.leaderboard) return [];
    return leaderboardData.leaderboard;
  }, [leaderboardData]);

  // Calculate totals and stats
  const stats = useMemo(() => {
    const totalUsers = userLeaderboard.length;

    let totalPredictions = 0;
    let correctPredictions = 0;

    userLeaderboard.forEach(entry => {
      const predictions = entry.user?.predictions || [];
      totalPredictions += predictions.length;
      correctPredictions += predictions.filter(p => p.correct === true).length;
    });

    const avgAccuracy = totalPredictions > 0
      ? correctPredictions / totalPredictions
      : 0;

    return {
      totalUsers,
      totalPredictions,
      avgAccuracy,
    };
  }, [userLeaderboard]);

  // Get list of all groups for rendering
  const groups = useMemo(() => {
    const groupList = [];

    ['East', 'West'].forEach(conference => {
      const confGroups = processedStandings[conference] || {};
      Object.keys(confGroups).forEach(groupName => {
        groupList.push({
          conference,
          name: groupName,
          teams: confGroups[groupName] || [],
        });
      });
    });

    return groupList;
  }, [processedStandings]);

  const isLoading = standingsLoading || leaderboardLoading;
  const error = standingsError || leaderboardError;

  return {
    standings: processedStandings,
    groups,
    userLeaderboard,
    stats,
    error,
    isLoading,
  };
}

export default useISTData;
