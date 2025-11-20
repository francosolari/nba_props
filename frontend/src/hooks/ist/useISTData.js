import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useMemo } from 'react';

/**
 * Custom hook for fetching IST (In-Season Tournament) data
 * @param {string} seasonSlug - The season identifier, defaults to 'current'
 * @returns {Object} - Returns standings, userLeaderboard, error, isLoading states
 */
function useISTData(seasonSlug = 'current') {
  const queryClient = useQueryClient();

  const {
    data,
    error: combinedError,
    isLoading,
    isFetching
  } = useQuery({
    queryKey: ['ist-center', seasonSlug],
    queryFn: async () => {
      const [standingsRes, leaderboardRes] = await Promise.all([
        axios.get(`/api/v2/standings/ist/${seasonSlug}`),
        axios.get(`/api/v2/leaderboards/ist/${seasonSlug}`),
      ]);

      queryClient.setQueryData(['ist-standings', seasonSlug], standingsRes.data);
      queryClient.setQueryData(['ist-leaderboard', seasonSlug], leaderboardRes.data);

      return {
        standingsData: standingsRes.data,
        leaderboardData: leaderboardRes.data,
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    initialData: () => {
      const cachedStandings = queryClient.getQueryData(['ist-standings', seasonSlug]);
      const cachedLeaderboard = queryClient.getQueryData(['ist-leaderboard', seasonSlug]);

      if (cachedStandings && cachedLeaderboard) {
        return {
          standingsData: cachedStandings,
          leaderboardData: cachedLeaderboard,
        };
      }

      return undefined;
    },
  });

  const standingsData = data?.standingsData;
  const leaderboardData = data?.leaderboardData;

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

  const error = combinedError;

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
    isRefetching: isFetching && !isLoading,
  };
}

export default useISTData;
