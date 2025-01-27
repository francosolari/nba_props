// src/components/NBAStandings.js

import React, { useState, useEffect, memo } from 'react';
import axios from 'axios';

/**
 * NBAStandings Component
 * Displays a compact NBA standings table for Eastern and Western Conferences side by side.
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
  const [currentSeasonSlug, setCurrentSeasonSlug] = useState(seasonSlug);

  /**
   * Fetches NBA standings from the API.
   */
  useEffect(() => {
    // Function to fetch the latest season if seasonSlug is not provided
    const fetchLatestSeason = async () => {
      try {
        const response = await axios.get('/api/latest_season/'); // Your endpoint
        return response.data.slug; // Assuming the API returns { slug: "2023-24" }
      } catch (error) {
        console.error('Error fetching the latest season:', error);
        return null;
      }
    };

    // Function to calculate Games Behind (GB)
    const calculateGamesBehind = (standings) => {
      if (!standings || standings.length === 0) return standings;

      // Sort teams by wins descending
      const sortedStandings = [...standings].sort((a, b) => b.wins - a.wins);

      // Identify the leader's wins and losses
      const leader = sortedStandings[0];
      const leaderWins = leader.wins;
      const leaderLosses = leader.losses;

      // Calculate GB for each team
      const updatedStandings = sortedStandings.map((team) => {
        const gb = ((leaderWins - team.wins) + (team.losses - leaderLosses)) / 2;
        return { ...team, games_behind: gb >= 0 ? gb : 0 };
      });

      return updatedStandings;
    };

    // Fetch and process standings
    const fetchStandings = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use the seasonSlug passed in or fetch the latest one
        const slug = currentSeasonSlug || (await fetchLatestSeason());

        if (!slug) {
          throw new Error('Could not fetch season');
        }

        const response = await axios.get(`/api/standings/${slug}/`);

        let { east, west } = response.data;

        // Calculate Games Behind for each conference
        east = calculateGamesBehind(east);
        west = calculateGamesBehind(west);

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
  }, [currentSeasonSlug]);

  /**
   * Determines the status of a team based on its rank.
   * Adjust the thresholds based on current NBA rules.
   *
   * @param {number} rank - The team's rank in the standings.
   * @returns {string} - The status: 'Playoffs', 'Play-In', or 'Out'.
   */
  const getTeamStatus = (rank) => {
    if (rank <= 6) return 'Playoffs';
    if (rank >= 7 && rank <= 10) return 'Play-In';
    return 'Out';
  };

  /**
   * Renders a single team's standing row.
   *
   * @param {Object} team - The team object containing standing details.
   * @param {number} index - The team's position in the standings.
   * @param {string} conference - 'Eastern' or 'Western' Conference.
   * @returns JSX Element
   */
  const renderTeamRow = (team, index, conference) => {
    const status = getTeamStatus(index + 1); // Assuming index starts at 0
    let statusColor = '';

    switch (status) {
      case 'Playoffs':
        statusColor = 'bg-green-100 text-green-800';
        break;
      case 'Play-In':
        statusColor = 'bg-yellow-100 text-yellow-800';
        break;
      default:
        statusColor = 'bg-red-100 text-red-800';
    }

    // Handle undefined win_percentage with logging
    let winPercentage;
    if (team.win_percentage !== undefined && team.win_percentage !== null) {
      winPercentage = team.win_percentage.toFixed(3);
    } else {
      winPercentage = 'N/A';
      console.warn(`Missing win_percentage for team: ${team.name}`);
    }

    // Format GB to one decimal place
    const formattedGB =
      team.games_behind !== undefined && team.games_behind !== null
        ? team.games_behind.toFixed(1)
        : 'N/A';

    return (
      <tr key={team.id} className="hover:bg-gray-100 transition-colors duration-150">
        <td className="px-1 py-0.5 text-center text-xs w-6">{index + 1}</td>
        <td className="px-1 py-0.5 text-left text-xs w-32">
          <div className="flex items-center">
            {team.logo_url && (
              <img
                src={team.logo_url}
                alt={`${team.name} Logo`}
                className="h-4 w-4 object-contain"
                loading="lazy"
              />
            )}
            <span className="ml-1 truncate" title={team.name}>{team.name}</span>
          </div>
        </td>
        <td className="px-1 py-0.5 text-center text-xs w-8">{team.wins}</td>
        <td className="px-1 py-0.5 text-center text-xs w-8">{team.losses}</td>
        <td className="px-1 py-0.5 text-center text-xs w-10">{winPercentage}</td>
        <td className="px-1 py-0.5 text-center text-xs w-10">{formattedGB}</td>
        <td className="px-1 py-0.5 text-center w-12">
          <span className={`px-1 inline-flex text-xs leading-4 font-semibold rounded-full ${statusColor}`}>
            {status}
          </span>
        </td>
      </tr>
    );
  };

  // Loading State
  if (loading) {
    return (
      <div className="flex justify-center items-center py-4">
        <div className="loader ease-linear rounded-full border-2 border-t-2 border-gray-200 h-4 w-4"></div>
        <span className="ml-1 text-gray-600 text-xs">Loading...</span>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex justify-center items-center py-4">
        <span className="text-red-500 text-xs">{error}</span>
      </div>
    );
  }

  // Main Render
  return (
    <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
      {/* Eastern Conference Standings */}
      <div className="w-full md:w-1/2">
        <div className="bg-blue-50 rounded-md shadow-sm">
          <div className="bg-blue-100 text-center text-xs font-semibold py-1">
            Eastern Conference
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-1 py-0.5 text-center w-6">#</th>
                  <th className="px-1 py-0.5 text-left w-32">Team</th>
                  <th className="px-1 py-0.5 text-center w-8">W</th>
                  <th className="px-1 py-0.5 text-center w-8">L</th>
                  <th className="px-1 py-0.5 text-center w-8">Pct</th>
                  <th className="px-1 py-0.5 text-center w-8">GB</th>
                  <th className="px-1 py-0.5 text-center w-12">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {eastStandings.map((team, index) => renderTeamRow(team, index, 'Eastern'))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Western Conference Standings */}
      <div className="w-full md:w-1/2">
        <div className="bg-red-50 rounded-md shadow-sm">
          <div className="bg-red-100 text-center text-xs font-semibold py-1">
            Western Conference
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-1 py-0.5 text-center w-6">#</th>
                  <th className="px-1 py-0.5 text-left w-32">Team</th>
                  <th className="px-1 py-0.5 text-center w-8">W</th>
                  <th className="px-1 py-0.5 text-center w-8">L</th>
                  <th className="px-1 py-0.5 text-center w-10">Pct</th>
                  <th className="px-1 py-0.5 text-center w-10">GB</th>
                  <th className="px-1 py-0.5 text-center w-12">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {westStandings.map((team, index) => renderTeamRow(team, index, 'Western'))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
});

export default NBAStandings;