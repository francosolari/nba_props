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
