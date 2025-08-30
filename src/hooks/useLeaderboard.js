import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useMemo } from 'react';

/**
 * Custom hook for fetching and processing leaderboard data
 * @param {string} seasonSlug - The season identifier, defaults to 'current'
 * @returns {Object} - Returns data, error, isLoading states and calculated totals
 */
function useLeaderboard(seasonSlug = 'current') {
  const { data: leaderboardData, error, isLoading } = useQuery(
    ['leaderboard', seasonSlug], 
    async () => {
      const response = await axios.get(`/api/v2/leaderboard/${seasonSlug}`);
      return response.data || [];
    },
    {
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
      refetchOnWindowFocus: false,
    }
  );

  // Calculate memoized totals from the leaderboard data
  const totals = useMemo(() => {
    if (!leaderboardData || leaderboardData.length === 0) {
      return { totalPlayers: 0, totalPredictions: 0, avgAccuracy: 0 };
    }
    
    const totalPlayers = leaderboardData.length;
    
    // Calculate total predictions if categories data is available
    let totalPredictions = 0;
    let totalAccuracy = 0;
    let usersWithAccuracy = 0;
    
    leaderboardData.forEach(entry => {
      // Handle prediction counting if the data structure includes categories
      if (entry.categories) {
        totalPredictions += entry.categories.reduce(
          (categorySum, category) => categorySum + (category.predictions?.length || 0), 
          0
        );
      }
      
      // Handle accuracy calculation if available
      if (entry.user && typeof entry.user.accuracy === 'number') {
        totalAccuracy += entry.user.accuracy;
        usersWithAccuracy++;
      } else if (typeof entry.accuracy === 'number') {
        totalAccuracy += entry.accuracy;
        usersWithAccuracy++;
      }
    });
    
    // Calculate average accuracy
    const avgAccuracy = usersWithAccuracy > 0 ? totalAccuracy / usersWithAccuracy : 0;
    
    return { totalPlayers, totalPredictions, avgAccuracy };
  }, [leaderboardData]);
  
  return { data: leaderboardData, error, isLoading, totals };
}

export default useLeaderboard;

