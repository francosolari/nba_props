// File: frontend/src/features/admin/grading/components/GradingQuestionRow.jsx
import React from 'react';
import SelectComponent from '../../../../components/SelectComponent';
import CourtSelect from '../../../../components/CourtSelect';
import { CheckCircle2, AlertCircle, Lock, LockOpen, Pencil } from 'lucide-react';

// Up to this many choices render as one-tap buttons; longer lists use a listbox.
const MAX_BUTTON_CHOICES = 4;

const ChoiceButtons = ({ choices, value, onChange, label }) => (
  <div className="court-admin-choice" role="radiogroup" aria-label={label}>
    {choices.map((choice) => (
      <button
        key={choice}
        type="button"
        role="radio"
        aria-checked={value === choice}
        onClick={() => onChange(choice)}
        className={value === choice ? 'is-selected' : ''}
      >
        {choice}
      </button>
    ))}
  </div>
);

const CustomScoring = ({ question, editor, playerOptions }) => {
  const {
    editedRunnerUpPlayerId,
    editedRunnerUpPoints,
    onRunnerUpPointsChange,
    editedScoringRows,
    addScoringRow,
    updateScoringRow,
    removeScoringRow,
    handleRunnerUpSelect,
  } = editor;
  const isSuperlative = question.question_type === 'SuperlativeQuestion';

  return (
    <details className="court-admin-disclosure" open={editedScoringRows.length > 0 || undefined}>
      <summary>
        Custom answer points
        {editedScoringRows.length > 0 && <span className="court-admin-badge court-admin-badge--warning">{editedScoringRows.length}</span>}
      </summary>
      <div className="grid gap-3">
        <p className="m-0 text-[13px] text-[var(--court-steel)]">
          Optional. Matching answers earn these points instead of the default {question.point_value}.
        </p>

        {isSuperlative && (
          <div className="grid gap-2 md:grid-cols-[1fr_110px]">
            <div className="court-admin-field">
              Runner-up player
              <SelectComponent
                options={playerOptions}
                value={editedRunnerUpPlayerId}
                onChange={(option) => handleRunnerUpSelect(option, question)}
                placeholder="Search runner-up player..."
                mode="light"
              />
            </div>
            <label className="court-admin-field">
              Runner-up pts
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                value={editedRunnerUpPoints}
                onChange={(e) => onRunnerUpPointsChange(e.target.value)}
                className="court-admin-input w-full"
              />
            </label>
          </div>
        )}

        {editedScoringRows.map((row, index) => (
          <div key={index} className="grid grid-cols-[minmax(0,1fr)_88px_auto] gap-2">
            <input
              type="text"
              value={row.answer}
              onChange={(e) => updateScoringRow(index, { answer: e.target.value })}
              placeholder="Answer, e.g. No or a player name"
              aria-label="Answer"
              className="court-admin-input min-w-0"
            />
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              value={row.points}
              onChange={(e) => updateScoringRow(index, { points: e.target.value })}
              placeholder="Pts"
              aria-label="Points"
              className="court-admin-input min-w-0"
            />
            <button
              type="button"
              onClick={() => removeScoringRow(index)}
              className="court-admin-chip-btn court-admin-chip-btn--danger"
              aria-label={`Remove ${row.answer || 'row'}`}
            >
              Remove
            </button>
          </div>
        ))}

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => addScoringRow('', '')} className="court-admin-chip-btn">
            Add row
          </button>
          {question.choices?.map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => addScoringRow(choice, choice === question.correct_answer ? question.point_value : '')}
              className="court-admin-chip-btn"
            >
              Add {choice}
            </button>
          ))}
        </div>
      </div>
    </details>
  );
};

