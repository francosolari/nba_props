// src/components/ReadOnlyStandingsList.js
import React, { memo } from 'react';

/**
 * ReadOnlyStandingsList:
 * Renders the user's predicted teams for a given conference in a read-only style.
 *
 * Props:
 * - conference: "East" or "West"
 * - predictions: array of { team_id, team_name, predicted_position, team_conference, points }
 */
const ReadOnlyStandingsList = memo(({ conference, predictions }) => {
  // 1. Filter to the conference we're displaying
  const filtered = predictions.filter(
    (p) => p.team_conference.toLowerCase() === conference.toLowerCase()
  );

  // 2. Sort by predicted_position ascending
  const sorted = filtered.sort((a, b) => a.predicted_position - b.predicted_position);

  return (
    <div className="mb-4 flex-1">
      {/* Outer container */}
      <div className="w-auto p-1 border rounded bg-gray-100 transition-colors duration-100">
        {/* Header */}
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-sm font-semibold whitespace-nowrap truncate">
            {conference}ern Conference
          </h2>
        </div>

        {/* List of teams */}
        <div className="space-y-1 p-1 rounded">
          {sorted.map((pred) => {
            let bgColor = '';
            if (pred.points === 3) bgColor = 'bg-green-200';
            else if (pred.points === 1) bgColor = 'bg-yellow-200';
            else bgColor = 'bg-white';

            return (
              <div
                key={pred.team_id}
                className={`flex items-center justify-between p-1 border rounded text-xs ${bgColor}`}
              >
                <div className="flex items-center truncate">
                  <span className="w-4 text-right font-medium mr-1">
                    {pred.predicted_position}.
                  </span>
                  <span className="font-bold truncate whitespace-nowrap overflow-hidden" title={pred.team_name}>
                    {pred.team_name}
                  </span>
                </div>
                <span className="text-gray-700 font-medium mr-2">
                  {pred.points} pts
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default ReadOnlyStandingsList;