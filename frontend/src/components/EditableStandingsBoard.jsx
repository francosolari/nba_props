import React, { memo } from 'react';
import { GripVertical } from 'lucide-react';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import TeamLogo from './TeamLogo';

const ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th',
  '9th', '10th', '11th', '12th', '13th', '14th', '15th'];

/** Last season's record, so an order is picked against evidence rather than
 *  memory. It is reference, not the pick, so it stays a step down in weight.
 *
 *  The finish shows only once it disagrees with the seat the team is now in.
 *  The board opens in last season's order, so printing both on every row would
 *  say the same number twice; after a drag it becomes the useful half — this
 *  team finished 5th and you have them 1st. */
const PreviousSeason = ({ team, index }) => {
  const previous = team?.previous_season;
  if (!previous || previous.wins == null) return null;
  const finish = previous.position ? ORDINALS[previous.position] || `${previous.position}th` : null;
  const moved = previous.position && previous.position !== index + 1;
  return (
    <span
      className="submission-standing-row__last"
      title={`Last season: ${previous.wins}\u2013${previous.losses}${finish ? `, finished ${finish}` : ''}`}
    >
      <b>{previous.wins}&#8211;{previous.losses}</b>
      {moved && <i>was {finish}</i>}
    </span>
  );
};

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
      <PreviousSeason team={team} index={index} />
    </div>
  );
};

const ConferenceStandings = memo(({ conference, teams, isEditable }) => {
  const key = conference.toLowerCase();
  return (
    <section className={`submission-conference-ledger is-${key}`} aria-labelledby={`${key}-standings-title`}>
      <header>
        <h3 id={`${key}-standings-title`}>{conference}ern</h3>
        <span>Seed 1–15 · last season</span>
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
