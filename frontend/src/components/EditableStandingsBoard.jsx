import React, { memo } from 'react';
import { GripVertical } from 'lucide-react';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import TeamLogo from './TeamLogo';

const StandingRow = ({ team, index, conference, isEditable, provided, snapshot }) => {
  const { style: draggableStyle, ...draggableProps } = provided.draggableProps;
  const itemStyle = {
    ...(draggableStyle || {}),
    boxSizing: 'border-box',
    transition: snapshot.isDropAnimating ? 'transform 0.0001s linear' : draggableStyle?.transition,
  };
  if (!snapshot.isDragging && typeof draggableStyle?.width === 'undefined') itemStyle.width = '100%';

  return (
    <div
      ref={provided.innerRef}
      {...draggableProps}
      {...provided.dragHandleProps}
      style={itemStyle}
      className={`submission-standing-row${snapshot.isDragging ? ' is-dragging' : ''}${isEditable ? ' is-editable' : ''}`}
      aria-label={`${conference} seed ${index + 1}: ${team.team_name}${isEditable ? '. Drag to reorder.' : ''}`}
    >
      <GripVertical className="submission-standing-row__grip" aria-hidden="true" />
      <strong className="submission-standing-row__seed">{index + 1}</strong>
      <TeamLogo className="submission-standing-row__logo" teamName={team.team_name} />
      <span className="submission-standing-row__team" title={team.team_name}>{team.team_name}</span>
    </div>
  );
};

const ConferenceStandings = memo(({ conference, teams, isEditable }) => {
  const key = conference.toLowerCase();
  return (
    <section className={`submission-conference-ledger is-${key}`} aria-labelledby={`${key}-standings-title`}>
      <header>
        <h3 id={`${key}-standings-title`}>{conference}ern</h3>
        <span>Seed 1–15</span>
      </header>
      <Droppable droppableId={`${conference}-standings`} direction="vertical">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`submission-conference-list${snapshot.isDraggingOver ? ' is-dragging-over' : ''}`}
          >
            {teams.length > 0 ? teams.map((team, index) => (
              <Draggable
                key={team.team_id.toString()}
                draggableId={team.team_id.toString()}
                index={index}
                isDragDisabled={!isEditable}
              >
                {(dragProvided, dragSnapshot) => (
                  <StandingRow
                    team={team}
                    index={index}
                    conference={conference}
                    isEditable={isEditable}
                    provided={dragProvided}
                    snapshot={dragSnapshot}
                  />
                )}
              </Draggable>
            )) : <p className="submission-standings-empty">No teams available.</p>}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </section>
  );
});

export default function EditableStandingsBoard({
  eastStandings,
  westStandings,
  loading,
  saving,
  isEditing,
  isDragging,
  canEdit,
  hasUnsavedChanges,
  onDragStart,
  onDragEnd,
  onCancel,
  onReset,
  onSave,
  onEdit,
}) {
  return (
    <div className={`submission-standings-board${isDragging ? ' is-dragging' : ''}`}>
      {loading ? (
        <div className="submission-standings-loading" role="status">Loading standings…</div>
      ) : (
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="submission-standings-grid">
            <ConferenceStandings conference="East" teams={eastStandings} isEditable={isEditing} />
            <ConferenceStandings conference="West" teams={westStandings} isEditable={isEditing} />
          </div>
        </DragDropContext>
      )}

      <footer className="submission-standings-actions">
        <p aria-live="polite">
          {hasUnsavedChanges ? 'Standings changed' : 'Team order saved'}
        </p>
        <div>
          {isEditing ? (
            <>
              <button type="button" onClick={onCancel} disabled={saving}>Cancel</button>
              <button type="button" onClick={onReset} disabled={saving}>Reset order</button>
              <button type="button" className="is-primary" onClick={onSave} disabled={saving || !hasUnsavedChanges}>
                {saving ? 'Saving…' : 'Save standings'}
              </button>
            </>
          ) : canEdit ? (
            <button type="button" className="is-primary" onClick={onEdit} disabled={loading}>Edit standings</button>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
