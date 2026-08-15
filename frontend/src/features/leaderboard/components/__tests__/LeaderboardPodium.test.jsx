import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LeaderboardPodium } from '../LeaderboardPodium';

describe('LeaderboardPodium', () => {
  const entries = [
    { user: { id: 1, display_name: 'Leader', total_points: 58 } },
    { user: { id: 2, display_name: 'Signed In Player', total_points: 42 } },
    { user: { id: 3, display_name: 'Third', total_points: 39 } },
  ];

  it('puts the logged-in player first and applies the gold identity state', () => {
    const { container } = render(
      <LeaderboardPodium
        whatIfEnabled={false}
        withSimTotals={entries}
        loggedInUserId={2}
      />
    );

    const highlighted = container.querySelector('.court-score-band__player.is-me');
    expect(highlighted).toBeInTheDocument();
    expect(highlighted).toHaveTextContent('You · Signed In Player');
    expect(screen.getAllByText(/pts$/)).toHaveLength(3);
  });

  it('shows simulated score impact in the participant band', () => {
    render(
      <LeaderboardPodium
        whatIfEnabled
        withSimTotals={[{ ...entries[0], __orig_total_points: 60 }]}
      />
    );

    expect(screen.getByText('▼2')).toBeInTheDocument();
    expect(screen.getByText('SIM')).toBeInTheDocument();
  });
});
