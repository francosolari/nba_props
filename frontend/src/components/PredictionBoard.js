// PredictionBoard.js

import React, { useState, useEffect, useCallback, memo } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

/**
 * Memoized Subcomponent for Standings List
 * Renders the standings for a specific conference with pre-populated teams.
 */
const StandingsList = memo(({ conference, teams, handleReset }) => (
  <div className="w-full lg:w-1/3 mb-4 px-1 no-select">
    <div className="w-auto max-w-md p-1 border rounded bg-gray-100 transition-colors duration-100">
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-sm font-semibold">{conference}ern Conference</h2>
        <button
          onClick={() => handleReset(conference)}
          className="px-2 py-0.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors duration-100"
        >
          Reset
        </button>
      </div>

      <Droppable droppableId={`${conference}-standings`} direction="vertical">
        {(provided, snapshot) => (
          <div
            className={`space-y-1 p-1 rounded select-none`}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {teams.map((team, index) => (
              <Draggable
                key={team.id.toString()}
                draggableId={team.id.toString()}
                index={index}
              >
                {(provided, snapshot) => (
                  <div
                    className={`flex items-center p-1 border rounded text-xs transition-transform duration-100 ease-in-out ${
                      snapshot.isDragging
                        ? conference === 'East'
                          ? 'bg-blue-300 transform scale-105'
                          : 'bg-red-300 transform scale-105'
                        : conference === 'East'
                        ? 'bg-blue-100'
                        : 'bg-red-100'
                    }`}
                    ref={provided.innerRef}
                    style={{
                      ...provided.draggableProps.style,
                      transition: snapshot.isDragging ? 'none' : 'transform 0.2s ease',
                      position: snapshot.isDragging ? 'absolute' : 'relative',
                      zIndex: snapshot.isDragging ? 1000 : 'auto',
                      userSelect: 'none',  // Disable text selection
                    }}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <span className="w-4 text-right font-medium">{index + 1}.</span>
                    <span
                      className="ml-2 font-bold font-sans"
                      title={team.name}
                    >
                      {team.name}
                    </span>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  </div>
));
/**
 * Main PredictionBoard Component
 * Handles the overall state and drag-and-drop logic for the prediction board.
 */
function PredictionBoard({ seasonSlug }) {
  // State for conference standings with pre-populated teams
  const [eastStandings, setEastStandings] = useState([]);
  const [westStandings, setWestStandings] = useState([]);

  // Loading state
  const [loading, setLoading] = useState(true);

  /**
   * Function to compute prior season slug based on current season slug.
   * Assumes that season slugs are in the format 'YYYY-YY', e.g., '2024-25'.
   * Converts '2024-25' to '2023-24'.
   */
  const getPriorSeasonSlug = (currentSlug) => {
    const slugParts = currentSlug.split('-');
    if (slugParts.length !== 2) {
      console.error('Invalid season slug format:', currentSlug);
      return null;
    }

    let [startYearStr, endYearStr] = slugParts;
    const startYear = parseInt(startYearStr, 10);
    const endYear = parseInt(endYearStr, 10);

    if (isNaN(startYear) || isNaN(endYear)) {
      console.error('Invalid year values in slug:', currentSlug);
      return null;
    }

    const priorStartYear = startYear - 1;
    const priorEndYear = endYear - 1;

    // Ensure two digits for endYear
    const priorEndYearStr = priorEndYear.toString().padStart(2, '0');

    return `${priorStartYear}-${priorEndYearStr}`;
  };

  /**
   * Fetch prior season standings from the API upon component mount.
   */
  useEffect(() => {
    const fetchPriorStandings = async () => {
      try {
        // Compute prior season slug
        const priorSeasonSlug = getPriorSeasonSlug(seasonSlug);
        if (!priorSeasonSlug) {
          throw new Error('Unable to compute prior season slug.');
        }

        // Fetch prior standings using the corrected API endpoint
        const standingsResponse = await axios.get(
          `/api/standings/${priorSeasonSlug}/`
        );
        const standingsData = standingsResponse.data;

        // Initialize standings based on prior season's positions
        setEastStandings(standingsData.east);
        setWestStandings(standingsData.west);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching prior standings:', error);
        setLoading(false);
      }
    };

    fetchPriorStandings();
  }, [seasonSlug]);

  /**
   * Handles the end of a drag event.
   * Allows reordering of teams within the same conference standings.
   */
  const onDragEnd = useCallback(
    (result) => {
      const { source, destination } = result;

      // If no destination, do nothing
      if (!destination) return;

      // If dropped in the same position, do nothing
      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      ) {
        return;
      }

      // Determine the conference based on droppableId
      const getConference = (droppableId) => {
        if (droppableId.startsWith('East')) return 'East';
        if (droppableId.startsWith('West')) return 'West';
        return null;
      };

      const sourceConference = getConference(source.droppableId);
      const destConference = getConference(destination.droppableId);

      // Ensure dragging within the same conference
      if (sourceConference !== destConference) {
        alert('You can only reorder teams within the same conference.');
        return;
      }

      // Get the relevant standings list
      const standingsList =
        sourceConference === 'East'
          ? Array.from(eastStandings)
          : Array.from(westStandings);

      // Find the team being dragged
      const [movedTeam] = standingsList.splice(source.index, 1);

      // Insert the team at the new position
      standingsList.splice(destination.index, 0, movedTeam);

      // Update the appropriate standings list in state
      if (sourceConference === 'East') {
        setEastStandings(standingsList);
      } else {
        setWestStandings(standingsList);
      }
    },
    [eastStandings, westStandings]
  );

  /**
   * Handles resetting the standings for a specific conference.
   * Resets the standings to the prior season's standings.
   */
  const handleReset = useCallback(
    (conference) => {
      const priorSeasonSlug = getPriorSeasonSlug(seasonSlug);
      if (!priorSeasonSlug) {
        console.error('Unable to compute prior season slug.');
        return;
      }

      axios
        .get(`/api/standings/${priorSeasonSlug}/`)
        .then((response) => {
          const standingsData = response.data;
          if (conference === 'East') {
            setEastStandings(standingsData.east);
          } else if (conference === 'West') {
            setWestStandings(standingsData.west);
          }
        })
        .catch((error) => {
          console.error(`Error resetting ${conference} standings:`, error);
        });
    },
    [seasonSlug]
  );

  /**
   * Handles resetting both conferences' standings.
   */
  const resetAll = useCallback(() => {
    handleReset('East');
    handleReset('West');
  }, [handleReset]);

  /**
   * Retrieves the CSRF token from cookies.
   */
  const getCookie = useCallback((name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }, []);

  /**
   * Handles submitting the predictions to the server.
   * Validates that each conference has exactly 15 teams.
   */
  const handleSubmit = useCallback(() => {
    // Validate that each conference has exactly 15 teams
    if (eastStandings.length !== 15 || westStandings.length !== 15) {
      alert('Each conference must have exactly 15 teams.');
      return;
    }

    const eastPredictions = eastStandings.map((team, index) => ({
      id: team.id,
      position: index + 1,
    }));

    const westPredictions = westStandings.map((team, index) => ({
      id: team.id,
      position: index + 1,
    }));

    // Combine both predictions into a single array
    const payload = [...eastPredictions, ...westPredictions];

    axios
      .post(`/predictions/submit/${seasonSlug}/`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
      })
      .then(() => alert('Predictions submitted successfully!'))
      .catch((error) => {
        console.error('Error submitting predictions:', error);
        alert('There was an error submitting your predictions.');
      });
  }, [eastStandings, westStandings, getCookie, seasonSlug]);

  // Display a loading indicator while fetching standings
  if (loading) {
    return <div className="text-center">Loading teams and standings...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-2">
      <h1 className="text-xl font-bold mb-2 text-center">Submit Your Predictions for {seasonSlug}</h1>
      <body className={"text-xs text-center font-light text-gray-400 mb-2"}>
      3 points for correct answer<br></br>1 point for within +/- 1 placement
      </body>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex flex-col lg:flex-row justify-center items-start lg:space-x-8">
          {/* Eastern Conference Standings */}
          <StandingsList
            conference="East"
            teams={eastStandings}
            handleReset={handleReset}
          />

          {/* Western Conference Standings */}
          <StandingsList
            conference="West"
            teams={westStandings}
            handleReset={handleReset}
          />
        </div>
      </DragDropContext>

      {/* Submit and Reset Buttons */}
      <div className="flex justify-center mt-4 space-x-4">
        <button
          onClick={resetAll}
          className="px-4 py-2 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600 transition-colors duration-100"
        >
          Reset All
        </button>
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors duration-100"
        >
          Submit Predictions
        </button>
      </div>
    </div>
  );
}

export default PredictionBoard;