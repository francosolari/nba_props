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
      const res = await axios.get(`/api/v2/leaderboards/ist/${seasonSlug}`);
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Process standings data into a more usable format
  const processedStandings = useMemo(() => {
    if (!standingsData) return { East: {}, West: {} };
    return standingsData;
  }, [standingsData]);

  // Extract user leaderboard
  const userLeaderboard = useMemo(() => {
    if (!leaderboardData?.leaderboard) return [];
    return leaderboardData.leaderboard;
  }, [leaderboardData]);

  // Get stats from leaderboard response
  const stats = useMemo(() => {
    if (!leaderboardData) {
      return {
        totalUsers: 0,
        totalPredictions: 0,
        avgAccuracy: 0,
      };
    }

    return {
      totalUsers: leaderboardData.total_users || 0,
      totalPredictions: leaderboardData.total_predictions || 0,
      avgAccuracy: leaderboardData.avg_accuracy || 0,
    };
  }, [leaderboardData]);

  // Get list of all groups for rendering, sorted A -> B -> C
  const groups = useMemo(() => {
    const groupList = [];

    ['East', 'West'].forEach(conference => {
      const confGroups = processedStandings[conference] || {};

      // Sort groups alphabetically (A, B, C)
      const sortedGroupNames = Object.keys(confGroups).sort((a, b) => {
        // Extract the letter from group names like "East Group A"
        const letterA = a.split(' ').pop();
        const letterB = b.split(' ').pop();
        return letterA.localeCompare(letterB);
      });

      sortedGroupNames.forEach(groupName => {
        groupList.push({
          conference,
          name: groupName,
          teams: confGroups[groupName] || [],
        });
      });
    });

    return groupList;
  }, [processedStandings]);

  // Extract wildcard standings (2nd/3rd place teams competing for wildcard)
  const wildcardRace = useMemo(() => {
    const east = [];
    const west = [];

    ['East', 'West'].forEach(conference => {
      const confGroups = processedStandings[conference] || {};
      const targetArray = conference === 'East' ? east : west;

      Object.entries(confGroups).forEach(([groupName, teams]) => {
        // Get teams that aren't first place (potential wildcard contenders)
        const wildcardContenders = teams.filter(team =>
          (team.group_rank || team.ist_group_rank) !== 1
        );
        // Add the group name to each team
        wildcardContenders.forEach(team => {
          team.ist_group = groupName;
        });
        targetArray.push(...wildcardContenders);
      });

      // Sort by wildcard rank
      targetArray.sort((a, b) => {
        const rankA = a.wildcard_rank || a.ist_wildcard_rank || 999;
        const rankB = b.wildcard_rank || b.ist_wildcard_rank || 999;
        return rankA - rankB;
      });
    });

    return { East: east, West: west };
  }, [processedStandings]);

  const isLoading = standingsLoading || leaderboardLoading;
  const error = standingsError || leaderboardError;

  // Get season info from leaderboard data
  const season = useMemo(() => {
    if (!leaderboardData?.season) return null;
    return leaderboardData.season;
  }, [leaderboardData]);

  return {
    standings: processedStandings,
    groups,
    wildcardRace,
    userLeaderboard,
    stats,
    season,
    error,
    isLoading,
  };
}

export default useISTData;
