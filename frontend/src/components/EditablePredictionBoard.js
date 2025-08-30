import React, { useState, useEffect, useCallback, memo } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const StandingsList = memo(({ conference, teams, handleReset, isEditable }) => (
  <div className="w-full lg:w-1/3 mb-4 px-1 no-select">
    <div className="w-auto max-w-md p-1 border rounded bg-gray-100 transition-colors duration-100">
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-sm font-semibold">{conference}ern Conference</h2>
        {isEditable && (
          <button
            onClick={handleReset}
            className="px-2 py-0.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors duration-100"
          >
            Reset
          </button>
        )}
      </div>

      <Droppable droppableId={`${conference}-standings`} direction="vertical">
        {(provided) => (
          <div
            className="space-y-1 p-1 rounded select-none"
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {teams.map((team, index) => (
              <Draggable
                key={team.team_id.toString()}
                draggableId={team.team_id.toString()}
                index={index}
                isDragDisabled={!isEditable}  // Disable dragging if not editable
              >
                {(provided) => (
                  <div
                    className={`flex items-center p-1 border rounded text-xs transition-transform duration-100 ease-in-out ${
                      conference === 'East' ? 'bg-blue-100' : 'bg-red-100'
                    }`}
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <span className="w-4 text-right font-medium">{index + 1}.</span>
                    <span className="ml-2 font-bold font-sans" title={team.team_name}>
                      {team.team_name}
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

function EditablePredictionBoard({ seasonSlug }) {
  const [eastStandings, setEastStandings] = useState([]);
  const [westStandings, setWestStandings] = useState([]);
  const [initialEastStandings, setInitialEastStandings] = useState([]);
  const [initialWestStandings, setInitialWestStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch the latest season slug if not provided
        if (!seasonSlug) {
          const latestSeasonResponse = await axios.get('/api/latest_season/');
          seasonSlug = latestSeasonResponse.data.slug;
        }

        // Fetch the user predictions
        const predictionsResponse = await axios.get(`/api/user_predictions/${seasonSlug}/`);
        const { east, west } = predictionsResponse.data;

        setEastStandings(east);
        setWestStandings(west);
        setInitialEastStandings(east);
        setInitialWestStandings(west);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user predictions or latest season:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [seasonSlug]);

  const onDragEnd = useCallback(
    (result) => {
      const { source, destination } = result;

      if (!destination) return;

      const sourceConference = source.droppableId.startsWith('East') ? 'East' : 'West';
      const destinationConference = destination.droppableId.startsWith('East') ? 'East' : 'West';

      if (sourceConference !== destinationConference) return;

      const standings = sourceConference === 'East' ? Array.from(eastStandings) : Array.from(westStandings);
      const [movedTeam] = standings.splice(source.index, 1);
      standings.splice(destination.index, 0, movedTeam);

      if (sourceConference === 'East') {
        setEastStandings(standings);
      } else {
        setWestStandings(standings);
      }
    },
    [eastStandings, westStandings]
  );

  const handleSave = () => {
    // Submit the updated standings to the server
    const eastPayload = eastStandings.map((team, index) => ({
      team_id: team.team_id,
      predicted_position: index + 1,
    }));

    const westPayload = westStandings.map((team, index) => ({
      team_id: team.team_id,
      predicted_position: index + 1,
    }));

    const payload = [...eastPayload, ...westPayload];

    axios
      .post(`/api/submit_predictions/${seasonSlug}/`, payload)
      .then(() => {
        alert('Predictions saved successfully!');
        setIsEditing(false);  // Exit edit mode
      })
      .catch((error) => {
        console.error('Error saving predictions:', error);
        alert('There was an error saving your predictions.');
      });
  };

  const handleCancel = () => {
    setEastStandings(initialEastStandings);
    setWestStandings(initialWestStandings);
    setIsEditing(false);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-2">
      <h1 className="text-xl font-bold mb-4 text-center">Edit Your Predictions for {seasonSlug}</h1>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex flex-col lg:flex-row justify-center items-start lg:space-x-8">
          {/* Eastern Conference Standings */}
          <StandingsList
            conference="East"
            teams={eastStandings}
            handleReset={() => setEastStandings(initialEastStandings)}
            isEditable={isEditing}
          />

          {/* Western Conference Standings */}
          <StandingsList
            conference="West"
            teams={westStandings}
            handleReset={() => setWestStandings(initialWestStandings)}
            isEditable={isEditing}
          />
        </div>
      </DragDropContext>

      {/* Edit Mode Buttons */}
      <div className="flex justify-center mt-4 space-x-4">
        {isEditing ? (
          <>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors duration-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors duration-100"
            >
              Save Predictions
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors duration-100"
          >
            Edit Predictions
          </button>
        )}
      </div>
    </div>
  );
}

export default EditablePredictionBoard;