const AnswerInput = ({ question, editor, playerOptions }) => {
  const {
    editedAnswer, setEditedAnswer, editedAnswerPlayerId, setEditedAnswerPlayerId,
    editedExtraPlayers, setEditedExtraPlayers,
  } = editor;
  const choices = question.choices || [];

  if (question.input_type === 'player_search') {
    return (
      <>
        <div className="court-admin-field">
          Correct player
          <SelectComponent
            options={playerOptions}
            value={editedAnswerPlayerId}
            onChange={(option) => {
              setEditedAnswerPlayerId(option ? option.value : null);
              setEditedAnswer(option ? option.label : '');
            }}
            placeholder="Search players..."
            mode="light"
          />
        </div>
        <div className="court-admin-field">
          Also correct (optional)
          <span>For questions with several right answers, like "Name a first-time All-Star".</span>
          <SelectComponent
            options={playerOptions.filter((option) => option.value !== editedAnswerPlayerId)}
            value={editedExtraPlayers}
            onChange={(selected) => setEditedExtraPlayers(selected || [])}
            placeholder="Add players..."
            isMulti
            mode="light"
          />
        </div>
      </>
    );
  }

  if (question.input_type === 'text') {
    return (
      <label className="court-admin-field">
        Correct answer
        <input
          type="text"
          value={editedAnswer}
          onChange={(e) => setEditedAnswer(e.target.value)}
          placeholder="Enter correct answer..."
          className="court-admin-input w-full"
          autoFocus
        />
      </label>
    );
  }

  if (choices.length > 0 && choices.length <= MAX_BUTTON_CHOICES) {
    return (
      <ChoiceButtons
        choices={choices}
        value={editedAnswer}
        onChange={setEditedAnswer}
        label={`Correct answer for: ${question.question_text}`}
      />
    );
  }

  return (
    <CourtSelect label="Correct answer" showLabel={false} value={editedAnswer} onChange={(e) => setEditedAnswer(e.target.value)}>
      <option value="">Select answer...</option>
      {choices.map((choice) => (
        <option key={choice} value={choice}>{choice}</option>
      ))}
    </CourtSelect>
  );
};

const GradingQuestionRow = ({ question, editor, playerOptions }) => {
  const isEditing = editor.editingQuestion === question.question_id;
  const { updateQuestionMutation, handleEditQuestion, handleSaveQuestion, handleCancelEdit } = editor;
  const isSet = question.has_correct_answer;

  return (
    <li
      className={`court-admin-grow${isSet ? ' is-set' : ''}${isEditing ? ' is-editing' : ''}`}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && isEditing) handleCancelEdit();
      }}
    >
      <div className="court-admin-grow__status">
        {isSet ? (
          <span className="court-admin-badge court-admin-badge--success"><CheckCircle2 aria-hidden="true" className="h-3 w-3" />Set</span>
        ) : (
          <span className="court-admin-badge court-admin-badge--warning"><AlertCircle aria-hidden="true" className="h-3 w-3" />Needs answer</span>
        )}
        {question.is_finalized && (
          <span className="court-admin-badge court-admin-badge--neutral"><Lock aria-hidden="true" className="h-3 w-3" />Finalized</span>
        )}
        <span>
          {Object.keys(question.points_if_correct || {}).length
            ? Object.entries(question.points_if_correct).map(([answer, pts]) => `${answer} ${pts}`).join(' · ')
            : `${question.point_value} pt${Number(question.point_value) === 1 ? '' : 's'}`}
        </span>
        <span>{question.submission_count} picks</span>
        {question.line != null && question.input_type === 'over_under' && <span>Line {question.line}</span>}
        {question.related_player_name && <span>{question.related_player_name}</span>}
      </div>

      <p className="court-admin-grow__text">{question.question_text}</p>

      {isEditing ? (
        <div className="court-admin-qrow__editor">
          <AnswerInput question={question} editor={editor} playerOptions={playerOptions} />
          <CustomScoring question={question} editor={editor} playerOptions={playerOptions} />
          <div className="court-admin-qrow__actions">
            <button
              type="button"
              onClick={() => handleSaveQuestion(question)}
              disabled={updateQuestionMutation.isPending}
              className="court-button flex-1"
            >
              {updateQuestionMutation.isPending ? 'Saving…' : 'Save answer'}
            </button>
            <button type="button" onClick={handleCancelEdit} className="court-button court-button--secondary flex-1">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="court-admin-grow__answer">
          <span className={isSet ? 'is-set' : ''}>
            {isSet ? (question.correct_answers?.length ? question.correct_answers.join(', ') : question.correct_answer) : 'No answer yet'}
          </span>
          <button
            type="button"
            onClick={() => handleEditQuestion(question)}
            className={`court-admin-chip-btn${isSet ? '' : ' court-admin-chip-btn--blue'}`}
          >
            <Pencil aria-hidden="true" className="h-4 w-4" />
            {isSet ? 'Change' : 'Set answer'}
          </button>
          {isSet && (
            <button
              type="button"
              onClick={() => updateQuestionMutation.mutate({
                questionId: question.question_id,
                isFinalized: !question.is_finalized,
              })}
              disabled={updateQuestionMutation.isPending}
              className="court-admin-chip-btn"
              title={question.is_finalized
                ? 'Reopen: the answer can change again and refreshes may update it'
                : 'Mark the answer official; refreshes stop updating it and the board shows it locked'}
            >
              {question.is_finalized ? <LockOpen aria-hidden="true" className="h-4 w-4" /> : <Lock aria-hidden="true" className="h-4 w-4" />}
              {question.is_finalized ? 'Reopen' : 'Finalize'}
            </button>
          )}
        </div>
      )}
    </li>
  );
};

export default GradingQuestionRow;
