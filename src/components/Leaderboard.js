// src/components/Leaderboard.js

import React, { useState, useEffect, memo } from 'react';
import axios from 'axios';
import Loader from './Loader';  // Reusable Loader component

/**
 * Leaderboard Component
 * Displays graded points for each contestant.
 *
 * Props:
 * - seasonSlug (string): The slug for the current NBA season.
 *
 * Usage:
 * <Leaderboard seasonSlug="2024-25" />
 */
const Leaderboard = memo(({ seasonSlug }) => {
  // State to hold leaderboard data
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true); // Manage loading state
  const [error, setError] = useState(null); // Manage error state

  /**
   * Fetches leaderboard data from the API.
   */
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true); // Start loading
        setError(null); // Reset error

        // Replace '/api/leaderboard/' with your actual API endpoint
        const response = await axios.get(`/api/leaderboard/${seasonSlug}/`);
        console.log(response)
        setLeaderboardData(response.data); // Update leaderboard data
        setLoading(false); // End loading
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError('Failed to load leaderboard. Please try again later.');
        setLoading(false); // End loading even if there's an error
      }
    };

    fetchLeaderboard(); // Initiate data fetching
  }, [seasonSlug]); // Re-run effect if seasonSlug changes

  /**
   * Renders a single leaderboard row.
   *
   * @param {Object} user - The user object containing leaderboard details.
   * @param {number} index - The user's rank in the leaderboard.
   * @returns JSX Element
   */
  const renderLeaderboardRow = (user, index) => (
    <tr key={user.id} className="hover:bg-gray-100 transition-colors duration-100">
      {/* Rank */}
      <td className="py-2 px-4 border-b text-center">{index + 1}</td>
      {/* User Name */}
      <td className="py-2 px-4 border-b">{user.name}</td>
      {/* Points */}
      <td className="py-2 px-4 border-b text-center">{user.points}</td>
    </tr>
  );

  // Loading State
  if (loading) {
    return <Loader label="Loading Leaderboard..." />;
  }

  // Error State
  if (error) {
    return (
      <div className="flex justify-center items-center py-4">
        <span className="text-red-500">{error}</span>
      </div>
    );
  }

  // Main Render
  return (
    <div className="w-full max-w-4xl mx-auto bg-white shadow-md rounded-md overflow-hidden">
      {/* Header */}
      <h2 className="text-center text-xl font-semibold bg-gray-100 py-2">
        Leaderboard {seasonSlug ? `(${seasonSlug})` : ''}
      </h2>

      {/* Leaderboard Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">Rank</th>
              <th className="py-2 px-4 border-b">User</th>
              <th className="py-2 px-4 border-b">Points</th>
            </tr>
          </thead>
          <tbody>
            {leaderboardData.map((user, index) => renderLeaderboardRow(user, index))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default Leaderboard;