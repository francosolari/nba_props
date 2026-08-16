import React from 'react';
import { TYPE_CONFIG, TYPE_OPTIONS } from '../questionBatchWizardUtils';
import { cardClass, subtleTextClass, labelTextClass, buttonMutedClass, primaryButtonClass } from './wizardStyles';

const DraftStep = ({
  drafts,
  defaultPointValue,
  onAddDraft,
  onDuplicateDraft,
  onRemoveDraft,
  onUpdateDraft,
  onNext,
  canAdvance,
}) => (
  <section className="space-y-6">
    {drafts.map((draft, index) => (
      <div key={draft.id} className={`${cardClass} p-6`}>
        <div className="flex items-center justify-between gap-4">
          <p className={`text-xs uppercase tracking-[0.3em] ${subtleTextClass}`}>
            Question {index + 1}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onDuplicateDraft(draft.id)}
              className={`rounded px-3 py-1 text-xs transition ${buttonMutedClass}`}
            >
              Duplicate
            </button>
            {drafts.length > 1 && (
              <button
                type="button"
                onClick={() => onRemoveDraft(draft.id)}
                className="rounded px-3 py-1 text-xs font-medium transition bg-[var(--court-red-soft)] text-[var(--court-danger)] hover:bg-[var(--court-red-soft)]"
              >
                Remove
              </button>
            )}
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-[1fr,minmax(160px,200px)]">
          <label className={`flex flex-col gap-2 text-sm ${labelTextClass}`}>
            Prompt
            <textarea
              value={draft.text}
              onChange={(event) => onUpdateDraft(draft.id, { text: event.target.value })}
              rows={3}
              placeholder="Who wins Sixth Man of the Year?"
              className="court-admin-input w-full text-sm h-auto py-3"
            />
          </label>
          <label className={`flex flex-col gap-2 text-sm ${labelTextClass}`}>
            Type
            <select
              value={draft.type}
              onChange={(event) => {
                const nextType = event.target.value;
                const nextDefaults = TYPE_CONFIG[nextType]?.defaults(defaultPointValue);
                onUpdateDraft(draft.id, {
                  type: nextType,
                  pointValue: nextDefaults?.pointValue ?? defaultPointValue,
                  data: nextDefaults?.data ?? {},
                });
              }}
              className="court-admin-input w-full text-sm h-auto py-3"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-4 text-xs text-[var(--court-steel)]">
          {TYPE_CONFIG[draft.type]?.description || ''}
        </p>
      </div>
    ))}
    <div className="flex justify-between">
      <button
        type="button"
        onClick={() => onAddDraft()}
        className={`rounded px-4 py-2 text-sm font-medium transition ${buttonMutedClass}`}
      >
        Add question
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!canAdvance}
        className={`rounded px-5 py-2 text-sm font-semibold transition ${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        Next: Configure
      </button>
    </div>
  </section>
);

export default DraftStep;
