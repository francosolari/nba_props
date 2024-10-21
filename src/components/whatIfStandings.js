// src/WhatIfStandings.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

function WhatIfStandings({ seasonSlug, userPredictions }) {
  const [nbaStandings, setNbaStandings] = useState([]);
  const [whatIfStandings, setWhatIfStandings] = useState([]);
  const [whatIfScore, setWhatIfScore] = useState(0);  // Score for the temporary grading

  // Fetch current NBA standings
  useEffect(() => {
    const fetchStandings = async () => {
      try {
        const response = await axios.get(`api/standings/${seasonSlug}/`);
        setNbaStandings(response.data);  // Fetch the actual NBA standings
        setWhatIfStandings(response.data);  // Initialize what-if with the same standings
      } catch (error) {
        console.error('Error fetching standings:', error);
      }
    };

    fetchStandings();
  }, [seasonSlug]);

  // Handle drag and drop to update the what-if standings
  const onDragEnd = (result) => {
    const { source, destination } = result;

    if (!destination) return;

    const reorderedStandings = Array.from(whatIfStandings);
    const [movedTeam] = reorderedStandings.splice(source.index, 1);
    reorderedStandings.splice(destination.index, 0, movedTeam);

    setWhatIfStandings(reorderedStandings);

    // Recalculate the what-if score
    const newScore = calculateWhatIfScore(reorderedStandings, userPredictions);
    setWhatIfScore(newScore);
  };

  return (
    <div className="container mx-auto px-4 py-2">
      <h1 className="text-xl font-bold mb-4 text-center">What-If Standings for {seasonSlug}</h1>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex flex-col lg:flex-row justify-center items-start lg:space-x-8">
          <Droppable droppableId="nba-standings" direction="vertical">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1">
                {whatIfStandings.map((team, index) => (
                  <Draggable key={team.id} draggableId={team.id.toString()} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="p-2 bg-gray-200 border rounded mb-1"
                      >
                        {index + 1}. {team.name} ({team.wins} - {team.losses})
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      </DragDropContext>

      {/* Display the calculated What-If score */}
      <div className="mt-4">
        <h2 className="text-center text-lg font-semibold">What-If Score: {whatIfScore}</h2>
      </div>
    </div>
  );
}

export default WhatIfStandings;

/**
 * Calculate the "What-If" score based on user predictions and the what-if standings.
 *
 * @param {Array} whatIfStandings - The current "what-if" standings as modified by the user.
 * @param {Array} userPredictions - The user's saved predictions from the API.
 *
 * @returns {number} - The calculated score.
 */
const calculateWhatIfScore = (whatIfStandings, userPredictions) => {
  let score = 0;

  whatIfStandings.forEach((team, index) => {
    const predictedTeam = userPredictions.find(pred => pred.team_id === team.id);

    if (predictedTeam) {
      if (predictedTeam.predicted_position === index + 1) {
        score += 3;  // Exact match
      } else if (Math.abs(predictedTeam.predicted_position - (index + 1)) === 1) {
        score += 1;  // Off by one position
      }
    }
  });

  return score;
};

// Reset to the actual NBA standings
const handleReset = () => {
  setWhatIfStandings(nbaStandings);
};