import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Memoized Subcomponent for Standings List in Read-Only Mode
 * Displays the standings for a specific conference with the user's predictions.
 */
const StandingsList = ({ conference, teams }) => (
  <div className="w-full lg:w-1/3 mb-4 px-1 no-select">
    <div className="w-auto max-w-md p-1 border rounded bg-gray-100 transition-colors duration-100">
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-sm font-semibold">{conference}ern Conference</h2>
      </div>

      <div className="space-y-1 p-1 rounded select-none">
        {teams.map((team, index) => (
          <div
            key={team.team_id.toString()}
            className={`flex items-center p-1 border rounded text-xs transition-transform duration-100 ease-in-out ${
              conference === 'East' ? 'bg-blue-100' : 'bg-red-100'
            }`}
          >
            <span className="w-4 text-right font-medium">{team.predicted_position}.</span>
            <span className="ml-2 font-bold font-sans" title={team.team_name}>
              {team.team_name}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/**
 * Main Component to Display the User's Predictions
 */
function DisplayPredictionsBoard({ seasonSlug }) {
  const [eastStandings, setEastStandings] = useState([]);
  const [westStandings, setWestStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch latest season if seasonSlug is not provided
  const fetchLatestSeason = async () => {
    try {
      const response = await axios.get('/api/latest_season/');
      return response.data.slug;  // Assuming the API returns { slug: "2023-24" }
    } catch (error) {
      console.error('Error fetching the latest season:', error);
      return null;
    }
  };

  // Fetch the user's predictions
  const fetchUserPredictions = async (slug) => {
    try {
      const response = await axios.get(`/api/user_predictions/${slug}/`);
      console.log(response)
      const { predictions } = response.data;

      // Group the predictions by conference
      const east = predictions.filter((team) => team.team_conference === 'East');
      const west = predictions.filter((team) => team.team_conference === 'West');

      // Sort them by predicted position
      setEastStandings(east.sort((a, b) => a.predicted_position - b.predicted_position));
      setWestStandings(west.sort((a, b) => a.predicted_position - b.predicted_position));

      setLoading(false);
    } catch (error) {
      console.error('Error fetching user predictions:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializePredictions = async () => {
      let slug = seasonSlug;

      // If no season slug is provided, fetch the latest season
      if (!seasonSlug) {
        slug = await fetchLatestSeason();
        if (!slug) {
          console.error('Could not determine the season');
          return;
        }
      }

      // Fetch the predictions for the determined season slug
      fetchUserPredictions(slug);
    };

    initializePredictions();
  }, [seasonSlug]);

  if (loading) {
    return <div className="text-center">Loading your predictions...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-2">
      <div className="flex flex-col lg:flex-row justify-center items-start lg:space-x-8">
        <StandingsList conference="East" teams={eastStandings} />
        <StandingsList conference="West" teams={westStandings} />
      </div>
    </div>
  );
}

export default DisplayPredictionsBoard;