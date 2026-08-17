import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LeaderboardPodium } from '../LeaderboardPodium';

describe('LeaderboardPodium', () => {
  const entries = [
    { user: { id: 1, display_name: 'Leader', total_points: 58 } },
    { user: { id: 2, display_name: 'Signed In Player', total_points: 42 } },
    { user: { id: 3, display_name: 'Third', total_points: 39 } },
  ];

  const baseProps = {
    whatIfEnabled: false,
    withSimTotals: entries,
    loggedInUserId: 2,
    isPinMePinned: false,
    onTogglePinMe: jest.fn(),
    onToggleWhatIf: jest.fn(),
    section: 'standings',
  };

  it('leads with your own standing and marks it with the gold identity state', () => {
    const { container } = render(<LeaderboardPodium {...baseProps} />);

    const me = container.querySelector('.court-adv-entry--me');
    expect(me).toBeInTheDocument();
    expect(me).toHaveTextContent('You');
    expect(me).toHaveTextContent('42');
    // Your rank is your real overall rank, not a podium slot.
    expect(me).toHaveTextContent('2');
  });

  it('keeps the leaders alongside you without duplicating your row', () => {
    render(<LeaderboardPodium {...baseProps} />);

    expect(screen.getByText('Leader')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();
    expect(screen.queryByText('Signed In Player')).not.toBeInTheDocument();
  });

  it('pins you to the front of the comparison from the band', () => {
    const onTogglePinMe = jest.fn();
    render(<LeaderboardPodium {...baseProps} onTogglePinMe={onTogglePinMe} />);

    fireEvent.click(screen.getByRole('button', { name: /pin yourself/i }));
    expect(onTogglePinMe).toHaveBeenCalledTimes(1);
  });

  it('shows simulated score impact and written what-if guidance', () => {
    const { container } = render(
      <LeaderboardPodium
        {...baseProps}
        whatIfEnabled
        withSimTotals={[{ ...entries[0], __orig_total_points: 60 }]}
        loggedInUserId={1}
      />
    );

    expect(screen.getByText(/−2/)).toBeInTheDocument();
    expect(container.querySelector('.court-adv-band.is-simulating')).toBeInTheDocument();
    expect(screen.getByText(/Nothing here is saved/i)).toBeInTheDocument();
  });

  it('offers What-If at rest and Reset What-If while simulating', () => {
    const onToggleWhatIf = jest.fn();
    const { rerender } = render(<LeaderboardPodium {...baseProps} onToggleWhatIf={onToggleWhatIf} />);

    fireEvent.click(screen.getByRole('button', { name: /^what-if$/i }));
    expect(onToggleWhatIf).toHaveBeenCalledTimes(1);

    rerender(<LeaderboardPodium {...baseProps} whatIfEnabled onToggleWhatIf={onToggleWhatIf} />);
    expect(screen.getByRole('button', { name: /reset what-if/i })).toBeInTheDocument();
  });
});
