// src/components/SideBySideLeaderboard.js

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import ReadOnlyStandingsList from './ReadOnlyStandingsList';

function SideBySideLeaderboard() {
  // Leaderboard
  const [leaderboard, setLeaderboard] = useState([]);

  // Middle column: user predictions
  const [selectedUsername, setSelectedUsername] = useState(null);
  const [userPredictions, setUserPredictions] = useState([]);

  // Logged-in user
  const [currentUsername, setCurrentUsername] = useState(null);
  const [myPredictions, setMyPredictions] = useState([]);

  // Compare mode
  const [comparing, setComparing] = useState(false);

  // Loading states
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [loadingSelected, setLoadingSelected] = useState(false);
  const [loadingMyPredictions, setLoadingMyPredictions] = useState(false);

  // Helpers
  const getSeasonSlug = useCallback(() => {
    const container = document.getElementById('display-user-predictions-root');
    return container?.getAttribute('data-season-slug') || 'current';
  }, []);

  const detectLoggedInUser = useCallback(() => {
    const container = document.getElementById('display-user-predictions-root');
    return container?.getAttribute('data-logged-in-username') || null;
  }, []);

  // Load my predictions
  const loadMyPredictions = useCallback(async (username) => {
    if (!username) return;
    setLoadingMyPredictions(true);
    try {
      const resp = await axios.get(
        `/api/user-predictions/${getSeasonSlug()}?username=${username}`
      );
      setMyPredictions(resp.data.predictions || []);
    } catch (err) {
      console.error('Error loading my predictions:', err);
    }
    setLoadingMyPredictions(false);
  }, [getSeasonSlug]);

  // Load selected user's predictions
  const loadUserPredictions = useCallback(async (username) => {
    if (!username) return;
    setSelectedUsername(username);
    setLoadingSelected(true);
    try {
      const resp = await axios.get(
        `/api/user-predictions/${getSeasonSlug()}?username=${username}`
      );
      setUserPredictions(resp.data.predictions || []);
    } catch (err) {
      console.error('Error loading selected user predictions:', err);
    }
    setLoadingSelected(false);
    setComparing(false); // reset compare mode each time we select a new user
  }, [getSeasonSlug]);

  // On mount: detect user, load my predictions, default middle to myself
  useEffect(() => {
    const loggedUser = detectLoggedInUser();
    if (loggedUser) {
      setCurrentUsername(loggedUser);
      loadMyPredictions(loggedUser);
      // Also default the middle column to show my predictions
      loadUserPredictions(loggedUser);
    }
  }, [detectLoggedInUser, loadMyPredictions, loadUserPredictions]);

  // Fetch leaderboard
  useEffect(() => {
    async function fetchLeaderboard() {
      setLoadingLeaderboard(true);
      try {
        const resp = await axios.get(`/api/leaderboard/${getSeasonSlug()}/`);
        setLeaderboard(resp.data.top_users || []);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      }
      setLoadingLeaderboard(false);
    }
    fetchLeaderboard();
  }, [getSeasonSlug]);

  // If user clicks on a name in the leaderboard
  const handleUserClick = (username) => {
    loadUserPredictions(username);
  };

  // Compare with myself
  const handleCompare = () => {
    setComparing(true);
    if (!myPredictions.length && currentUsername) {
      loadMyPredictions(currentUsername);
    }
  };

  // Stop compare
  const handleStopCompare = () => {
    setComparing(false);
  };

  // Column widths
  // - If comparing = true => left/middle/right each ~1/3
  // - Else => left/middle each 1/2
  const leftWidth = comparing ? 'md:w-1/3' : 'md:w-1/2';
  const middleWidth = comparing ? 'md:w-1/3' : 'md:w-1/2';
  // Right only appears if comparing && logged in => also 1/3

  return (
    <div className="mx-auto w-full max-w-6xl p-4">
      <div className="flex flex-col md:flex-row items-start md:space-x-4 space-y-4 md:space-y-0">

        {/* LEFT COLUMN: Leaderboard */}
        <div className={`bg-white rounded p-2 flex flex-col transition-all duration-200 w-full ${leftWidth}`}>
          <h2 className="text-xl font-bold mb-2 text-center">
            User Leaderboard - {getSeasonSlug()}
          </h2>

          {loadingLeaderboard ? (
            <div className="text-center text-gray-500">Loading leaderboard...</div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full table-auto border-collapse border border-gray-300 text-sm relative">
                <thead className="sticky top-0 bg-gray-200">
                  <tr>
                    <th className="px-2 py-1 text-left">User</th>
                    <th className="px-2 py-1 text-center">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => {
                    const { id, username, display_name } = entry.user;
                    const { points } = entry;
                    return (
                      <tr
                        key={id}
                        className="border hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleUserClick(username)}
                      >
                        <td className="px-2 py-1 border border-gray-300">
                          {display_name || username}
                        </td>
                        <td className="px-2 py-1 text-center border border-gray-300">
                          {points}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MIDDLE COLUMN: selected user */}
        <div className={`bg-white rounded p-2 flex flex-col transition-all duration-200 w-full ${middleWidth}`}>
          {/*
            Row with heading + small compare button on the right
          */}
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-center">
              {selectedUsername
                ? `Predictions for ${selectedUsername}`
                : 'Select a user from the left'}
            </h2>

            {/*
              If selected != me => "Compare with Myself" if logged in,
              else "Log in to Compare"
            */}
            {selectedUsername && selectedUsername !== currentUsername ? (
              currentUsername ? (
                <button
                  onClick={handleCompare}
                  className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-100 ml-2"
                >
                  Compare with Myself
                </button>
              ) : (
                <button
                  onClick={() => alert('Please log in first!')}
                  className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-100 ml-2"
                >
                  Log in to Compare
                </button>
              )
            ) : null}
          </div>

          {loadingSelected ? (
            <div className="text-center text-gray-500">Loading user predictions...</div>
          ) : (
            userPredictions.length > 0 && (
              <div className="flex-1 flex flex-col md:flex-row md:space-x-4">
                <ReadOnlyStandingsList
                  conference="East"
                  predictions={userPredictions}
                />
                <ReadOnlyStandingsList
                  conference="West"
                  predictions={userPredictions}
                />
              </div>
            )
          )}
        </div>

        {/* RIGHT COLUMN: my predictions => only if comparing && logged in */}
        {comparing && currentUsername && (
          <div className="bg-white rounded p-2 flex flex-col transition-all duration-200 w-full md:w-1/3">
            {/* Title + close button on same row */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-center">
                My Predictions ({currentUsername})
              </h2>
              <button
                onClick={handleStopCompare}
                className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-100 ml-2"
              >
                Close
              </button>
            </div>

            {loadingMyPredictions ? (
              <div className="text-center text-gray-500">Loading my predictions...</div>
            ) : (
              myPredictions.length > 0 && (
                <div className="flex-1 flex flex-col md:flex-row md:space-x-4">
                  <ReadOnlyStandingsList
                    conference="East"
                    predictions={myPredictions}
                  />
                  <ReadOnlyStandingsList
                    conference="West"
                    predictions={myPredictions}
                  />
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SideBySideLeaderboard;