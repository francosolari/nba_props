import React from 'react';
import { Move, MousePointerClick, RotateCcw } from 'lucide-react';

export const SimulationModal = ({ show, onClose, onEnable, section }) => {
  if (!show) return null;
  const isStandings = section === 'standings';

  return (
    <div className="court-modal-backdrop fixed inset-0 z-[100] flex items-end md:items-center justify-center">
      <section className="court-simulation-sheet" role="dialog" aria-modal="true" aria-labelledby="simulation-title">
        <h3 id="simulation-title">Run the alternate table</h3>
        <p>A scratch sheet on top of the real results. Nobody else sees it, nothing is saved, and the leaderboard is unchanged when you reset.</p>
        <ol>
          <li>
            {isStandings ? <Move /> : <MousePointerClick />}
            <span>
              <strong>{isStandings ? 'Move a team' : 'Mark an outcome'}</strong>
              {isStandings ? 'Drag any team to a new finishing position.' : 'Tap an answer to give it the win; the leader it displaces drops to runner-up.'}
            </span>
          </li>
          <li>
            <MousePointerClick />
            <span>
              <strong>Read the new score</strong>
              Every total in the board — and yours in the band above it — updates in place.
            </span>
          </li>
          <li>
            <RotateCcw />
            <span>
              <strong>Reset when you are done</strong>
              Reset What-If sits on the score band and puts the real table back.
            </span>
          </li>
        </ol>
        <div className="court-simulation-actions">
          <button onClick={onClose}>Keep live standings</button>
          <button onClick={onEnable}>Start What-If</button>
        </div>
      </section>
    </div>
  );
};
