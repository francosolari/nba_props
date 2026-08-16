import React, { useEffect, useMemo, useState } from 'react';
import { STEP_TITLES, buildDraft, validateDraft, mapDraftToPayload } from './questionBatchWizardUtils';
import {
  overlayClass,
  panelClass,
  subtleTextClass,
  buttonMutedClass,
  stepButtonInactive,
  stepButtonComplete,
  stepButtonActive,
} from './wizard/wizardStyles';
import DraftStep from './wizard/DraftStep';
import ConfigureStep from './wizard/ConfigureStep';
import ReviewStep from './wizard/ReviewStep';

const QuestionBatchWizard = ({
  isOpen,
  onClose,
  seasonSlug,
  defaultPointValue = 0.5,
  awards = [],
  teams = [],
  players = [],
  mutations = {},
  onCompleted,
}) => {
  const [step, setStep] = useState(0);
  const [drafts, setDrafts] = useState([]);
  const [submissionState, setSubmissionState] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const awardOptions = useMemo(
    () => awards.map((award) => ({ value: award.id, label: award.name })),
    [awards]
  );
  const teamOptions = useMemo(
    () => teams.map((team) => ({ value: team.id, label: team.name })),
    [teams]
  );
  const playerOptions = useMemo(
    () => players.map((player) => ({ value: player.id, label: player.name })),
    [players]
  );

  const lookupMaps = useMemo(() => ({
    awards: awards.reduce((acc, award) => ({ ...acc, [award.id]: award }), {}),
    teams: teams.reduce((acc, team) => ({ ...acc, [team.id]: team }), {}),
    players: players.reduce((acc, player) => ({ ...acc, [player.id]: player }), {}),
  }), [awards, teams, players]);

  useEffect(() => {
    if (isOpen) {
      setDrafts([buildDraft(defaultPointValue)]);
      setStep(0);
      setSubmissionState({});
    }
  }, [isOpen, defaultPointValue]);

  const handleAddDraft = (type = 'superlative') => {
    setDrafts((prev) => [...prev, buildDraft(defaultPointValue, type)]);
  };

  const handleDuplicateDraft = (draftId) => {
    setDrafts((prev) => {
      const draft = prev.find((item) => item.id === draftId);
      if (!draft) return prev;
      const clone = {
        ...draft,
        id: `draft-${Math.random().toString(36).slice(2, 11)}`,
        text: `${draft.text} (copy)`,
      };
      return [...prev, clone];
    });
  };

  const handleRemoveDraft = (draftId) => {
    setDrafts((prev) => prev.filter((draft) => draft.id !== draftId));
  };

  const handleUpdateDraft = (draftId, updates) => {
    setDrafts((prev) =>
      prev.map((draft) => (draft.id === draftId ? { ...draft, ...updates } : draft))
    );
  };

  const handleUpdateDraftData = (draftId, updates) => {
    setDrafts((prev) =>
      prev.map((draft) =>
        draft.id === draftId ? { ...draft, data: { ...draft.data, ...updates } } : draft
      )
    );
  };

  const allDraftsValidForStep1 = drafts.length > 0 && drafts.every((draft) => draft.text.trim());
  const allDraftsValidForStep2 = drafts.every((draft) => validateDraft(draft));
  const allSuccessful =
    drafts.length > 0 &&
    drafts.every((draft) => submissionState[draft.id]?.status === 'success');

  const goToStep = (target) => {
    if (target < 0 || target > 2) return;
    setStep(target);
  };

  const handleSubmitBatch = async () => {
    if (!seasonSlug) return;
    setIsSubmitting(true);
    setSubmissionState(
      drafts.reduce(
        (acc, draft) => ({ ...acc, [draft.id]: { status: 'pending', message: '' } }),
        {}
      )
    );
    let allSucceeded = true;

    for (const draft of drafts) {
      const mutation = mutations[draft.type];
      if (!mutation || typeof mutation.mutateAsync !== 'function') {
        setSubmissionState((prev) => ({
          ...prev,
          [draft.id]: { status: 'error', message: 'Unsupported question type' },
        }));
        allSucceeded = false;
        continue;
      }

      try {
        const payload = mapDraftToPayload(draft, seasonSlug);
        await mutation.mutateAsync(payload);
        setSubmissionState((prev) => ({
          ...prev,
          [draft.id]: { status: 'success', message: '' },
        }));
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          'Unable to create question';
        setSubmissionState((prev) => ({
          ...prev,
          [draft.id]: { status: 'error', message },
        }));
        allSucceeded = false;
      }
    }

    setIsSubmitting(false);
    if (allSucceeded) {
      onCompleted?.(drafts.length);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 ${overlayClass} backdrop-blur-xl`}
        aria-hidden="true"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
      />
      <div className={`absolute inset-y-0 right-0 flex w-full max-w-4xl flex-col ${panelClass}`}>
        <header className="border-b-2 border-[var(--court-rule)] px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={`text-xs uppercase tracking-[0.35em] ${subtleTextClass}`}>Batch creator</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--court-ink)]">Create multiple questions</h2>
              <p className={`mt-2 text-sm ${subtleTextClass}`}>
                Build a full slate in guided steps. Draft your prompts, configure details, then launch them together.
              </p>
            </div>
            <button
              type="button"
              onClick={() => !isSubmitting && onClose()}
              className={`rounded px-4 py-2 text-sm font-medium transition ${buttonMutedClass} disabled:cursor-not-allowed disabled:opacity-60`}
              disabled={isSubmitting}
            >
              Close
            </button>
          </div>
          <div className="mt-6 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.25em] text-[var(--court-steel)]">
            {STEP_TITLES.map((title, index) => {
              const stateClass =
                index === step
                  ? stepButtonActive
                  : index < step
                    ? stepButtonComplete
                    : stepButtonInactive;
              return (
                <React.Fragment key={title}>
                  <button
                    type="button"
                    onClick={() => {
                      if (index < step) goToStep(index);
                    }}
                    className={`rounded px-3 py-1 transition ${stateClass} disabled:cursor-not-allowed disabled:opacity-50`}
                    disabled={index > step}
                  >
                    {title}
                  </button>
                  {index < STEP_TITLES.length - 1 && <span className={subtleTextClass}>—</span>}
                </React.Fragment>
              );
            })}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-8 py-6">
          {step === 0 && (
            <DraftStep
              drafts={drafts}
              defaultPointValue={defaultPointValue}
              onAddDraft={handleAddDraft}
              onDuplicateDraft={handleDuplicateDraft}
              onRemoveDraft={handleRemoveDraft}
              onUpdateDraft={handleUpdateDraft}
              onNext={() => goToStep(1)}
              canAdvance={allDraftsValidForStep1}
            />
          )}
          {step === 1 && (
            <ConfigureStep
              drafts={drafts}
              awardOptions={awardOptions}
              playerOptions={playerOptions}
              teamOptions={teamOptions}
              onUpdateDraft={handleUpdateDraft}
              onUpdateDraftData={handleUpdateDraftData}
              onBack={() => goToStep(0)}
              onNext={() => goToStep(2)}
              canAdvance={allDraftsValidForStep2}
            />
          )}
          {step === 2 && (
            <ReviewStep
              drafts={drafts}
              lookupMaps={lookupMaps}
              submissionState={submissionState}
              isSubmitting={isSubmitting}
              allDraftsValidForStep2={allDraftsValidForStep2}
              allSuccessful={allSuccessful}
              onBack={() => goToStep(1)}
              onSubmitBatch={handleSubmitBatch}
              onClose={onClose}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default QuestionBatchWizard;
