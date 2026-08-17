// File: frontend/src/features/admin/grading/components/GradingQuestionRow.jsx
import React from 'react';
import SelectComponent from '../../../../components/SelectComponent';
import CourtSelect from '../../../../components/CourtSelect';
import {
  CheckCircle2,
  AlertCircle,
  Lock,
  Edit2,
  Save,
  X,
} from 'lucide-react';

const GradingQuestionRow = ({ question, editor, playerOptions }) => {
  const isEditing = editor.editingQuestion === question.question_id;
  const {
    editedAnswer,
    setEditedAnswer,
    editedAnswerPlayerId,
    setEditedAnswerPlayerId,
    editedRunnerUpPlayerId,
    editedRunnerUpPoints,
    onRunnerUpPointsChange,
    editedScoringRows,
    updateQuestionMutation,
    handleEditQuestion,
    handleSaveQuestion,
    handleCancelEdit,
    addScoringRow,
    updateScoringRow,
    removeScoringRow,
    handleRunnerUpSelect,
  } = editor;

  return (
    <div className={question.has_correct_answer ? 'court-admin-grading-row court-admin-grading-row--set' : 'court-admin-grading-row'}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-sm font-medium">{question.question_text}</div>
            {question.is_finalized && (
              <Lock className="w-4 h-4 text-[var(--court-warning)]" title="Finalized" />
            )}
          </div>

          <div className="text-xs space-y-1 text-[var(--court-steel)]">
            <div>Type: {question.question_type}</div>
            <div>Points: {question.point_value}</div>
            <div>Submissions: {question.submission_count}</div>
          </div>

          <div className="mt-3">
            {isEditing ? (
              <div className="space-y-2">
                {question.input_type === 'over_under' && question.line && (
                  <div className="text-xs text-[var(--court-steel)]">
                    Line: {question.line} {question.related_player_name && `(${question.related_player_name})`}
                  </div>
                )}

                {question.input_type === 'yes_no' && question.related_player_name && (
                  <div className="text-xs text-[var(--court-steel)]">
                    Player: {question.related_player_name}
                  </div>
                )}

                <div className="space-y-3">
                  {question.input_type === 'yes_no' && (
                    <div className="flex gap-3">
                      {question.choices?.map((choice) => (
                        <label key={choice} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`q-${question.question_id}`}
                            value={choice}
                            checked={editedAnswer === choice}
                            onChange={(e) => setEditedAnswer(e.target.value)}
                            className="w-4 h-4 accent-[var(--court-blue)]"
                          />
                          <span className="text-sm">{choice}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.input_type === 'over_under' && (
                    <div className="flex gap-3">
                      {question.choices?.map((choice) => (
                        <label key={choice} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`q-${question.question_id}`}
                            value={choice}
                            checked={editedAnswer === choice}
                            onChange={(e) => setEditedAnswer(e.target.value)}
                            className="w-4 h-4 accent-[var(--court-blue)]"
                          />
                          <span className="text-sm">{choice}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.input_type === 'team_choice' && (
                    <CourtSelect label="Select team" showLabel={false} value={editedAnswer} onChange={(e) => setEditedAnswer(e.target.value)}>
                      <option value="">Select team...</option>
                      {question.choices?.map((choice) => (
                        <option key={choice} value={choice}>{choice}</option>
                      ))}
                    </CourtSelect>
                  )}

                  {question.input_type === 'player_search' && (
                    <div className="flex-1">
                      <SelectComponent
                        options={playerOptions}
                        value={editedAnswerPlayerId}
                        onChange={(option) => {
                          setEditedAnswerPlayerId(option ? option.value : null);
                          setEditedAnswer(option ? option.label : '');
                        }}
                        placeholder="Search player database..."
                        mode="light"
                      />
                      <div className="mt-1 text-[11px] text-[var(--court-steel)]">
                        Saves the selected player's canonical name for grading submitted player IDs.
                      </div>
                    </div>
                  )}

                  {question.input_type === 'text' && (
                    <input
                      type="text"
                      value={editedAnswer}
                      onChange={(e) => setEditedAnswer(e.target.value)}
                      placeholder="Enter correct answer..."
                      className="court-admin-input w-full"
                      autoFocus
                    />
                  )}

                  {question.input_type !== 'yes_no' && question.input_type !== 'over_under' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveQuestion(question)}
                        disabled={updateQuestionMutation.isPending}
                        className="court-admin-chip-btn court-admin-chip-btn--success"
                        title="Save"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={handleCancelEdit} className="court-admin-chip-btn" title="Cancel">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="border border-[var(--court-warning-soft)] bg-[var(--court-warning-soft)] p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wide text-[var(--court-warning)]">
                          Custom answer points
                        </div>
                        <div className="text-[11px] text-[var(--court-steel)]">
                          Optional. Matching answers earn these points instead of the default point value.
                        </div>
                      </div>
                      <button type="button" onClick={() => addScoringRow('', '')} className="court-admin-chip-btn court-admin-chip-btn--warning">
                        Add row
                      </button>
                    </div>

                    {question.question_type === 'SuperlativeQuestion' && (
                      <div className="mb-3 grid gap-2 md:grid-cols-[1fr_110px]">
                        <div>
                          <div className="mb-1 text-[11px] font-semibold">Runner-up player</div>
                          <SelectComponent
                            options={playerOptions}
                            value={editedRunnerUpPlayerId}
                            onChange={(option) => handleRunnerUpSelect(option, question)}
                            placeholder="Search runner-up player..."
                            mode="light"
                          />
                        </div>
                        <label className="text-[11px] font-semibold">
                          Runner-up pts
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={editedRunnerUpPoints}
                            onChange={(e) => onRunnerUpPointsChange(e.target.value)}
                            className="court-admin-input mt-1 w-full"
                          />
                        </label>
                      </div>
                    )}

                    {editedScoringRows.length === 0 ? (
                      <div className="border border-dashed border-[var(--court-rule-soft)] px-3 py-2 text-xs text-[var(--court-steel)]">
                        No custom scoring rows. Correct answers use the default point value.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {editedScoringRows.map((row, index) => (
                          <div key={`${row.answer}-${index}`} className="grid gap-2 md:grid-cols-[1fr_110px_auto]">
                            <input
                              type="text"
                              value={row.answer}
                              onChange={(e) => updateScoringRow(index, { answer: e.target.value })}
                              placeholder="Answer text, e.g. No or player name"
                              className="court-admin-input"
                            />
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={row.points}
                              onChange={(e) => updateScoringRow(index, { points: e.target.value })}
                              placeholder="Pts"
                              className="court-admin-input"
                            />
                            <button type="button" onClick={() => removeScoringRow(index)} className="court-admin-chip-btn court-admin-chip-btn--danger">
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {question.choices?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {question.choices.map((choice) => (
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
                    )}
                  </div>
                </div>

                {(question.input_type === 'yes_no' || question.input_type === 'over_under') && editedAnswer && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveQuestion(question)}
                      disabled={updateQuestionMutation.isPending}
                      className="court-admin-chip-btn court-admin-chip-btn--success"
                    >
                      <Save className="w-3 h-3" />
                      Save
                    </button>
                    <button type="button" onClick={handleCancelEdit} className="court-admin-chip-btn">
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <span className="text-xs text-[var(--court-steel)]">Correct Answer: </span>
                  <span className={question.has_correct_answer ? 'text-sm text-[var(--court-success)]' : 'text-sm text-[var(--court-steel)]'}>
                    {question.correct_answer || '(not set)'}
                  </span>
                  {question.input_type === 'over_under' && question.line && (
                    <span className="text-xs text-[var(--court-steel)] ml-2">(Line: {question.line})</span>
                  )}
                  {question.related_player_name && (
                    <span className="text-xs text-[var(--court-steel)] ml-2">({question.related_player_name})</span>
                  )}
                </div>
                <button type="button" onClick={() => handleEditQuestion(question)} className="court-admin-chip-btn court-admin-chip-btn--blue">
                  <Edit2 className="w-3 h-3" />
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          {question.has_correct_answer ? (
            <CheckCircle2 className="w-6 h-6 text-[var(--court-success)]" />
          ) : (
            <AlertCircle className="w-6 h-6 text-[var(--court-warning)]" />
          )}
        </div>
      </div>
    </div>
  );
};

export default GradingQuestionRow;
