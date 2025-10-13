import React, { useEffect, useMemo, useState } from 'react';
import SelectComponent from '../SelectComponent';

const STEP_TITLES = ['Draft questions', 'Configure details', 'Review & create'];

const TYPE_CONFIG = {
  superlative: {
    label: 'Superlative',
    description: 'Award-style predictions',
    defaults: (defaultPointValue) => ({
      pointValue: defaultPointValue,
      data: { awardId: '' },
    }),
    isValid: ({ data }) => Boolean(data.awardId),
  },
  prop: {
    label: 'Prop',
    description: 'Player props & outcomes',
    defaults: (defaultPointValue) => ({
      pointValue: defaultPointValue,
      data: { outcomeType: 'over_under', line: '', relatedPlayerId: null },
    }),
    isValid: ({ data }) =>
      Boolean(data.outcomeType) && (data.outcomeType !== 'over_under' || data.line !== ''),
  },
  head_to_head: {
    label: 'Head-to-Head',
    description: 'Team vs team matchups',
    defaults: (defaultPointValue) => ({
      pointValue: defaultPointValue,
      data: { team1Id: null, team2Id: null },
    }),
    isValid: ({ data }) => Boolean(data.team1Id && data.team2Id && data.team1Id !== data.team2Id),
  },
  player_stat: {
    label: 'Player Stat',
    description: 'Stat benchmarks & projections',
    defaults: (defaultPointValue) => ({
      pointValue: defaultPointValue,
      data: { playerStatId: '', statType: '', fixedValue: '' },
    }),
    isValid: ({ data }) => Boolean(data.playerStatId && data.statType.trim()),
  },
  ist: {
    label: 'In-Season Tournament',
    description: 'Group predictions & tiebreakers',
    defaults: (defaultPointValue) => ({
      pointValue: defaultPointValue,
      data: { predictionType: 'group_winner', istGroup: '', isTiebreaker: false },
    }),
    isValid: ({ data }) => Boolean(data.predictionType),
  },
  nba_finals: {
    label: 'NBA Finals',
    description: 'Championship predictions',
    defaults: (defaultPointValue) => ({
      pointValue: defaultPointValue,
      data: { groupName: '' },
    }),
    isValid: () => true,
  },
};

const TYPE_OPTIONS = Object.entries(TYPE_CONFIG).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

const outcomeTypeOptions = [
  { value: 'over_under', label: 'Over / Under' },
  { value: 'yes_no', label: 'Yes / No' },
];

const istTypeOptions = [
  { value: 'group_winner', label: 'Group winner' },
  { value: 'wildcard', label: 'Wildcard' },
  { value: 'conference_winner', label: 'Conference winner' },
  { value: 'tiebreaker', label: 'Tiebreaker' },
];

const buildDraft = (defaultPointValue, type = 'superlative') => {
  const base = TYPE_CONFIG[type]?.defaults(defaultPointValue) ?? TYPE_CONFIG.superlative.defaults(defaultPointValue);
  return {
    id: `draft-${Math.random().toString(36).slice(2, 11)}`,
    type,
    text: '',
    pointValue: base.pointValue,
    data: base.data,
  };
};

const summarizeDraft = (draft, lookup) => {
  const { type, data } = draft;
  switch (type) {
    case 'superlative': {
      const awardName = lookup.awards[data.awardId]?.name ?? '—';
      return `Award: ${awardName}`;
    }
    case 'prop': {
      const playerName = data.relatedPlayerId ? lookup.players[data.relatedPlayerId]?.name : '—';
      const lineText = data.outcomeType === 'over_under' ? ` • Line ${data.line || '?'}` : '';
      return `Outcome: ${data.outcomeType.replace('_', ' ')}${lineText}${playerName ? ` • Player ${playerName}` : ''}`;
    }
    case 'head_to_head': {
      const team1 = data.team1Id ? lookup.teams[data.team1Id]?.name : '—';
      const team2 = data.team2Id ? lookup.teams[data.team2Id]?.name : '—';
      return `${team1} vs ${team2}`;
    }
    case 'player_stat': {
      const stat = data.statType || 'stat';
      const fixed = data.fixedValue !== '' && data.fixedValue !== null ? ` • fixed ${data.fixedValue}` : '';
      return `Stat: ${stat}${fixed}`;
    }
    case 'ist': {
      const typeLabel = istTypeOptions.find((option) => option.value === data.predictionType)?.label ?? data.predictionType;
      const group = data.istGroup ? ` • ${data.istGroup}` : '';
      const tie = data.isTiebreaker ? ' • Tiebreaker' : '';
      return `${typeLabel}${group}${tie}`;
    }
    case 'nba_finals': {
      return data.groupName ? `Grouping: ${data.groupName}` : 'Finals prediction';
    }
    default:
      return '';
  }
};

