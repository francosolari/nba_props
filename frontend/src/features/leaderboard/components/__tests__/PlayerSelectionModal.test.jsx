import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PlayerSelectionModal } from '../PlayerSelectionModal';

const roster = [
  { rank: 1, user: { id: 1, username: 'alpha', display_name: 'Alpha' } },
  { rank: 2, user: { id: 2, username: 'bravo', display_name: 'Bravo' } },
];

const buildProps = (overrides = {}) => ({
  show: true,
  onClose: jest.fn(),
  manageQuery: '',
  setManageQuery: jest.fn(),
  withSimTotals: roster,
  selectedUserIds: ['1'],
  setSelectedUserIds: jest.fn(),
  addUser: jest.fn(),
  showAll: false,
  setShowAll: jest.fn(),
  ...overrides,
});

describe('PlayerSelectionModal', () => {
  test('comparison scope lives with the roster rather than in the page chrome', () => {
    const props = buildProps();
    render(<PlayerSelectionModal {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /everyone/i }));
    expect(props.setShowAll).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole('button', { name: /^selected$/i }));
    expect(props.setShowAll).toHaveBeenCalledWith(false);
  });

  test('showing everyone says so instead of implying a selection is in force', () => {
    render(<PlayerSelectionModal {...buildProps({ showAll: true })} />);

    expect(screen.getByText(/all 2 players/i)).toBeInTheDocument();
    expect(screen.getByText(/showing everyone/i)).toBeInTheDocument();
  });

  test('ticking and unticking a player edits the comparison', () => {
    const props = buildProps();
    render(<PlayerSelectionModal {...props} />);

    fireEvent.click(screen.getByText('Bravo'));
    expect(props.addUser).toHaveBeenCalledWith('2');

    fireEvent.click(screen.getByText('Alpha'));
    expect(props.setSelectedUserIds).toHaveBeenCalled();
  });

  test('a search that matches nobody says so rather than showing an empty sheet', () => {
    render(<PlayerSelectionModal {...buildProps({ manageQuery: 'zzz' })} />);
    expect(screen.getByText(/no player matches/i)).toBeInTheDocument();
  });

  test('escape closes the sheet', () => {
    const props = buildProps();
    render(<PlayerSelectionModal {...props} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalled();
  });
});
