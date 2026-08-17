import React from 'react';
import { render, screen } from '@testing-library/react';
import EditableStandingsBoard from '../EditableStandingsBoard';

const teams = {
  east: [{ team_id: 1, team_name: 'Boston Celtics' }],
  west: [{ team_id: 2, team_name: 'Oklahoma City Thunder' }],
};

const renderBoard = (overrides = {}) => render(
  <EditableStandingsBoard
    eastStandings={teams.east}
    westStandings={teams.west}
    loading={false}
    saving={false}
    isEditing
    isDragging={false}
    canEdit
    hasUnsavedChanges
    onDragStart={jest.fn()}
    onDragEnd={jest.fn()}
    onCancel={jest.fn()}
    onReset={jest.fn()}
    onSave={jest.fn()}
    onEdit={jest.fn()}
    {...overrides}
  />
);

describe('EditableStandingsBoard', () => {
  it('renders East and West together in the responsive standings grid', () => {
    const { container } = renderBoard();

    expect(screen.getByRole('heading', { name: 'Eastern' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Western' })).toBeInTheDocument();
    expect(screen.getByLabelText(/East seed 1: Boston Celtics/)).toBeInTheDocument();
    expect(screen.getByLabelText(/West seed 1: Oklahoma City Thunder/)).toBeInTheDocument();
    expect(container.querySelector('.submission-standings-grid').children).toHaveLength(2);
  });

  it('keeps the save action unavailable until standings change', () => {
    renderBoard({ hasUnsavedChanges: false });

    expect(screen.getByRole('button', { name: 'Save standings' })).toBeDisabled();
    expect(screen.getByText('Team order saved')).toBeInTheDocument();
  });
});

describe('EditableStandingsBoard — last season', () => {
  const withRecords = (eastPrevious, westPrevious = null) => renderBoard({
    eastStandings: [{ team_id: 1, team_name: 'Boston Celtics', previous_season: eastPrevious }],
    westStandings: [{ team_id: 2, team_name: 'Oklahoma City Thunder', previous_season: westPrevious }],
  });

  it("carries last season's record so an order is picked against evidence", () => {
    withRecords({ wins: 56, losses: 26, position: 1 });

    const record = screen.getByText('56–26');
    expect(record).toBeInTheDocument();
    expect(record.closest('.submission-standing-row__last'))
      .toHaveAttribute('title', 'Last season: 56–26, finished 1st');
  });

  it('stays quiet about a finish that matches the seat the team is already in', () => {
    // The board opens in last season's order, so printing both would say the
    // same number twice on every row.
    withRecords({ wins: 56, losses: 26, position: 1 });
    expect(screen.queryByText(/^Finished /)).not.toBeInTheDocument();
  });

  it('names the finish once it disagrees with where the team has been put', () => {
    withRecords({ wins: 20, losses: 62, position: 12 });
    expect(screen.getByText('Finished 12th')).toBeInTheDocument();
  });

  it('shows nothing for a team with no previous season on record', () => {
    const { container } = withRecords(null, null);
    expect(container.querySelectorAll('.submission-standing-row__last')).toHaveLength(0);
  });
});
