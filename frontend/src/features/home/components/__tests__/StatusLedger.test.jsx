import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatusLedger from '../StatusLedger';

const me = {
  rank: 4,
  user: {
    id: 7,
    total_points: 61,
    categories: { 'Regular Season Standings': { points: 40 }, 'Player Awards': { points: 21 } },
  },
};

const action = { href: '/picks/', label: 'View picks' };

const renderLedger = (props = {}) => render(
  <StatusLedger me={me} action={action} hasSubmission seasonLabel="2025-26" {...props} />,
);

describe('StatusLedger', () => {
  it('leaves the forecast out entirely when there is nothing to project', () => {
    const { container } = renderLedger();
    expect(container.querySelector('.next-play-forecast')).not.toBeInTheDocument();
  });

  it('prints the projection and says plainly that it is not the score', () => {
    renderLedger({ forecast: { points: 74, rank: 2, live: 18, settled: 12 } });

    const strip = screen.getByLabelText('Projected finish');
    expect(strip).toHaveTextContent('74');
    expect(strip).toHaveTextContent('#2');
    expect(strip).toHaveTextContent(/Not your score/);
    expect(strip).toHaveTextContent(/18 of your 30 standings calls can still change/);

    // The graded total is the number that pays, and stays its own tile.
    expect(screen.getByText('Total score').parentElement).toHaveTextContent('61');
  });

  it('reports a finished board rather than a count of zero', () => {
    renderLedger({ forecast: { points: 74, rank: 2, live: 0, settled: 30 } });
    expect(screen.getByLabelText('Projected finish'))
      .toHaveTextContent('Every standings call is decided.');
  });

  it('drops the rank when the pool table is not available', () => {
    const strip = renderLedger({ forecast: { points: 74, rank: null, live: 5, settled: 25 } })
      .container.querySelector('.next-play-forecast__line');
    expect(strip).toHaveTextContent('74 pts');
    expect(strip).not.toHaveTextContent('#');
  });
});
