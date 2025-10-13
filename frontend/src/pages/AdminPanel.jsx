// File: frontend/src/pages/AdminPanel.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useAdminQuestions,
  useAwards,
  useTeams,
  usePlayers,
  useCreateSuperlativeQuestion,
  useCreatePropQuestion,
  useCreateHeadToHeadQuestion,
  useCreatePlayerStatQuestion,
  useCreateISTQuestion,
  useCreateNBAFinalsQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  useReorderQuestions,
  useCreateSeason,
} from '../hooks/useAdminQuestions';
import { useSeasons, useUserContext } from '../hooks/useSubmissions';
import SelectComponent from '../components/SelectComponent';

const GLASS_CARD = 'backdrop-blur-2xl bg-slate-900/60 border border-slate-700/40 shadow-xl shadow-slate-950/30 rounded-3xl';
const defaultPointValue = 0.5;

const defaultSeasonForm = {
  year: '',
  start_date: '',
  end_date: '',
  submission_start_date: '',
  submission_end_date: '',
};

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' });
  } catch (error) {
    console.warn('Failed to format date', error);
    return value;
  }
};

const formatDateTime = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch (error) {
    console.warn('Failed to format datetime', error);
    return value;
  }
};

const AdminPanel = ({ seasonSlug }) => {
  const { data: userContext, isLoading: userLoading } = useUserContext();
  const { data: seasons = [], isLoading: seasonsLoading } = useSeasons();

  const [activeSeason, setActiveSeason] = useState(seasonSlug || '');
  const [feedback, setFeedback] = useState(null);
  const [showSeasonForm, setShowSeasonForm] = useState(false);
  const [seasonForm, setSeasonForm] = useState(defaultSeasonForm);

  useEffect(() => {
    if (!activeSeason && seasons.length) {
      setActiveSeason(seasonSlug || seasons[0]?.slug || '');
    }
  }, [activeSeason, seasons, seasonSlug]);

  const { data: questions = [], isLoading: questionsLoading, refetch } = useAdminQuestions(activeSeason);
  const { data: awards = [] } = useAwards();
  const { data: teams = [] } = useTeams();
  const { data: players = [] } = usePlayers();

  const createSuperlative = useCreateSuperlativeQuestion();
  const createProp = useCreatePropQuestion();
  const createHeadToHead = useCreateHeadToHeadQuestion();
  const createPlayerStat = useCreatePlayerStatQuestion();
  const createIST = useCreateISTQuestion();
  const createNBAFinals = useCreateNBAFinalsQuestion();
  const updateQuestion = useUpdateQuestion();
  const deleteQuestion = useDeleteQuestion();
  const reorderQuestions = useReorderQuestions();
  const createSeason = useCreateSeason();

  const [superForm, setSuperForm] = useState({ text: '', awardId: '', pointValue: defaultPointValue });
  const [propForm, setPropForm] = useState({ text: '', pointValue: defaultPointValue, outcomeType: 'over_under', line: '', relatedPlayerId: null });
  const [playerStatForm, setPlayerStatForm] = useState({ text: '', pointValue: defaultPointValue, playerStatId: '', statType: '', fixedValue: '' });
  const [headToHeadForm, setHeadToHeadForm] = useState({ text: '', pointValue: defaultPointValue, team1Id: null, team2Id: null });
  const [istForm, setIstForm] = useState({ text: '', pointValue: defaultPointValue, predictionType: 'group_winner', istGroup: '', isTiebreaker: false });
  const [nbaFinalsForm, setNbaFinalsForm] = useState({ text: '', pointValue: defaultPointValue, groupName: '' });

  const awardOptions = useMemo(() => awards.map((award) => ({ value: award.id, label: award.name })), [awards]);
  const teamOptions = useMemo(
    () => teams.map((team) => ({ value: team.id, label: `${team.name}${team.conference ? ` • ${team.conference}` : ''}` })),
    [teams]
  );
  const playerOptions = useMemo(() => players.map((player) => ({ value: player.id, label: player.name })), [players]);
  const seasonOptions = useMemo(() => seasons.map((s) => ({ value: s.slug, label: s.year })), [seasons]);
  const seasonMeta = useMemo(() => seasons.find((s) => s.slug === activeSeason), [seasons, activeSeason]);

  const setSuccess = useCallback((message) => setFeedback({ type: 'success', message, id: Date.now() }), []);
  const setError = useCallback((message) => setFeedback({ type: 'error', message, id: Date.now() }), []);

  const ensureSeasonSelected = useCallback(() => {
    if (!activeSeason) {
      setError('Select or create a season to continue.');
      return false;
    }
    return true;
  }, [activeSeason, setError]);

  const handleMutation = useCallback(
    async (mutation, payload, successMessage) => {
      if (!ensureSeasonSelected()) return;
      try {
        await mutation.mutateAsync(payload);
        setSuccess(successMessage);
        await refetch();
      } catch (error) {
        const message = error?.response?.data?.message || error?.message || 'Request failed';
        setError(message);
      }
    },
    [ensureSeasonSelected, refetch, setError, setSuccess]
  );

  const handleSeasonField = (field, value) => {
    setSeasonForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSeasonCreate = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        year: seasonForm.year.trim(),
        start_date: seasonForm.start_date,
        end_date: seasonForm.end_date,
        submission_start_date: seasonForm.submission_start_date
          ? new Date(seasonForm.submission_start_date).toISOString()
          : null,
        submission_end_date: seasonForm.submission_end_date
          ? new Date(seasonForm.submission_end_date).toISOString()
          : null,
      };
      const response = await createSeason.mutateAsync(payload);
      setSuccess('Season created successfully.');
      setSeasonForm(defaultSeasonForm);
      setShowSeasonForm(false);
      setActiveSeason(response.slug);
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Unable to create season';
      setError(message);
    }
  };

  const handleReorder = () => {
    if (!ensureSeasonSelected()) return;
    reorderQuestions.mutate({ seasonSlug: activeSeason, questionIds: questions.map((q) => q.id) });
    setSuccess('Reorder request submitted.');
  };

  if (userLoading || seasonsLoading) {
    return (
      <ScreenMessage title="Loading admin tools" message="Fetching configuration..." />
    );
  }

  if (!userContext?.is_admin) {
    return (
      <ScreenMessage title="Access restricted" message="You do not have permission to view the admin panel." variant="error" />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-100">
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-16">
        <header className="mb-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.45em] text-slate-400">Control Center</p>
              <h1 className="mt-3 text-4xl font-bold text-slate-50 md:text-5xl">Predictions Admin Panel</h1>
              <p className="mt-4 max-w-2xl text-slate-400">
                Craft, organise, and launch the season&apos;s prediction slate with a glassmorphism powered interface built for dark mode.
              </p>
            </div>
            <div className={`${GLASS_CARD} w-full max-w-xs p-5`}>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Current season</p>
              <div className="mt-3">
                <SelectComponent
                  options={seasonOptions}
                  value={seasonOptions.find((option) => option.value === activeSeason) || null}
                  onChange={(option) => setActiveSeason(option ? option.value : '')}
                  placeholder="Select season"
                />
              </div>
              {seasonMeta && (
                <div className="mt-4 space-y-1 text-sm text-slate-300">
                  <p>{seasonMeta.year}</p>
                  <p className="text-slate-500">{formatDate(seasonMeta.start_date)} → {formatDate(seasonMeta.end_date)}</p>
                  <p className="text-slate-500">Submissions {formatDateTime(seasonMeta.submission_start_date)} → {formatDateTime(seasonMeta.submission_end_date)}</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowSeasonForm((open) => !open)}
                className="mt-6 w-full rounded-xl bg-slate-100/10 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-100/20"
              >
                {showSeasonForm ? 'Close season creator' : 'Create new season'}
              </button>
            </div>
          </div>
        </header>

        {feedback && (
          <div
            className={`mb-10 rounded-2xl border px-6 py-4 text-sm backdrop-blur-xl transition ${
              feedback.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
            }`}
          >
            {feedback.message}
          </div>
        )}

        {showSeasonForm && (
          <section className={`${GLASS_CARD} mb-12 p-8`}>
            <h2 className="text-lg font-semibold text-slate-100 tracking-wide">Create a new season</h2>
            <p className="mt-1 text-sm text-slate-400">Define the dates and submission window. The slug is generated automatically.</p>
            <form onSubmit={handleSeasonCreate} className="mt-6 grid gap-6 lg:grid-cols-2">
              <TextInput
                label="Display year"
                value={seasonForm.year}
                onChange={(e) => handleSeasonField('year', e.target.value)}
                placeholder="2024-25"
                required
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <DateInput label="Season starts" value={seasonForm.start_date} onChange={(e) => handleSeasonField('start_date', e.target.value)} required />
                <DateInput label="Season ends" value={seasonForm.end_date} onChange={(e) => handleSeasonField('end_date', e.target.value)} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <DateInput
                  label="Submissions open"
                  value={seasonForm.submission_start_date}
                  onChange={(e) => handleSeasonField('submission_start_date', e.target.value)}
                  required
                  type="datetime-local"
                  step="60"
                />
                <DateInput
                  label="Submissions close"
                  value={seasonForm.submission_end_date}
                  onChange={(e) => handleSeasonField('submission_end_date', e.target.value)}
                  required
                  type="datetime-local"
                  step="60"
                />
              </div>
              <div className="flex items-center justify-end gap-3 lg:col-span-2">
                <button
                  type="button"
                  onClick={() => {
                    setSeasonForm(defaultSeasonForm);
                    setShowSeasonForm(false);
                  }}
                  className="rounded-xl border border-slate-600/60 px-4 py-2 text-sm text-slate-300 hover:border-slate-400/60 hover:text-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSeason.isPending}
                  className="rounded-xl bg-blue-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/40 transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-blue-500/50"
                >
                  {createSeason.isPending ? 'Creating…' : 'Save season'}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="grid gap-8 lg:grid-cols-2">
          <GlassFormCard
            title="Superlative"
            subtitle="Award-style predictions"
            isSubmitting={createSuperlative.isPending}
            onSubmit={(event) => {
              event.preventDefault();
              if (!ensureSeasonSelected()) return;
              if (!superForm.awardId) {
                setError('Select an award before creating this question.');
                return;
              }
              handleMutation(createSuperlative, {
                season_slug: activeSeason,
                text: superForm.text.trim(),
                point_value: Number(superForm.pointValue || defaultPointValue),
                award_id: Number(superForm.awardId),
              }, 'Superlative question created.');
              setSuperForm({ text: '', awardId: '', pointValue: defaultPointValue });
            }}
          >
            <Textarea label="Question" value={superForm.text} onChange={(value) => setSuperForm((prev) => ({ ...prev, text: value }))} placeholder="Who wins Sixth Man of the Year?" required />
            <NumberInput label="Point value" value={superForm.pointValue} onChange={(value) => setSuperForm((prev) => ({ ...prev, pointValue: value }))} step="0.5" min="0" />
            <SelectComponent
              options={awardOptions}
              value={awardOptions.find((option) => option.value === superForm.awardId) || null}
              onChange={(option) => setSuperForm((prev) => ({ ...prev, awardId: option ? option.value : '' }))}
              placeholder="Select award"
              isClearable
            />
          </GlassFormCard>

          <GlassFormCard
            title="Prop"
            subtitle="Binary & over/under"
            isSubmitting={createProp.isPending}
            onSubmit={(event) => {
              event.preventDefault();
              if (!ensureSeasonSelected()) return;
              handleMutation(createProp, {
                season_slug: activeSeason,
                text: propForm.text.trim(),
                point_value: Number(propForm.pointValue || defaultPointValue),
                outcome_type: propForm.outcomeType,
                related_player_id: propForm.relatedPlayerId ? Number(propForm.relatedPlayerId) : undefined,
                line: propForm.outcomeType === 'over_under' && propForm.line !== '' ? Number(propForm.line) : undefined,
              }, 'Prop question created.');
              setPropForm({ text: '', pointValue: defaultPointValue, outcomeType: 'over_under', line: '', relatedPlayerId: null });
            }}
          >
            <Textarea label="Question" value={propForm.text} onChange={(value) => setPropForm((prev) => ({ ...prev, text: value }))} placeholder="Does Luka average 32.5 PPG?" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberInput label="Point value" value={propForm.pointValue} onChange={(value) => setPropForm((prev) => ({ ...prev, pointValue: value }))} step="0.5" min="0" />
              <label className="text-sm text-slate-200">
                <span className="mb-2 block">Outcome type</span>
                <select
                  value={propForm.outcomeType}
                  onChange={(e) => setPropForm((prev) => ({ ...prev, outcomeType: e.target.value }))}
                  className="w-full rounded-2xl bg-slate-900/70 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                >
                  <option value="over_under">Over / Under</option>
                  <option value="yes_no">Yes / No</option>
                </select>
              </label>
            </div>
            {propForm.outcomeType === 'over_under' && (
              <NumberInput label="Line" value={propForm.line} onChange={(value) => setPropForm((prev) => ({ ...prev, line: value }))} step="0.1" required />
            )}
            <SelectComponent
              options={playerOptions}
              value={playerOptions.find((option) => option.value === propForm.relatedPlayerId) || null}
              onChange={(option) => setPropForm((prev) => ({ ...prev, relatedPlayerId: option ? option.value : null }))}
              placeholder="Search related player"
              isClearable
            />
          </GlassFormCard>

          <GlassFormCard
            title="Player Stat"
            subtitle="Projection vs. stat benchmark"
            isSubmitting={createPlayerStat.isPending}
            onSubmit={(event) => {
              event.preventDefault();
              if (!ensureSeasonSelected()) return;
              if (!playerStatForm.playerStatId) {
                setError('Provide the player stat ID for this question.');
                return;
              }
              handleMutation(createPlayerStat, {
                season_slug: activeSeason,
                text: playerStatForm.text.trim(),
                point_value: Number(playerStatForm.pointValue || defaultPointValue),
                player_stat_id: Number(playerStatForm.playerStatId),
                stat_type: playerStatForm.statType.trim(),
                fixed_value: playerStatForm.fixedValue !== '' ? Number(playerStatForm.fixedValue) : undefined,
              }, 'Player stat question created.');
              setPlayerStatForm({ text: '', pointValue: defaultPointValue, playerStatId: '', statType: '', fixedValue: '' });
            }}
          >
            <Textarea label="Question" value={playerStatForm.text} onChange={(value) => setPlayerStatForm((prev) => ({ ...prev, text: value }))} placeholder="Who leads the league in assists?" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberInput label="Point value" value={playerStatForm.pointValue} onChange={(value) => setPlayerStatForm((prev) => ({ ...prev, pointValue: value }))} step="0.5" min="0" />
              <TextInput label="Stat type" value={playerStatForm.statType} onChange={(value) => setPlayerStatForm((prev) => ({ ...prev, statType: value }))} placeholder="assists" required />
            </div>
            <NumberInput label="Player stat ID" value={playerStatForm.playerStatId} onChange={(value) => setPlayerStatForm((prev) => ({ ...prev, playerStatId: value }))} required />
            <NumberInput label="Fixed value (optional)" value={playerStatForm.fixedValue} onChange={(value) => setPlayerStatForm((prev) => ({ ...prev, fixedValue: value }))} step="0.1" />
          </GlassFormCard>

          <GlassFormCard
            title="Head-to-Head"
            subtitle="Pick between two teams"
            isSubmitting={createHeadToHead.isPending}
            onSubmit={(event) => {
              event.preventDefault();
              if (!ensureSeasonSelected()) return;
              if (!headToHeadForm.team1Id || !headToHeadForm.team2Id || headToHeadForm.team1Id === headToHeadForm.team2Id) {
                setError('Select two different teams for the matchup.');
                return;
              }
              handleMutation(createHeadToHead, {
                season_slug: activeSeason,
                text: headToHeadForm.text.trim(),
                point_value: Number(headToHeadForm.pointValue || defaultPointValue),
                team1_id: Number(headToHeadForm.team1Id),
                team2_id: Number(headToHeadForm.team2Id),
              }, 'Head-to-head question created.');
              setHeadToHeadForm({ text: '', pointValue: defaultPointValue, team1Id: null, team2Id: null });
            }}
          >
            <Textarea label="Question" value={headToHeadForm.text} onChange={(value) => setHeadToHeadForm((prev) => ({ ...prev, text: value }))} placeholder="Who wins opening night?" required />
            <NumberInput label="Point value" value={headToHeadForm.pointValue} onChange={(value) => setHeadToHeadForm((prev) => ({ ...prev, pointValue: value }))} step="0.5" min="0" />
            <SelectComponent
              options={teamOptions}
              value={teamOptions.find((option) => option.value === headToHeadForm.team1Id) || null}
              onChange={(option) => setHeadToHeadForm((prev) => ({ ...prev, team1Id: option ? option.value : null }))}
              placeholder="Select team"
              isClearable
            />
            <SelectComponent
              options={teamOptions}
              value={teamOptions.find((option) => option.value === headToHeadForm.team2Id) || null}
              onChange={(option) => setHeadToHeadForm((prev) => ({ ...prev, team2Id: option ? option.value : null }))}
              placeholder="Select opponent"
              isClearable
            />
          </GlassFormCard>

          <GlassFormCard
            title="In-Season Tournament"
            subtitle="Group predictions & tiebreakers"
            isSubmitting={createIST.isPending}
            onSubmit={(event) => {
              event.preventDefault();
              if (!ensureSeasonSelected()) return;
              handleMutation(createIST, {
                season_slug: activeSeason,
                text: istForm.text.trim(),
                point_value: Number(istForm.pointValue || defaultPointValue),
                prediction_type: istForm.predictionType,
                ist_group: istForm.istGroup || undefined,
                is_tiebreaker: Boolean(istForm.predictionType === 'tiebreaker' || istForm.isTiebreaker),
              }, 'IST question created.');
              setIstForm({ text: '', pointValue: defaultPointValue, predictionType: 'group_winner', istGroup: '', isTiebreaker: false });
            }}
          >
            <Textarea label="Question" value={istForm.text} onChange={(value) => setIstForm((prev) => ({ ...prev, text: value }))} placeholder="Who wins East Group A?" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberInput label="Point value" value={istForm.pointValue} onChange={(value) => setIstForm((prev) => ({ ...prev, pointValue: value }))} step="0.5" min="0" />
              <label className="text-sm text-slate-200">
                <span className="mb-2 block">Prediction type</span>
                <select
                  value={istForm.predictionType}
                  onChange={(e) => setIstForm((prev) => ({ ...prev, predictionType: e.target.value, isTiebreaker: e.target.value === 'tiebreaker' }))}
                  className="w-full rounded-2xl bg-slate-900/70 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                >
                  <option value="group_winner">Group Winner</option>
                  <option value="wildcard">Wildcard</option>
                  <option value="conference_winner">Conference Winner</option>
                  <option value="tiebreaker">Tiebreaker</option>
                </select>
              </label>
            </div>
            <TextInput label="IST group (optional)" value={istForm.istGroup} onChange={(value) => setIstForm((prev) => ({ ...prev, istGroup: value }))} placeholder="East Group A" />
            <label className="mt-2 flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={Boolean(istForm.isTiebreaker)}
                onChange={(e) => setIstForm((prev) => ({ ...prev, isTiebreaker: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500/60"
              />
              Tiebreaker question
            </label>
          </GlassFormCard>

          <GlassFormCard
            title="NBA Finals"
            subtitle="Championship predictions"
            isSubmitting={createNBAFinals.isPending}
            onSubmit={(event) => {
              event.preventDefault();
              if (!ensureSeasonSelected()) return;
              handleMutation(createNBAFinals, {
                season_slug: activeSeason,
                text: nbaFinalsForm.text.trim(),
                point_value: Number(nbaFinalsForm.pointValue || defaultPointValue),
                group_name: nbaFinalsForm.groupName || undefined,
              }, 'NBA Finals question created.');
              setNbaFinalsForm({ text: '', pointValue: defaultPointValue, groupName: '' });
            }}
          >
            <Textarea label="Question" value={nbaFinalsForm.text} onChange={(value) => setNbaFinalsForm((prev) => ({ ...prev, text: value }))} placeholder="Who wins the NBA Finals?" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberInput label="Point value" value={nbaFinalsForm.pointValue} onChange={(value) => setNbaFinalsForm((prev) => ({ ...prev, pointValue: value }))} step="0.5" min="0" />
              <TextInput label="Grouping (optional)" value={nbaFinalsForm.groupName} onChange={(value) => setNbaFinalsForm((prev) => ({ ...prev, groupName: value }))} placeholder="Finals" />
            </div>
          </GlassFormCard>
        </section>

        <section className={`${GLASS_CARD} mt-12 overflow-hidden`}>
          <div className="flex flex-col gap-4 border-b border-slate-600/40 px-8 py-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100 tracking-wide">Existing questions</h2>
              <p className="text-sm text-slate-400">Review, edit, or prune questions for this season.</p>
            </div>
            <button
              type="button"
              onClick={handleReorder}
              className="rounded-xl bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/20"
            >
              Sync order
            </button>
          </div>
          {questionsLoading ? (
            <div className="px-8 py-12 text-center text-slate-400">Loading questions…</div>
          ) : questions.length === 0 ? (
            <div className="px-8 py-12 text-center text-slate-500">No questions added yet for this season.</div>
          ) : (
            <div className="divide-y divide-slate-700/40">
              {questions.map((question) => (
                <QuestionRow
                  key={question.id}
                  question={question}
                  onUpdate={async (updates) => {
                    await handleMutation(updateQuestion, {
                      questionId: question.id,
                      updates,
                      seasonSlug: activeSeason,
                    }, 'Question updated.');
                  }}
                  onDelete={async () => {
                    if (!ensureSeasonSelected()) return;
                    const confirmed = window.confirm('Delete this question?');
                    if (!confirmed) return;
                    await handleMutation(deleteQuestion, {
                      questionId: question.id,
                      seasonSlug: activeSeason,
                    }, 'Question deleted.');
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const ScreenMessage = ({ title, message, variant = 'default' }) => (
  <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
    <div className={`${GLASS_CARD} mx-6 max-w-md p-10 text-center`}>
      <h1 className="text-2xl font-semibold text-slate-50">{title}</h1>
      <p className="mt-4 text-slate-400">{message}</p>
      {variant === 'error' && <div className="mt-6 text-sm text-rose-300">Contact an administrator to request access.</div>}
    </div>
  </div>
);

const GlassFormCard = ({ title, subtitle, children, isSubmitting, onSubmit }) => (
  <form
    onSubmit={onSubmit}
    className={`${GLASS_CARD} p-8`}
    style={{ boxShadow: '0 30px 120px -60px rgba(99, 102, 241, 0.35)' }}
  >
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-slate-100 tracking-wide">{title}</h3>
      <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
    </div>
    <div className="space-y-5">{children}</div>
    <div className="mt-8 flex justify-end">
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-blue-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/40 transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-blue-500/50"
      >
        {isSubmitting ? 'Saving…' : 'Create question'}
      </button>
    </div>
  </form>
);

const TextInput = ({ label, value, onChange, placeholder, required }) => (
  <label className="flex flex-col gap-2 text-sm text-slate-200">
    {label}
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className="rounded-2xl bg-slate-900/70 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
    />
  </label>
);

const NumberInput = ({ label, value, onChange, step = '1', min, required }) => (
  <label className="flex flex-col gap-2 text-sm text-slate-200">
    {label}
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      step={step}
      min={min}
      required={required}
      className="rounded-2xl bg-slate-900/70 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
    />
  </label>
);

const DateInput = ({ label, value, onChange, required, type = 'date', step }) => (
  <label className="flex flex-col gap-2 text-sm text-slate-200">
    {label}
    <input
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      step={step}
      className="rounded-2xl bg-slate-900/70 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
    />
  </label>
);

const Textarea = ({ label, value, onChange, placeholder, required }) => (
  <label className="flex flex-col gap-2 text-sm text-slate-200">
    {label}
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      required={required}
      className="rounded-2xl bg-slate-900/70 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
    />
  </label>
);

const QuestionRow = ({ question, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({ text: question.text, point_value: question.point_value });
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    setBusy(true);
    await onUpdate({ text: draft.text, point_value: Number(draft.point_value) });
    setBusy(false);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col gap-4 px-8 py-6 md:flex-row md:items-start md:justify-between">
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-500">
          <span className="rounded-full bg-slate-200/10 px-3 py-1 font-semibold text-slate-200">{question.question_type}</span>
          <span className="text-slate-600">ID #{question.id}</span>
        </div>
        {isEditing ? (
          <textarea
            value={draft.text}
            onChange={(e) => setDraft((prev) => ({ ...prev, text: e.target.value }))}
            className="w-full rounded-2xl bg-slate-900/70 px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            rows={3}
          />
        ) : (
          <p className="text-sm leading-relaxed text-slate-300">{question.text}</p>
        )}
        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          <span>Points: {question.point_value}</span>
          <span>Updated: {new Date(question.last_updated).toLocaleString()}</span>
        </div>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        {isEditing && (
          <label className="text-xs text-slate-400">
            Point value
            <input
              type="number"
              value={draft.point_value}
              min="0"
              step="0.5"
              onChange={(e) => setDraft((prev) => ({ ...prev, point_value: e.target.value }))}
              className="mt-2 w-full rounded-2xl bg-slate-900/70 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            />
          </label>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
            disabled={busy}
            className="flex-1 rounded-xl bg-emerald-500/20 px-3 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-500/30 disabled:bg-emerald-500/20"
          >
            {isEditing ? (busy ? 'Saving…' : 'Save') : 'Edit'}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="rounded-xl bg-rose-500/20 px-3 py-2 text-sm font-medium text-rose-200 hover:bg-rose-500/30 disabled:bg-rose-500/20"
          >
            Delete
          </button>
        </div>
        {isEditing && (
          <button
            type="button"
            onClick={() => {
              setIsEditing(false);
              setDraft({ text: question.text, point_value: question.point_value });
            }}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            Cancel edits
          </button>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
