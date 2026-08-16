import React from 'react';
import { TYPE_CONFIG } from '../questionBatchWizardUtils';
import { cardClass, labelTextClass, buttonMutedClass, primaryButtonClass } from './wizardStyles';
import ConfigureStepFields from './ConfigureStepFields';

const ConfigureStep = ({
  drafts,
  awardOptions,
  playerOptions,
  teamOptions,
  onUpdateDraft,
  onUpdateDraftData,
  onBack,
  onNext,
  canAdvance,
}) => (
  <section className="space-y-6">
    {drafts.map((draft, index) => (
      <div key={draft.id} className={`${cardClass} p-6`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--court-steel)]">
              Question {index + 1}
            </p>
            <p className="mt-2 text-sm text-[var(--court-ink)]">{draft.text}</p>
          </div>
          <span className="court-admin-badge court-admin-badge--neutral">
            {TYPE_CONFIG[draft.type]?.label}
          </span>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-[minmax(160px,200px),1fr]">
          <label className={`flex flex-col gap-2 text-sm ${labelTextClass}`}>
            Point value
            <input
              type="number"
              min="0"
              step="0.5"
              value={draft.pointValue}
              onChange={(event) => onUpdateDraft(draft.id, { pointValue: event.target.value })}
              className="court-admin-input w-full text-sm"
            />
          </label>
          <div className="space-y-4">
            <ConfigureStepFields
              draft={draft}
              awardOptions={awardOptions}
              playerOptions={playerOptions}
              teamOptions={teamOptions}
              onUpdateDraftData={onUpdateDraftData}
            />
          </div>
        </div>
      </div>
    ))}
    <div className="flex justify-between">
      <button
        type="button"
        onClick={onBack}
        className={`rounded px-4 py-2 text-sm transition ${buttonMutedClass}`}
      >
        Back
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!canAdvance}
        className={`rounded px-5 py-2 text-sm font-semibold transition ${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        Next: Review
      </button>
    </div>
  </section>
);

export default ConfigureStep;
