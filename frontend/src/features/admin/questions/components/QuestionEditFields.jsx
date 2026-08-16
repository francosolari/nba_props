import React from 'react';
import SelectComponent from '../../../../components/SelectComponent';

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
    case "prop":
      return (
        <div className="space-y-4">
          <label className={`text-xs ${themeStyles.subtle}`}>
            Outcome type
            <select
              value={draft.outcome_type}
              onChange={(e) => setDraft((prev) => ({ ...prev, outcome_type: e.target.value }))}
              className={`${inputClass} mt-2 w-full`}
            >
              <option value="over_under">Over / Under</option>
              <option value="yes_no">Yes / No</option>
            </select>
          </label>
          {draft.outcome_type === "over_under" && (
            <label className={`text-xs ${themeStyles.subtle}`}>
              Line
              <input
                type="number"
                value={draft.line || ""}
                step="0.1"
                onChange={(e) => setDraft((prev) => ({ ...prev, line: e.target.value }))}
                className={`${inputClass} mt-2 w-full`}
              />
            </label>
          )}
          <SelectComponent
            options={playerOptions}
            value={playerOptions.find((option) => option.value === draft.related_player) || null}
            onChange={(option) =>
              setDraft((prev) => ({ ...prev, related_player: option ? option.value : null }))
            }
            placeholder="Search related player"
            isClearable
            mode={themeStyles.mode}
          />
        </div>
      );
    case "head_to_head":
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
        </div>
      );
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
