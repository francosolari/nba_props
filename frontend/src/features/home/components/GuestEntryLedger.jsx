import React from 'react';
import { ENTRY_FEE } from '../entryState';

export function GuestEntryLedger({ seasonLabel }) {
  const steps = [
    ['Rank the East and West', 'Place all 30 teams 1 through 15 in each conference.'],
    ['Call the season', 'MVP and the rest of the awards, plus every prop on the board.'],
    ['Score all season', 'Each call earns points as real NBA results are graded.'],
  ];

  return (
    <aside className="next-play-ledger next-play-ledger--guest" aria-label="How the game works">
      <header className="next-play-ledger__mast">
        <span>How it works</span>
        <strong>{seasonLabel ? `${seasonLabel} pool` : 'Season pool'}</strong>
      </header>
      <ol className="next-play-steps">
        {steps.map(([title, detail], index) => (
          <li key={title}>
            <span className="next-play-steps__number">{index + 1}</span>
            <span className="next-play-steps__copy">
              <strong>{title}</strong>
              <small>{detail}</small>
            </span>
          </li>
        ))}
      </ol>
      <footer className="next-play-ledger__foot">
        {ENTRY_FEE} entry fee, paid once — one entry per player each season.
      </footer>
    </aside>
  );
}

export default GuestEntryLedger;