const mapDraftToPayload = (draft, seasonSlug) => {
  const base = {
    season_slug: seasonSlug,
    text: draft.text.trim(),
    point_value: Number(draft.pointValue),
  };

  switch (draft.type) {
    case 'superlative':
      return { ...base, award_id: Number(draft.data.awardId) };
    case 'prop': {
      const payload = {
        ...base,
        outcome_type: draft.data.outcomeType,
      };
      if (draft.data.relatedPlayerId) {
        payload.related_player_id = Number(draft.data.relatedPlayerId);
      }
      if (draft.data.outcomeType === 'over_under' && draft.data.line !== '') {
        payload.line = Number(draft.data.line);
      }
      return payload;
    }
    case 'head_to_head':
      return {
        ...base,
        team1_id: Number(draft.data.team1Id),
        team2_id: Number(draft.data.team2Id),
      };
    case 'player_stat': {
      const payload = {
        ...base,
        player_stat_id: Number(draft.data.playerStatId),
        stat_type: draft.data.statType.trim(),
      };
      if (draft.data.fixedValue !== '' && draft.data.fixedValue !== null) {
        payload.fixed_value = Number(draft.data.fixedValue);
      }
      return payload;
    }
    case 'ist':
      return {
        ...base,
        prediction_type: draft.data.predictionType,
        ist_group: draft.data.istGroup || undefined,
        is_tiebreaker: Boolean(draft.data.predictionType === 'tiebreaker' || draft.data.isTiebreaker),
      };
    case 'nba_finals':
      return {
        ...base,
        group_name: draft.data.groupName || undefined,
      };
    default:
      return base;
  }
};

const validateDraft = (draft) => {
  const config = TYPE_CONFIG[draft.type];
  if (!config) return false;
  if (!draft.text.trim()) return false;
  if (draft.pointValue === '' || Number.isNaN(Number(draft.pointValue))) return false;
  return config.isValid(draft);
};

