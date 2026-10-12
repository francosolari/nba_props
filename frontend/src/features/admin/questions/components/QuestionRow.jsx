import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { ADMIN_STYLES } from '../adminPanelStyles';
import { questionTypeLabel } from '../questionTypes';
import { PROP_KINDS, outcomeForKind, propKind, statLabel } from '../statProps';
import { pointsPayload } from './AnswerPoints';
import QuestionEditFields from './QuestionEditFields';

const QuestionRow = ({
  question,
  onUpdate,
  onDelete,
  themeStyles = ADMIN_STYLES,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
  awardOptions,
  playerOptions,
  teamOptions,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const getInitialDraft = useCallback(() => {
    const initial = { ...question };
    initial.kind = propKind(question);
    // Inputs hold strings; the API returns numbers.
    initial.points_if_correct = Object.fromEntries(
      Object.entries(question.points_if_correct || {}).map(([answer, points]) => [answer, String(points)]),
    );
    if (initial.award_id !== undefined) initial.award = initial.award_id;
    if (initial.related_player_id !== undefined) initial.related_player = initial.related_player_id;
    if (initial.team1_id !== undefined) initial.team1 = initial.team1_id;
    if (initial.team2_id !== undefined) initial.team2 = initial.team2_id;
    if (initial.player_stat_id !== undefined) initial.player_stat = initial.player_stat_id;
    return initial;
  }, [question]);

  const [draft, setDraft] = useState(getInitialDraft());
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!isEditing) setDraft(getInitialDraft());
  }, [question, isEditing, getInitialDraft]);

  const handleSave = async () => {
    if (question.question_type === "prop" && draft.kind === "player_stat" && (!draft.related_player || !draft.stat)) {
      setSaveError("Pick the player and the stat.");
      return;
    }
    setBusy(true);
    setSaveError("");

    // Partial credit (answer_point_values) is managed on the Grading tab, so
    // it is left untouched here.
    const basePayload = {
      text: draft.text.trim(),
      point_value: Number(draft.point_value),
    };

    let specificPayload = {};

    switch (question.question_type) {
      case "superlative": {
        // Player-pick questions have no award; only send one when set.
        const awardId = draft.award ?? draft.award_id;
        specificPayload = awardId ? { award_id: Number(awardId) } : {};
        break;
      }
      case "prop": {
        const outcome = outcomeForKind(draft.kind);
        specificPayload = {
          outcome_type: outcome,
          stat: draft.kind === "player_stat" ? draft.stat : "",
          points_if_correct: pointsPayload(draft.points_if_correct),
          related_player_id: draft.related_player
            ? Number(draft.related_player)
            : draft.related_player_id
              ? Number(draft.related_player_id)
              : null,
          line: outcome === "over_under" && draft.line !== "" && draft.line != null ? Number(draft.line) : null,
        };
        break;
      }
      case "player_stat":
        specificPayload = {
          player_stat_id: draft.player_stat ? Number(draft.player_stat) : Number(draft.player_stat_id),
          stat_type: (draft.stat_type || "").trim(),
          fixed_value:
            draft.fixed_value !== "" && draft.fixed_value != null ? Number(draft.fixed_value) : null,
        };
        break;
      case "head_to_head":
        specificPayload = {
          team1_id: draft.team1 ? Number(draft.team1) : Number(draft.team1_id),
          team2_id: draft.team2 ? Number(draft.team2) : Number(draft.team2_id),
          conference_matchup: Boolean(draft.conference_matchup),
        };
        break;
      case "ist":
        specificPayload = {
          prediction_type: draft.prediction_type,
          ist_group: draft.ist_group || null,
          is_tiebreaker: Boolean(draft.prediction_type === "tiebreaker" || draft.is_tiebreaker),
        };
        break;
      case "nba_finals":
        specificPayload = { group_name: draft.group_name || null };
        break;
      default:
        break;
    }

    const saved = await onUpdate({ ...basePayload, ...specificPayload });
    setBusy(false);
    // A failed save keeps the editor open with the draft intact.
    if (saved !== false) setIsEditing(false);
  };

  const handleDelete = async () => {
    setBusy(true);
    const deleted = await onDelete();
    setBusy(false);
    if (deleted === false) setConfirmingDelete(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDraft(getInitialDraft());
  };

  const isProp = question.question_type === "prop";
  const split = Object.entries(question.points_if_correct || {});
  const pointsText = split.length
    ? split.map(([answer, points]) => `${answer} ${points}`).join(" · ")
    : `${question.point_value} pt${Number(question.point_value) === 1 ? "" : "s"}`;

  return (
    <li
      className={`court-admin-qrow${isEditing ? " is-editing" : ""}`}
      onKeyDown={(event) => {
        if (event.key === "Escape" && isEditing) handleCancel();
      }}
    >
      <div className="court-admin-qrow__meta">
        <span className="court-admin-badge court-admin-badge--neutral">
          {questionTypeLabel(question.question_type)}
        </span>
        {isProp && <span>{PROP_KINDS.find((kind) => kind.value === propKind(question))?.label}</span>}
        <span>#{question.id}</span>
        <span>{pointsText}</span>
        {isProp && question.line != null && question.outcome_type === "over_under" && <span>Line {question.line}</span>}
        {isProp && question.stat && <span>{statLabel(question.stat)}</span>}
        {question.answer_count > 0 && <span>{question.answer_count} pick{question.answer_count === 1 ? "" : "s"}</span>}
      </div>

      {isEditing ? (
        <div className="court-admin-qrow__editor">
          <label className="court-admin-field">
            Question
            <textarea
              value={draft.text}
              onChange={(e) => setDraft((prev) => ({ ...prev, text: e.target.value }))}
              className={`${inputClass} h-auto py-3`}
              rows={3}
              autoFocus
            />
          </label>
          {!isProp && (
          <label className="court-admin-field court-admin-field--narrow">
            Points
            <input
              type="number"
              inputMode="decimal"
              value={draft.point_value}
              min="0"
              step="0.5"
              onChange={(e) => setDraft((prev) => ({ ...prev, point_value: e.target.value }))}
              className={inputClass}
            />
          </label>
          )}
          <QuestionEditFields
            questionType={question.question_type}
            draft={draft}
            setDraft={setDraft}
            awardOptions={awardOptions}
            playerOptions={playerOptions}
            teamOptions={teamOptions}
            inputClass={inputClass}
            themeStyles={themeStyles}
          />
          {saveError && <p className="text-sm text-[var(--court-danger)]" role="alert">{saveError}</p>}
          <div className="court-admin-qrow__actions">
            <button type="button" onClick={handleSave} disabled={busy} className={primaryButtonClass}>
              {busy ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={handleCancel} disabled={busy} className={secondaryButtonClass}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="court-admin-qrow__text">{question.text}</p>
          {confirmingDelete ? (
            <div className="court-admin-qrow__actions court-admin-qrow__confirm" role="group" aria-label="Confirm delete">
              <span>Delete this question and its answers?</span>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="court-admin-chip-btn court-admin-chip-btn--danger"
              >
                {busy ? "Deleting…" : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={busy}
                className="court-admin-chip-btn"
                autoFocus
              >
                Keep
              </button>
            </div>
          ) : (
            <div className="court-admin-qrow__actions">
              <button type="button" onClick={() => setIsEditing(true)} className="court-admin-chip-btn court-admin-chip-btn--blue">
                <Pencil aria-hidden="true" className="h-4 w-4" />
                Edit
              </button>
              <button type="button" onClick={() => setConfirmingDelete(true)} className="court-admin-chip-btn" aria-label={`Delete question #${question.id}`}>
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                Delete
              </button>
            </div>
          )}
        </>
      )}
    </li>
  );
};

export default QuestionRow;
