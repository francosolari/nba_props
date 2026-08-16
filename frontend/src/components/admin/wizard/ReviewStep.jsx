import React from 'react';
import { summarizeDraft, TYPE_CONFIG } from '../questionBatchWizardUtils';
import { bodyTextClass } from './wizardStyles';

const SubmissionStatus = ({ status, message }) => {
  if (!status) return null;
  // Fixed status colors (not theme-relative --court-ink) so a "success" or
  // "error" reading stays correct in both light and dark mode.
  const statusClasses = {
    pending: 'text-[var(--court-warning)]',
    success: 'text-[var(--court-success)]',
    error: 'text-[var(--court-danger)]',
  };
  const labels = {
    pending: 'Submitting…',
    success: 'Created',
    error: 'Failed',
  };
  return (
    <span className={`text-xs font-medium ${statusClasses[status] ?? 'text-[var(--court-muted)]'}`}>
      {labels[status] || status}
      {message ? ` — ${message}` : ''}
    </span>
  );
};

const ReviewStep = ({
  drafts,
  lookupMaps,
  submissionState,
  isSubmitting,
  allDraftsValidForStep2,
  allSuccessful,
  onBack,
  onSubmitBatch,
  onClose,
}) => (
  <section className="space-y-6">
    <div className="border-2 border-[var(--court-rule)] bg-[var(--court-paper)] p-6">
      <h3 className="text-sm uppercase tracking-[0.3em] text-[var(--court-steel)]">Summary</h3>
      <p className="mt-2 text-sm text-[var(--court-ink)]">
        {drafts.length} question{drafts.length === 1 ? '' : 's'} ready to launch.
      </p>
    </div>
    <div className="space-y-4">
      {drafts.map((draft, index) => (
        <div
          key={draft.id}
          className="flex flex-col gap-3 border-2 border-[var(--court-rule)] bg-[var(--court-paper)] p-6 md:flex-row md:items-center md:justify-between"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-[var(--court-steel)]">
              <span className="court-admin-badge court-admin-badge--neutral">
                {TYPE_CONFIG[draft.type]?.label}
              </span>
              <span>#{index + 1}</span>
            </div>
            <p className={`text-sm ${bodyTextClass}`}>{draft.text}</p>
            <p className="text-xs text-[var(--court-steel)]">{summarizeDraft(draft, lookupMaps)}</p>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <span className="text-sm font-medium text-[var(--court-ink)]">
              {Number(draft.pointValue)} pts
            </span>
            <SubmissionStatus
              status={submissionState[draft.id]?.status}
              message={submissionState[draft.id]?.message}
            />
          </div>
        </div>
      ))}
    </div>
    <div className="flex justify-between">
      <button
        type="button"
        onClick={onBack}
        className="rounded border-2 border-[var(--court-rule)] px-4 py-2 text-sm text-[var(--court-ink)] hover:bg-[var(--court-blue-soft)]"
        disabled={isSubmitting}
      >
        Back
      </button>
      <div className="flex items-center gap-3">
        {allSuccessful && (
          <button
            type="button"
            onClick={onClose}
            className="rounded border-2 border-[var(--court-success)] bg-[var(--court-success-soft)] px-4 py-2 text-sm font-semibold text-[var(--court-success)] hover:bg-[var(--court-success-soft)]"
          >
            Done
          </button>
        )}
        <button
          type="button"
          onClick={onSubmitBatch}
          disabled={isSubmitting || !allDraftsValidForStep2}
          className="rounded border-2 border-[var(--court-rule)] bg-[var(--court-blue)] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[var(--court-blue-dark)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Creating…' : 'Create questions'}
        </button>
      </div>
    </div>
  </section>
);

export default ReviewStep;
