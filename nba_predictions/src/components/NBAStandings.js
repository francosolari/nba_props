// src/components/NBAStandings.js

import React, { useState, useEffect, memo } from 'react';
import axios from 'axios';

/**
 * NBAStandings Component
 * Fetches and displays the current NBA standings for Eastern and Western Conferences.
 *
 * Props:
 * - seasonSlug (string): Optional. The slug for the NBA season (e.g., '2024-25'). Defaults to current season.
 *
 * Usage:
 * <NBAStandings seasonSlug="2024-25" />
 */
const NBAStandings = memo(({ seasonSlug }) => {
  // State to hold standings data
  const [eastStandings, setEastStandings] = useState([]);
  const [westStandings, setWestStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetches NBA standings from the API.
   */
  useEffect(() => {
    const fetchStandings = async () => {
      try {
        setLoading(true);
        setError(null);

        // Default to current season if no seasonSlug is provided
        const slug = seasonSlug || 'current';

        const response = await axios.get(`/api/standings/${slug}/`);

        const { east, west } = response.data;

        setEastStandings(east);
        setWestStandings(west);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching NBA standings:', err);
        setError('Failed to load NBA standings. Please try again later.');
        setLoading(false);
      }
    };

    fetchStandings();
  }, [seasonSlug]);

  /**
   * Renders a single team's standing row.
   *
   * @param {Object} team - The team object containing standing details.
   * @param {number} index - The team's position in the standings.
   * @returns JSX Element
   */
  const renderTeamRow = (team, index) => (
    <div
      key={team.id}
      className="flex items-center p-1 border-b last:border-b-0 hover:bg-gray-200 transition-colors duration-100"
    >
      {/* Position */}
      <span className="w-4 text-right font-medium">{index + 1}.</span>
      {/* Team Name */}
      <span className="ml-2 font-bold font-sans truncate" title={team.name}>
        {team.name}
      </span>
      {/* Wins and Losses */}
      <span className="ml-auto text-sm text-gray-600">
        ({team.wins}W-{team.losses}L)
      </span>
    </div>
  );

  // Loading State
  if (loading) {
    return (
      <div className="flex justify-center items-center py-4">
        <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-8 w-8"></div>
        <span className="ml-2 text-gray-600">Loading NBA Standings...</span>
      </div>
    );
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
    <div className="w-full max-w-2xl mx-auto bg-white shadow-md rounded-md overflow-hidden">
      <h2 className="text-center text-lg font-semibold bg-gray-100 py-2">NBA Standings {seasonSlug ? `(${seasonSlug})` : ''}</h2>
      <div className="flex flex-col lg:flex-row">
        {/* Eastern Conference */}
        <div className="w-full lg:w-1/2 border-r lg:border-r-0">
          <h3 className="text-center text-md font-medium bg-blue-100 py-1">Eastern Conference</h3>
          <div className="divide-y">
            {eastStandings.map((team, index) => renderTeamRow(team, index))}
          </div>
        </div>
        {/* Western Conference */}
        <div className="w-full lg:w-1/2">
          <h3 className="text-center text-md font-medium bg-red-100 py-1">Western Conference</h3>
          <div className="divide-y">
            {westStandings.map((team, index) => renderTeamRow(team, index))}
          </div>
        </div>
      </div>
    </div>
  );
});

export default NBAStandings;