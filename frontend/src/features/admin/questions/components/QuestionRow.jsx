import React, { useCallback, useEffect, useState } from 'react';
import { ADMIN_STYLES } from '../adminPanelStyles';
import QuestionEditFields from './QuestionEditFields';

const QuestionRow = ({
  question,
  onUpdate,
  onDelete,
  themeStyles = ADMIN_STYLES,
  inputClass,
  secondaryButtonClass,
  dangerButtonClass,
  chipClass,
  mutedTextClass,
  awardOptions,
  playerOptions,
  teamOptions,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const getInitialDraft = useCallback(() => {
    const initial = { ...question };
    initial.answer_point_values_json = JSON.stringify(initial.answer_point_values || {}, null, 2);
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
    setBusy(true);
    setSaveError("");

    let answerPointValues = {};
    try {
      answerPointValues = draft.answer_point_values_json?.trim()
        ? JSON.parse(draft.answer_point_values_json)
        : {};
    } catch {
      setSaveError('Answer point values must be valid JSON, e.g. {"No": 1, "Runner Up": 2.5}.');
      setBusy(false);
      return;
    }

    const basePayload = {
      text: draft.text.trim(),
      point_value: Number(draft.point_value),
      answer_point_values: answerPointValues,
    };

    let specificPayload = {};

    switch (question.question_type) {
      case "superlative":
        specificPayload = { award_id: draft.award ? Number(draft.award) : Number(draft.award_id) };
        break;
      case "prop":
        specificPayload = {
          outcome_type: draft.outcome_type,
          related_player_id: draft.related_player
            ? Number(draft.related_player)
            : draft.related_player_id
              ? Number(draft.related_player_id)
              : null,
          line:
            draft.outcome_type === "over_under" && draft.line !== "" && draft.line != null
              ? Number(draft.line)
              : null,
        };
        break;
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

    await onUpdate({ ...basePayload, ...specificPayload });
    setBusy(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDraft(getInitialDraft());
  };

  const bodyTextClass = `text-sm leading-relaxed ${themeStyles.textSecondary}`;
  const metaTextClass = `text-xs ${themeStyles.muted}`;

  return (
    <div className="flex flex-col gap-4 px-8 py-6 md:flex-row md:items-start md:justify-between">
      <div className="flex-1 space-y-3">
        <div className={`flex items-center gap-3 text-xs uppercase tracking-[0.3em] ${themeStyles.subtle}`}>
          <span className={chipClass || "court-admin-badge court-admin-badge--neutral"}>
            {question.question_type}
          </span>
          <span className={mutedTextClass || metaTextClass}>ID #{question.id}</span>
        </div>
        {isEditing ? (
          <textarea
            value={draft.text}
            onChange={(e) => setDraft((prev) => ({ ...prev, text: e.target.value }))}
            className={`${inputClass} w-full`}
            rows={3}
          />
        ) : (
          <p className={bodyTextClass}>{question.text}</p>
        )}
        <div className={`flex flex-wrap gap-3 text-xs ${themeStyles.muted}`}>
          <span>Points: {question.point_value}</span>
          {question.answer_point_values && Object.keys(question.answer_point_values).length > 0 && (
            <span>Custom scoring enabled</span>
          )}
          <span>Updated: {new Date(question.last_updated).toLocaleString()}</span>
        </div>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        {isEditing && (
          <div className="space-y-4">
            <label className={`text-xs ${themeStyles.subtle}`}>
              Point value
              <input
                type="number"
                value={draft.point_value}
                min="0"
                step="0.5"
                onChange={(e) => setDraft((prev) => ({ ...prev, point_value: e.target.value }))}
                className={`${inputClass} mt-2 w-full`}
              />
            </label>
            <label className={`text-xs ${themeStyles.subtle}`}>
              Answer point values JSON
              <textarea
                value={draft.answer_point_values_json || "{}"}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, answer_point_values_json: e.target.value }))
                }
                className={`${inputClass} mt-2 w-full font-mono text-xs`}
                rows={4}
                placeholder='{"No": 1, "Runner Up": 2.5}'
              />
            </label>
            {saveError && <p className="text-xs text-[var(--court-danger)]">{saveError}</p>}
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
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
            disabled={busy}
            className={`${secondaryButtonClass} flex-1`}
          >
            {isEditing ? (busy ? "Saving…" : "Save") : "Edit"}
          </button>
          <button type="button" onClick={onDelete} disabled={busy} className={dangerButtonClass}>
            Delete
          </button>
        </div>
        {isEditing && (
          <button
            type="button"
            onClick={handleCancel}
            className={`text-xs ${themeStyles.subtle} transition hover:opacity-80`}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default QuestionRow;