const SubmissionStatus = ({ status, message }) => {
  if (!status) return null;
  const statusClasses = {
    pending: 'text-amber-300',
    success: 'text-emerald-300',
    error: 'text-rose-300',
  };
  const labels = {
    pending: 'Submitting…',
    success: 'Created',
    error: 'Failed',
  };
  return (
    <span className={`text-xs font-medium ${statusClasses[status] ?? 'text-slate-400'}`}>
      {labels[status] || status}
      {message ? ` — ${message}` : ''}
    </span>
  );
};

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
  theme = 'dark',
}) => {
  const [step, setStep] = useState(0);
  const [drafts, setDrafts] = useState([]);
  const [submissionState, setSubmissionState] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLight = theme === 'light';
  const overlayClass = isLight ? 'bg-slate-900/20' : 'bg-slate-950/70';
  const panelClass = isLight
    ? 'bg-white text-slate-900 shadow-2xl shadow-blue-200/40'
    : 'bg-slate-950/95 text-slate-100 shadow-2xl shadow-blue-500/40';
  const cardClass = isLight
    ? 'border border-slate-200 bg-white/95 shadow-lg shadow-slate-300/30'
    : 'border border-slate-700/40 bg-slate-900/60 shadow-lg shadow-slate-950/40';
  const compactCardClass = isLight
    ? 'bg-white border border-slate-200 shadow shadow-slate-200/70'
    : 'bg-slate-900/50 border border-slate-700/40 shadow shadow-slate-950/50';
  const subtleTextClass = isLight ? 'text-slate-500' : 'text-slate-400';
  const labelTextClass = isLight ? 'text-slate-700' : 'text-slate-200';
  const bodyTextClass = isLight ? 'text-slate-700' : 'text-slate-200';
  const chipClass = isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800/70 text-slate-300';
  const stepButtonInactive = isLight ? 'bg-slate-200 text-slate-600' : 'bg-slate-900/60 text-slate-600';
  const stepButtonComplete = isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80';
  const stepButtonActive = isLight ? 'bg-blue-500/15 text-blue-600' : 'bg-blue-500/20 text-blue-200';
  const mutedCardClass = isLight ? 'bg-white border border-slate-200 shadow-md shadow-slate-200/60' : 'bg-slate-900/60 border border-slate-700/40 shadow-lg shadow-slate-950/40';
  const buttonMutedClass = isLight ? 'bg-slate-200 text-slate-700 hover:bg-slate-300/80' : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700/80';
  const primaryButtonClass = isLight
    ? 'bg-blue-500 text-white shadow-lg shadow-blue-300/40 hover:bg-blue-600'
    : 'bg-blue-500 text-white shadow-lg shadow-blue-500/40 hover:bg-blue-400';
  const removeButtonClass = isLight
    ? 'bg-rose-100 text-rose-600 hover:bg-rose-200'
    : 'bg-rose-500/20 text-rose-200 hover:bg-rose-500/30';

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
        <header className={`border-b ${isLight ? 'border-slate-200' : 'border-slate-700/40'} px-8 py-6`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={`text-xs uppercase tracking-[0.35em] ${subtleTextClass}`}>Batch creator</p>
              <h2 className={`mt-2 text-2xl font-semibold ${isLight ? 'text-slate-900' : 'text-slate-50'}`}>Create multiple questions</h2>
              <p className={`mt-2 text-sm ${subtleTextClass}`}>
                Build a full slate in guided steps. Draft your prompts, configure details, then launch them together.
              </p>
            </div>
            <button
              type="button"
              onClick={() => !isSubmitting && onClose()}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${buttonMutedClass} disabled:cursor-not-allowed disabled:opacity-60`}
              disabled={isSubmitting}
            >
              Close
            </button>
          </div>
          <div className="mt-6 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.25em] text-slate-500">
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
                    if (index < step) {
                      goToStep(index);
                    }
                  }}
                  className={`rounded-full px-3 py-1 transition ${stateClass} disabled:cursor-not-allowed disabled:opacity-50`}
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
            <section className="space-y-6">
              {drafts.map((draft, index) => (
                <div
                  key={draft.id}
                  className={`rounded-3xl ${cardClass} p-6`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className={`text-xs uppercase tracking-[0.3em] ${subtleTextClass}`}>
                      Question {index + 1}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDuplicateDraft(draft.id)}
                        className={`rounded-full px-3 py-1 text-xs transition ${buttonMutedClass}`}
                      >
                        Duplicate
                      </button>
                      {drafts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDraft(draft.id)}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                            isLight ? 'bg-rose-100 text-rose-600 hover:bg-rose-200' : 'bg-rose-500/20 text-rose-200 hover:bg-rose-500/30'
                          }`}
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
                        onChange={(event) => handleUpdateDraft(draft.id, { text: event.target.value })}
                        rows={3}
                        placeholder="Who wins Sixth Man of the Year?"
                        className={`rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${isLight ? 'bg-slate-100 text-slate-800' : 'bg-slate-950/60 text-slate-100'}`}
                      />
                    </label>
                    <label className={`flex flex-col gap-2 text-sm ${labelTextClass}`}>
                      Type
                      <select
                        value={draft.type}
                        onChange={(event) => {
                          const nextType = event.target.value;
                          const nextDefaults = TYPE_CONFIG[nextType]?.defaults(defaultPointValue);
                          handleUpdateDraft(draft.id, {
                            type: nextType,
                            pointValue: nextDefaults?.pointValue ?? defaultPointValue,
                            data: nextDefaults?.data ?? {},
                          });
                        }}
                        className={`rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${isLight ? 'bg-slate-100 text-slate-800' : 'bg-slate-950/60 text-slate-100'}`}
                      >
                        {TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p className="mt-4 text-xs text-slate-500">
                    {TYPE_CONFIG[draft.type]?.description || ''}
                  </p>
                </div>
              ))}
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => handleAddDraft()}
                  className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${buttonMutedClass}`}
                >
                  Add question
                </button>
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  disabled={!allDraftsValidForStep1}
                  className={`rounded-2xl px-5 py-2 text-sm font-semibold transition ${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  Next: Configure
                </button>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="space-y-6">
              {drafts.map((draft, index) => (
                <div
                  key={draft.id}
                  className={`rounded-3xl ${cardClass} p-6`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                        Question {index + 1}
                      </p>
                      <p className="mt-2 text-sm text-slate-300">{draft.text}</p>
                    </div>
                    <span className="rounded-full bg-slate-800/70 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-300">
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
                        onChange={(event) => handleUpdateDraft(draft.id, { pointValue: event.target.value })}
                        className="rounded-2xl bg-slate-950/60 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </label>
                    <div className="space-y-4">
                      {draft.type === 'superlative' && (
                        <SelectComponent
                          placeholder="Select award"
                          options={awardOptions}
                          value={draft.data.awardId}
                          onChange={(option) => handleUpdateDraftData(draft.id, { awardId: option ? option.value : '' })}
                        />
                      )}
                      {draft.type === 'prop' && (
                        <>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <label className={`text-sm ${labelTextClass}`}>
                              <span className="mb-2 block">Outcome type</span>
                              <select
                                value={draft.data.outcomeType}
                                onChange={(event) =>
                                  handleUpdateDraftData(draft.id, {
                                    outcomeType: event.target.value,
                                    line: event.target.value === 'over_under' ? draft.data.line : '',
                                  })
                                }
                                className="w-full rounded-2xl bg-slate-950/60 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                                  onChange={(event) =>
                                    handleUpdateDraftData(draft.id, { line: event.target.value })
                                  }
                                  className="rounded-2xl bg-slate-950/60 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                  placeholder="31.5"
                                />
                              </label>
                            )}
                          </div>
                          <SelectComponent
                            placeholder="Link to player (optional)"
                            options={playerOptions}
                            value={draft.data.relatedPlayerId}
                            onChange={(option) =>
                              handleUpdateDraftData(draft.id, { relatedPlayerId: option ? option.value : null })
                            }
                          />
                        </>
                      )}
                      {draft.type === 'head_to_head' && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <SelectComponent
                            placeholder="Team 1"
                            options={teamOptions}
                            value={draft.data.team1Id}
                            onChange={(option) =>
                              handleUpdateDraftData(draft.id, { team1Id: option ? option.value : null })
                            }
                          />
                          <SelectComponent
                            placeholder="Team 2"
                            options={teamOptions}
                            value={draft.data.team2Id}
                            onChange={(option) =>
                              handleUpdateDraftData(draft.id, { team2Id: option ? option.value : null })
                            }
                          />
                        </div>
                      )}
                      {draft.type === 'player_stat' && (
                        <>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <label className={`flex flex-col gap-2 text-sm ${labelTextClass}`}>
                              Stat type
                              <input
                                value={draft.data.statType}
                                onChange={(event) =>
                                  handleUpdateDraftData(draft.id, { statType: event.target.value })
                                }
                                placeholder="assists"
                                className="rounded-2xl bg-slate-950/60 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                              />
                            </label>
                            <label className={`flex flex-col gap-2 text-sm ${labelTextClass}`}>
                              Player stat ID
                              <input
                                type="number"
                                value={draft.data.playerStatId}
                                onChange={(event) =>
                                  handleUpdateDraftData(draft.id, { playerStatId: event.target.value })
                                }
                                placeholder="24589"
                                className="rounded-2xl bg-slate-950/60 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                              />
                            </label>
                          </div>
                          <label className={`flex flex-col gap-2 text-sm ${labelTextClass}`}>
                            Fixed value (optional)
                            <input
                              type="number"
                              step="0.1"
                              value={draft.data.fixedValue}
                              onChange={(event) =>
                                handleUpdateDraftData(draft.id, { fixedValue: event.target.value })
                              }
                              placeholder="10"
                              className="rounded-2xl bg-slate-950/60 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                          </label>
                        </>
                      )}
                      {draft.type === 'ist' && (
                        <>
                          <label className={`text-sm ${labelTextClass}`}>
                            <span className="mb-2 block">Prediction type</span>
                            <select
                              value={draft.data.predictionType}
                              onChange={(event) => {
                                const nextType = event.target.value;
                                handleUpdateDraftData(draft.id, {
                                  predictionType: nextType,
                                  isTiebreaker: nextType === 'tiebreaker' ? true : draft.data.isTiebreaker,
                                });
                              }}
                              className="w-full rounded-2xl bg-slate-950/60 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                              onChange={(event) =>
                                handleUpdateDraftData(draft.id, { istGroup: event.target.value })
                              }
                              placeholder="East Group A"
                              className="rounded-2xl bg-slate-950/60 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                          </label>
                          <label className="mt-1 flex items-center gap-3 text-sm text-slate-300">
                            <input
                              type="checkbox"
                              checked={Boolean(draft.data.isTiebreaker)}
                              onChange={(event) =>
                                handleUpdateDraftData(draft.id, { isTiebreaker: event.target.checked })
                              }
                              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500/60"
                            />
                            Mark as tiebreaker
                          </label>
                        </>
                      )}
                      {draft.type === 'nba_finals' && (
                        <label className={`flex flex-col gap-2 text-sm ${labelTextClass}`}>
                          Grouping (optional)
                          <input
                            value={draft.data.groupName}
                            onChange={(event) =>
                              handleUpdateDraftData(draft.id, { groupName: event.target.value })
                            }
                            placeholder="Finals"
                            className="rounded-2xl bg-slate-950/60 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => goToStep(0)}
                  className={`rounded-2xl px-4 py-2 text-sm transition ${buttonMutedClass}`}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  disabled={!allDraftsValidForStep2}
                  className={`rounded-2xl px-5 py-2 text-sm font-semibold transition ${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  Next: Review
                </button>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-6">
              <div className="rounded-3xl border border-slate-700/40 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/40">
                <h3 className="text-sm uppercase tracking-[0.3em] text-slate-500">Summary</h3>
                <p className="mt-2 text-sm text-slate-300">
                  {drafts.length} question{drafts.length === 1 ? '' : 's'} ready to launch.
                </p>
              </div>
              <div className="space-y-4">
                {drafts.map((draft, index) => (
                  <div
                    key={draft.id}
                    className="flex flex-col gap-3 rounded-3xl border border-slate-700/40 bg-slate-900/50 p-6 shadow-lg shadow-slate-950/30 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-500">
                        <span className="rounded-full bg-slate-800/80 px-3 py-1 text-slate-200">
                          {TYPE_CONFIG[draft.type]?.label}
                        </span>
                        <span>#{index + 1}</span>
                      </div>
                      <p className={`text-sm ${bodyTextClass}`}>{draft.text}</p>
                      <p className="text-xs text-slate-500">{summarizeDraft(draft, lookupMaps)}</p>
                    </div>
                    <div className="flex flex-col items-start gap-2 md:items-end">
                      <span className="text-sm font-medium text-slate-200">
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
                  onClick={() => goToStep(1)}
                  className="rounded-2xl border border-slate-700/40 px-4 py-2 text-sm text-slate-300 hover:border-slate-500/40 hover:text-slate-100"
                  disabled={isSubmitting}
                >
                  Back
                </button>
                <div className="flex items-center gap-3">
                  {allSuccessful && (
                    <button
                      type="button"
                      onClick={() => onClose()}
                      className="rounded-2xl bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/30"
                    >
                      Done
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSubmitBatch}
                    disabled={isSubmitting || !allDraftsValidForStep2}
                    className="rounded-2xl bg-blue-500 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/40 transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-blue-500/40"
                  >
                    {isSubmitting ? 'Creating…' : 'Create questions'}
                  </button>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default QuestionBatchWizard;
