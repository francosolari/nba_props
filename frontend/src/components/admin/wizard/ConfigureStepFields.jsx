import React from 'react';
import SelectComponent from '../../SelectComponent';
import { outcomeTypeOptions, istTypeOptions } from '../questionBatchWizardUtils';
import { labelTextClass } from './wizardStyles';

// Type-specific configuration fields for a single draft in the batch wizard's
// "Configure details" step. Split out of ConfigureStep to keep both files
// under the ~400-line ceiling.
const ConfigureStepFields = ({ draft, awardOptions, playerOptions, teamOptions, onUpdateDraftData }) => {
  switch (draft.type) {
    case 'superlative':
      return (
        <SelectComponent
          placeholder="Select award"
          options={awardOptions}
          value={draft.data.awardId}
          onChange={(option) => onUpdateDraftData(draft.id, { awardId: option ? option.value : '' })}
        />
      );
    case 'prop':
      return (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={`text-sm ${labelTextClass}`}>
              <span className="mb-2 block">Outcome type</span>
              <select
                value={draft.data.outcomeType}
                onChange={(event) =>
                  onUpdateDraftData(draft.id, {
                    outcomeType: event.target.value,
                    line: event.target.value === 'over_under' ? draft.data.line : '',
                  })
                }
                className="w-full court-admin-input w-full text-sm"
              >
                {outcomeTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {draft.data.outcomeType === 'over_under' && (
              <label className={`flex flex-col gap-2 text-sm ${labelTextClass}`}>
                Line
                <input
                  type="number"
                  step="0.1"
                  value={draft.data.line}
                  onChange={(event) => onUpdateDraftData(draft.id, { line: event.target.value })}
                  className="court-admin-input w-full text-sm"
                  placeholder="31.5"
                />
              </label>
            )}
          </div>
          <SelectComponent
            placeholder="Link to player (optional)"
            options={playerOptions}
            value={draft.data.relatedPlayerId}
            onChange={(option) => onUpdateDraftData(draft.id, { relatedPlayerId: option ? option.value : null })}
          />
        </>
      );
    case 'head_to_head':
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectComponent
            placeholder="Team 1"
            options={teamOptions}
            value={draft.data.team1Id}
            onChange={(option) => onUpdateDraftData(draft.id, { team1Id: option ? option.value : null })}
          />
          <SelectComponent
            placeholder="Team 2"
            options={teamOptions}
            value={draft.data.team2Id}
            onChange={(option) => onUpdateDraftData(draft.id, { team2Id: option ? option.value : null })}
          />
        </div>
      );
    case 'player_stat':
      return (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={`flex flex-col gap-2 text-sm ${labelTextClass}`}>
              Stat type
              <input
                value={draft.data.statType}
                onChange={(event) => onUpdateDraftData(draft.id, { statType: event.target.value })}
                placeholder="assists"
                className="court-admin-input w-full text-sm"
              />
            </label>
            <label className={`flex flex-col gap-2 text-sm ${labelTextClass}`}>
              Player stat ID
              <input
                type="number"
                value={draft.data.playerStatId}
                onChange={(event) => onUpdateDraftData(draft.id, { playerStatId: event.target.value })}
                placeholder="24589"
                className="court-admin-input w-full text-sm"
              />
            </label>
          </div>
          <label className={`flex flex-col gap-2 text-sm ${labelTextClass}`}>
            Fixed value (optional)
            <input
              type="number"
              step="0.1"
              value={draft.data.fixedValue}
              onChange={(event) => onUpdateDraftData(draft.id, { fixedValue: event.target.value })}
              placeholder="10"
              className="court-admin-input w-full text-sm"
            />
          </label>
        </>
      );
    case 'ist':
      return (
        <>
          <label className={`text-sm ${labelTextClass}`}>
            <span className="mb-2 block">Prediction type</span>
            <select
              value={draft.data.predictionType}
              onChange={(event) => {
                const nextType = event.target.value;
                onUpdateDraftData(draft.id, {
                  predictionType: nextType,
                  isTiebreaker: nextType === 'tiebreaker' ? true : draft.data.isTiebreaker,
                });
              }}
              className="w-full court-admin-input w-full text-sm"
            >
              {istTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className={`flex flex-col gap-2 text-sm ${labelTextClass}`}>
            IST group (optional)
            <input
              value={draft.data.istGroup}
              onChange={(event) => onUpdateDraftData(draft.id, { istGroup: event.target.value })}
              placeholder="East Group A"
              className="court-admin-input w-full text-sm"
            />
          </label>
          <label className="mt-1 flex items-center gap-3 text-sm text-[var(--court-ink)]">
            <input
              type="checkbox"
              checked={Boolean(draft.data.isTiebreaker)}
              onChange={(event) => onUpdateDraftData(draft.id, { isTiebreaker: event.target.checked })}
              className="h-4 w-4 rounded-[2px] border-2 border-[var(--court-rule)] bg-[var(--court-paper)] text-[var(--court-blue)] focus:ring-0"
            />
            Mark as tiebreaker
          </label>
        </>
      );
    case 'nba_finals':
      return (
        <label className={`flex flex-col gap-2 text-sm ${labelTextClass}`}>
          Grouping (optional)
          <input
            value={draft.data.groupName}
            onChange={(event) => onUpdateDraftData(draft.id, { groupName: event.target.value })}
            placeholder="Finals"
            className="court-admin-input w-full text-sm"
          />
        </label>
      );
    default:
      return null;
  }
};

export default ConfigureStepFields;
