import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { LeaderboardControls } from '../LeaderboardControls';

const buildProps = (overrides = {}) => ({
  query: '',
  setQuery: jest.fn(),
  sortBy: 'total',
  setSortBy: jest.fn(),
  mode: 'compare',
  showAll: false,
  setShowAll: jest.fn(),
  section: 'awards',
  whatIfEnabled: false,
  onToggleWhatIf: jest.fn(),
  setShowManagePlayers: jest.fn(),
  loggedInUserId: '42',
  isPinMePinned: false,
  onTogglePinMe: jest.fn(),
  ...overrides,
});

describe('LeaderboardControls', () => {
  test('uses custom sort menu (not native select) and applies selected sort option', () => {
    const props = buildProps();
    const { container } = render(<LeaderboardControls {...props} />);

    expect(container.querySelector('select')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /sort:/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Awards Points' }));

    expect(props.setSortBy).toHaveBeenCalledWith('section');
  });

  test('supports compare actions and hides Pin Me when user is not logged in', () => {
    const props = buildProps();
    const { rerender } = render(<LeaderboardControls {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /players/i }));
    fireEvent.click(screen.getByRole('button', { name: /selected/i }));
    fireEvent.click(screen.getByRole('button', { name: /^all$/i }));
    fireEvent.click(screen.getByRole('button', { name: /what-if/i }));
    fireEvent.click(screen.getByRole('button', { name: /pin me/i }));

    expect(props.setShowManagePlayers).toHaveBeenCalledWith(true);
    expect(props.setShowAll).toHaveBeenCalledWith(false);
    expect(props.setShowAll).toHaveBeenCalledWith(true);
    expect(props.onToggleWhatIf).toHaveBeenCalledTimes(1);
    expect(props.onTogglePinMe).toHaveBeenCalledTimes(1);

    rerender(<LeaderboardControls {...buildProps({ loggedInUserId: null })} />);
    expect(screen.queryByRole('button', { name: /pin me/i })).not.toBeInTheDocument();
  });
});
