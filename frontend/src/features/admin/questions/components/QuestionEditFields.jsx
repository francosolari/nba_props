import React from 'react';
import SelectComponent from '../../../../components/SelectComponent';
import CourtSelect from '../../../../components/CourtSelect';
import AnswerPoints from './AnswerPoints';
import { PROP_KINDS, STAT_OPTIONS, outcomeForKind } from '../statProps';

// Type-specific edit fields for an existing question, rendered inside
// QuestionRow's inline edit mode. Split out to keep QuestionRow under the
// ~400-line ceiling.
const QuestionEditFields = ({
  questionType,
  draft,
  setDraft,
  awardOptions,
  playerOptions,
  teamOptions,
  inputClass,
  themeStyles,
}) => {
  switch (questionType) {
    case "superlative":
      return (
        <SelectComponent
          options={awardOptions}
          value={awardOptions.find((option) => option.value === draft.award) || null}
          onChange={(option) =>
            setDraft((prev) => ({ ...prev, award: option ? option.value : null }))
          }
          placeholder="Select award"
          isClearable
          mode={themeStyles.mode}
        />
      );
    case "prop": {
      const outcome = outcomeForKind(draft.kind);
      const isStat = draft.kind === "player_stat";
      const pickCount = draft.answer_count || 0;
      const orphansPicks = pickCount > 0 && outcome !== draft.outcome_type;
      return (
        <div className="space-y-4">
          <div className="court-admin-choice" role="radiogroup" aria-label="Prop type">
            {PROP_KINDS.map((kind) => (
              <button
                key={kind.value}
                type="button"
                role="radio"
                aria-checked={draft.kind === kind.value}
                className={draft.kind === kind.value ? "is-selected" : ""}
                onClick={() => setDraft((prev) => ({
                  ...prev,
                  kind: kind.value,
                  points_if_correct: outcomeForKind(kind.value) === outcomeForKind(prev.kind) ? prev.points_if_correct : {},
                }))}
              >
                {kind.label}
              </button>
            ))}
          </div>
          {orphansPicks && (
            <p className="court-admin-warning" role="status">
              {pickCount} pick{pickCount === 1 ? " was" : "s were"} made as{" "}
              {draft.outcome_type === "yes_no" ? "Yes/No" : "Over/Under"}. After this change{" "}
              {pickCount === 1 ? "it" : "they"} can't match the correct answer and will score 0.
            </p>
          )}
          <div className="court-admin-field">
            {isStat ? "Player" : "Player (optional)"}
            <SelectComponent
              options={playerOptions}
              value={playerOptions.find((option) => option.value === draft.related_player) || null}
              onChange={(option) =>
                setDraft((prev) => ({ ...prev, related_player: option ? option.value : null }))
              }
              placeholder="Search players..."
              isClearable
              mode={themeStyles.mode}
            />
          </div>
          {outcome === "over_under" && (
            <div className={isStat ? "grid grid-cols-[minmax(0,1fr)_120px] gap-3" : "max-w-[160px]"}>
              {isStat && (
                <div className="court-admin-field">
                  Stat
                  <CourtSelect
                    label="Stat"
                    showLabel={false}
                    value={draft.stat || ""}
                    onChange={(e) => setDraft((prev) => ({ ...prev, stat: e.target.value }))}
                  >
                    <option value="">Pick a stat</option>
                    {STAT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </CourtSelect>
                </div>
              )}
              <label className="court-admin-field">
                Line
                <input
                  type="number"
                  inputMode="decimal"
                  value={draft.line ?? ""}
                  step="0.5"
                  onChange={(e) => setDraft((prev) => ({ ...prev, line: e.target.value }))}
                  className={inputClass}
                />
              </label>
            </div>
          )}
          <AnswerPoints
            idPrefix={`edit-${draft.id}`}
            outcomeType={outcome}
            pointValue={draft.point_value}
            pointsIfCorrect={draft.points_if_correct}
            onChange={({ pointValue, pointsIfCorrect }) =>
              setDraft((prev) => ({ ...prev, point_value: pointValue, points_if_correct: pointsIfCorrect }))
            }
          />
        </div>
      );
    }
    case "head_to_head": {
      if (draft.matchup === "players") {
        return (
          <div className="space-y-4">
            {[["player1", "Player 1"], ["player2", "Player 2"]].map(([key, label]) => (
              <SelectComponent
                key={key}
                options={playerOptions}
                value={playerOptions.find((option) => option.value === draft[key]) || null}
                onChange={(option) => setDraft((prev) => ({ ...prev, [key]: option ? option.value : null }))}
                placeholder={`Select ${label.toLowerCase()}`}
                isClearable
                mode={themeStyles.mode}
              />
            ))}
          </div>
        );
      }
      return (
        <div className="space-y-4">
          <SelectComponent
            options={teamOptions}
            value={teamOptions.find((option) => option.value === draft.team1) || null}
            onChange={(option) =>
              setDraft((prev) => ({ ...prev, team1: option ? option.value : null }))
            }
            placeholder="Select team 1"
            isClearable
            mode={themeStyles.mode}
          />
          <SelectComponent
            options={teamOptions}
            value={teamOptions.find((option) => option.value === draft.team2) || null}
            onChange={(option) =>
              setDraft((prev) => ({ ...prev, team2: option ? option.value : null }))
            }
            placeholder="Select team 2"
            isClearable
            mode={themeStyles.mode}
          />
          <label className={`flex items-center gap-2 text-xs ${themeStyles.subtle}`}>
            <input
              type="checkbox"
              checked={draft.conference_matchup || false}
              onChange={(e) => setDraft((prev) => ({ ...prev, conference_matchup: e.target.checked }))}
              className="h-4 w-4 rounded-[2px] border-2 border-[var(--court-rule)] bg-[var(--court-paper)] text-[var(--court-blue)] focus:ring-0"
            />
            Conference matchup (show Eastern / Western Conference)
          </label>
        </div>
      );
    }
    case "player_stat":
      return (
        <div className="space-y-4">
          <label className={`text-xs ${themeStyles.subtle}`}>
            Player Stat ID
            <input
              type="number"
              value={draft.player_stat || ""}
              onChange={(e) => setDraft((prev) => ({ ...prev, player_stat: e.target.value }))}
              className={`${inputClass} mt-2 w-full`}
            />
          </label>
          <label className={`text-xs ${themeStyles.subtle}`}>
            Stat Type
            <input
              type="text"
              value={draft.stat_type || ""}
              onChange={(e) => setDraft((prev) => ({ ...prev, stat_type: e.target.value }))}
              className={`${inputClass} mt-2 w-full`}
            />
          </label>
          <label className={`text-xs ${themeStyles.subtle}`}>
            Fixed Value
            <input
              type="number"
              step="0.1"
              value={draft.fixed_value || ""}
              onChange={(e) => setDraft((prev) => ({ ...prev, fixed_value: e.target.value }))}
              className={`${inputClass} mt-2 w-full`}
            />
          </label>
        </div>
      );
    case "ist":
      return (
        <div className="space-y-4">
          <label className={`text-xs ${themeStyles.subtle}`}>
            Prediction Type
            <select
              value={draft.prediction_type}
              onChange={(e) => setDraft((prev) => ({ ...prev, prediction_type: e.target.value }))}
              className={`${inputClass} mt-2 w-full`}
            >
              <option value="group_winner">Group Winner</option>
              <option value="wildcard">Wildcard</option>
              <option value="conference_winner">Conference Winner</option>
              <option value="tiebreaker">Tiebreaker</option>
            </select>
          </label>
          <label className={`text-xs ${themeStyles.subtle}`}>
            IST Group
            <input
              type="text"
              value={draft.ist_group || ""}
              onChange={(e) => setDraft((prev) => ({ ...prev, ist_group: e.target.value }))}
              className={`${inputClass} mt-2 w-full`}
            />
          </label>
          <label className={`flex items-center gap-2 text-xs ${themeStyles.subtle}`}>
            <input
              type="checkbox"
              checked={draft.is_tiebreaker || false}
              onChange={(e) => setDraft((prev) => ({ ...prev, is_tiebreaker: e.target.checked }))}
              className="h-4 w-4 rounded-[2px] border-2 border-[var(--court-rule)] bg-[var(--court-paper)] text-[var(--court-blue)] focus:ring-0"
            />
            Is Tiebreaker
          </label>
        </div>
      );
    case "nba_finals":
      return (
        <label className={`text-xs ${themeStyles.subtle}`}>
          Group Name
          <input
            type="text"
            value={draft.group_name || ""}
            onChange={(e) => setDraft((prev) => ({ ...prev, group_name: e.target.value }))}
            className={`${inputClass} mt-2 w-full`}
          />
        </label>
      );
    default:
      return null;
  }
};

export default QuestionEditFields;
