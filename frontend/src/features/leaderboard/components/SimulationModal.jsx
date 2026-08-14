import React from 'react';
import { Move, MousePointerClick } from 'lucide-react';

export const SimulationModal = ({ show, onClose, onEnable, section }) => {
  if (!show) return null;
  const isStandings = section === 'standings';

  return (
    <div className="court-modal-backdrop fixed inset-0 z-[100] flex items-end md:items-center justify-center">
      <section className="court-simulation-sheet" role="dialog" aria-modal="true" aria-labelledby="simulation-title">
        <h3 id="simulation-title">Run the alternate table</h3>
        <p>Your live leaderboard stays untouched. This is a private scratch sheet you can reset at any time.</p>
        <ol>
          <li>{isStandings ? <Move /> : <MousePointerClick />}<span><strong>{isStandings ? 'Move teams' : 'Mark outcomes'}</strong>{isStandings ? 'Drag any team to a new finishing position.' : 'Tap an answer to cycle its result.'}</span></li>
          <li><span className="court-step-number">2</span><span><strong>Read the new score</strong>Every player total updates on the sheet.</span></li>
        </ol>
        <div className="court-simulation-actions"><button onClick={onClose}>Keep live standings</button><button onClick={onEnable}>Start What-If</button></div>
      </section>
    </div>
  );
};
