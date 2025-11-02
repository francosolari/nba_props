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
        setLoading(true);
        setError(null);

        // Try optimized v2 route first
        let items = [];
        try {
          const resV2 = await axios.get(`/api/v2/leaderboards/${seasonSlug}`);
          const raw = resV2.data;
          if (Array.isArray(raw)) {
            items = raw.map((u) => ({
              id: u.id ?? u.user?.id,
              name: u.display_name || u.username || u.user?.display_name || u.user?.username,
              points: u.total_points ?? u.points ?? u.user?.total_points ?? 0,
            }));
          }
        } catch (_) {
          // fall through to legacy
        }

        if (!items.length) {
          // Legacy temp v2 route
          try {
            const resTemp = await axios.get(`/api/v2/leaderboard/${seasonSlug}`);
            const raw = resTemp.data;
            if (raw && Array.isArray(raw.top_users)) {
              items = raw.top_users.map((t) => ({
                id: t.user?.id,
                name: t.user?.display_name || t.user?.username,
                points: t.points ?? 0,
              }));
            }
          } catch (_) { /* no-op */ }
        }

        if (!items.length) {
          // Old v1 route fallback
          const resV1 = await axios.get(`/api/leaderboard/${seasonSlug}/`);
          const raw = resV1.data;
          if (raw && Array.isArray(raw.top_users)) {
            items = raw.top_users.map((t) => ({
              id: t.user?.id,
              name: t.user?.display_name || t.user?.username,
              points: t.points ?? 0,
            }));
          } else if (Array.isArray(raw)) {
            items = raw.map((u) => ({ id: u.id, name: u.name || u.username, points: u.points || 0 }));
          }
        }

        setLeaderboardData(items);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError('Failed to load leaderboard. Please try again later.');
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [seasonSlug]);

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
            {Array.isArray(leaderboardData) && leaderboardData.length > 0 ? (
              leaderboardData.map((user, index) => renderLeaderboardRow(user, index))
            ) : (
              <tr>
                <td colSpan="3" className="py-4 text-center text-gray-500">No leaderboard data available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default Leaderboard;
