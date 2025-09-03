import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import EditablePredictionBoard from '../components/EditablePredictionBoard';
import { Trophy, Target, Award, ChevronRight, Lock, Unlock, User as UserIcon, Mail, Key, ExternalLink } from 'lucide-react';
import useLeaderboard from '../hooks/useLeaderboard';
import Leaderboard from '../components/Leaderboard';
import UserExpandedView from '../components/UserExpandedView';
import CategoryIcon from '../components/CategoryIcon';
import QuestionForm from '../components/QuestionForm';

function getRootProps() {
  const el = document.getElementById('profile-root');
  return {
    userId: el?.getAttribute('data-user-id') || '',
    username: el?.getAttribute('data-username') || '',
    displayName: el?.getAttribute('data-display-name') || '',
    seasonSlug: el?.getAttribute('data-season-slug') || 'current',
    seasonsCsv: el?.getAttribute('data-seasons') || '',
  };
}

function avatarUrl(name) {
  const n = (name || 'User').trim();
  return `https://avatar-placeholder.iran.liara.run/username/${encodeURIComponent(n)}?width=160&height=160&fontSize=64`;
}

function ProgressBar({ value = 0, className = '' }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={`mt-3 h-2 w-full overflow-hidden rounded bg-gray-100 ${className}`}>
      <div className="h-full bg-indigo-600" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function ProfilePage({ seasonSlug: seasonFromProp = 'current' }) {
  const { userId, username, displayName, seasonSlug, seasonsCsv } = getRootProps();
  const initialSeason = seasonFromProp || seasonSlug || 'current';
  const [selectedSeason, setSelectedSeason] = useState(initialSeason);
  const [seasons, setSeasons] = useState(() => (seasonsCsv ? seasonsCsv.split(',').filter(Boolean).map(slug => ({ slug })) : [{ slug: initialSeason }]));

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await axios.get('/api/v2/seasons/');
        if (mounted && Array.isArray(res.data) && res.data.length) {
          setSeasons(res.data);
          if (!res.data.find(s => s.slug === selectedSeason)) {
            setSelectedSeason(res.data[0].slug);
          }
        }
      } catch (_) {
        // Fallback silently to server-provided CSV
      }
    })();
    return () => { mounted = false; };
  }, []);

  const { data, isLoading, error } = useLeaderboard(selectedSeason);
  const [activeTab, setActiveTab] = useState('overview'); // overview | leaderboard | submissions | settings
  const [answers, setAnswers] = useState([]);

  const me = useMemo(() => {
    if (!Array.isArray(data)) return null;
    const byId = data.find(e => String(e?.user?.id) === String(userId));
    const byName = data.find(e => String(e?.user?.username) === String(username));
    const found = byId || byName;
    if (found) return found;
    return {
      rank: '—',
      user: {
        id: userId || null,
        username: username || 'me',
        display_name: displayName || username || 'Me',
        avatar: null,
        total_points: 0,
        accuracy: 0,
        categories: {
          'Regular Season Standings': { points: 0, max_points: 0, predictions: [] },
          'Player Awards': { points: 0, max_points: 0, predictions: [] },
          'Props & Yes/No': { points: 0, max_points: 0, predictions: [] },
        },
      },
    };
  }, [data, userId, username, displayName]);

  const cats = me?.user?.categories || {};
  const standings = cats['Regular Season Standings'] || { points: 0, max_points: 0, predictions: [] };
  const awards = cats['Player Awards'] || { points: 0, max_points: 0, predictions: [] };
  const props = cats['Props & Yes/No'] || { points: 0, max_points: 0, predictions: [] };

  // Transform categories to UserExpandedView format
  const expandedCategories = useMemo(() => {
    const toItems = (preds, isStandings) => (preds || []).map((p, idx) => ({
      id: p.question_id || `${p.team}-${idx}`,
      question: p.question || (isStandings ? p.team : ''),
      answer: p.answer,
      correct: typeof p.correct === 'boolean' ? p.correct : undefined,
      points: p.points || 0,
      team_name: isStandings ? p.team : undefined,
      predicted_position: isStandings ? p.predicted_position : undefined,
      actual_position: isStandings ? p.actual_position : undefined,
    }));
    return [
      {
        id: 'regular',
        type: 'Regular',
        icon: 'grid',
        title: 'Regular Season Standings',
        points: standings.points || 0,
        maxPoints: standings.max_points || 0,
        predictions: toItems(standings.predictions, true),
      },
      {
        id: 'awards',
        type: 'Awards',
        icon: 'award',
        title: 'Player Awards',
        points: awards.points || 0,
        maxPoints: awards.max_points || 0,
        predictions: toItems(awards.predictions, false),
      },
      {
        id: 'props',
        type: 'Props',
        icon: 'target',
        title: 'Props & Yes/No',
        points: props.points || 0,
        maxPoints: props.max_points || 0,
        predictions: toItems(props.predictions, false),
      },
    ];
  }, [standings, awards, props]);

  const pct = (num, den) => (den ? (100 * (num || 0)) / den : 0);
  const accuracyPct = Math.max(0, Math.min(100, Math.round(me?.user?.accuracy || 0)));

  const confLists = useMemo(() => {
    const preds = (standings?.predictions || []).slice();
    const west = [];
    const east = [];
    preds.forEach((p) => {
      const isWest = String(p?.conference || '').toLowerCase().startsWith('w');
      (isWest ? west : east).push(p);
    });
    const order = (arr) => arr.sort((a, b) => (a.actual_position || 999) - (b.actual_position || 999)).slice(0, 5);
    return { west: order(west), east: order(east) };
  }, [standings]);

  const compareHref = `/page-detail/${encodeURIComponent(selectedSeason)}/?user=${encodeURIComponent(me?.user?.id || '')}&section=standings`;
  const selectedSeasonObj = seasons.find(s => s.slug === selectedSeason) || {};
  const canEdit = useMemo(() => {
    try {
      const now = new Date();
      const start = selectedSeasonObj.submission_start_date ? new Date(selectedSeasonObj.submission_start_date) : null;
      const end = selectedSeasonObj.submission_end_date ? new Date(selectedSeasonObj.submission_end_date) : null;
      if (!end) return false;
      if (start && now < start) return false;
      return now <= end;
    } catch (_) {
      return false;
    }
  }, [selectedSeasonObj]);

  // Load answers for submissions tab
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (activeTab !== 'submissions') return;
        const res = await axios.get(`/api/v2/answers/user/${encodeURIComponent(username || me?.user?.username || '')}`, {
          params: { season_slug: selectedSeason, resolve_names: true }
        });
        if (mounted) setAnswers(Array.isArray(res.data?.answers) ? res.data.answers : []);
      } catch (_) {
        if (mounted) setAnswers([]);
      }
    })();
    return () => { mounted = false; };
  }, [activeTab, selectedSeason, username, me?.user?.username]);

  return (
    <div className="min-h-screen w-full">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-sky-600 to-cyan-500 text-white shadow-md">
        <div className="px-6 py-8 md:px-10 md:py-12">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="relative h-16 w-16 md:h-20 md:w-20">
                <img
                  alt="Avatar"
                  className="h-full w-full rounded-full object-cover ring-2 ring-white/40 shadow-md"
                  src={avatarUrl(me?.user?.display_name || me?.user?.username)}
                />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold leading-tight">
                  {me?.user?.display_name || me?.user?.username}
                </h1>
                <p className="text-white/85 mt-1">Your NBA Predictions Showcase</p>
              </div>
            </div>
            <div>
              <label htmlFor="season-select" className="block text-xs font-medium text-white/80 mb-1">Season</label>
              <select
                id="season-select"
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="rounded-md bg-white/90 text-gray-900 text-sm px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-white/60"
              >
                {seasons.map((s) => (
                  <option key={s.slug} value={s.slug}>{s.slug}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-white/10 blur-2xl" />
      </section>

      {/* Badges (if any) */}
      {Array.isArray(me?.user?.badges) && me.user.badges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {me.user.badges.map((b, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 px-2 py-1 text-xs">
              {b.icon && <span className="opacity-70">{b.icon}</span>}
              {b.label || String(b)}
            </span>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6">
        <div className="flex gap-2 border-b border-gray-200">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'leaderboard', label: 'Leaderboard' },
            { id: 'submissions', label: 'Submissions' },
            { id: 'settings', label: 'Manage' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 -mb-px border-b-2 transition-colors ${activeTab === t.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <>
          {/* Quick Stats */}
          <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-white p-5 shadow ring-1 ring-black/5">
              <p className="text-sm text-gray-500">Total Points</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{(me?.user?.total_points || 0).toLocaleString()}</p>
              <p className="mt-1 text-xs text-gray-500">Rank: {me?.rank ?? '—'}</p>
            </div>
            <div className="rounded-xl bg-white p-5 shadow ring-1 ring-black/5">
              <p className="text-sm text-gray-500">Regular Season</p>
              <div className="mt-2 flex items-end justify-between">
                <p className="text-3xl font-semibold tracking-tight">{(standings.points || 0).toLocaleString()}</p>
                <p className="text-xs text-gray-500">/ {(standings.max_points || 0).toLocaleString()}</p>
              </div>
              <ProgressBar value={pct(standings.points, standings.max_points)} />
            </div>
            <div className="rounded-xl bg-white p-5 shadow ring-1 ring-black/5">
              <p className="text-sm text-gray-500">Accuracy</p>
              <div className="mt-2 flex items-end justify-between">
                <p className="text-3xl font-semibold tracking-tight">{accuracyPct}%</p>
                <p className="text-xs text-gray-500">Correct answers rate</p>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded bg-gray-100">
                <div className="h-full bg-emerald-500" style={{ width: `${accuracyPct}%` }} />
              </div>
            </div>
          </section>

          {/* Current Leaderboard Snapshot */}
          <section className="mt-6 rounded-xl bg-white p-5 shadow ring-1 ring-black/5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800">Current Leaderboard</h3>
              <a href={`/page/${encodeURIComponent(selectedSeason)}/`} className="text-sm text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1">Open full leaderboard <ExternalLink className="w-4 h-4" /></a>
            </div>
            <div className="mt-4">
              <Leaderboard seasonSlug={selectedSeason} />
            </div>
          </section>
        </>
      )}

      {activeTab === 'leaderboard' && (
      <section className="mt-6">
        <UserExpandedView categories={expandedCategories} />
        <div className="mt-4">
          <a href={compareHref} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
            Open Detailed Comparison View <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </section>
      )}

      {activeTab === 'leaderboard' && (
      <section className="mt-6 rounded-xl bg-white p-5 shadow ring-1 ring-black/5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800">Regular Season Standings Snapshot</h3>
          <span className="text-xs text-gray-500">Top 5 per conference</span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-medium text-gray-600">Western Conference</h4>
            <ul className="mt-3 space-y-2">
              {confLists.west.map((p, idx) => (
                <li key={idx} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                  <div className="flex items-center text-sm text-gray-800">
                    <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${p.correct===true?'bg-emerald-500':'bg-gray-300'}`} />
                    <span className="font-medium">{p.team}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Pred {p.predicted_position} • Act {p.actual_position ?? '—'} • <span className="font-semibold text-gray-800">{(p.points||0).toLocaleString()} pts</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-600">Eastern Conference</h4>
            <ul className="mt-3 space-y-2">
              {confLists.east.map((p, idx) => (
                <li key={idx} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                  <div className="flex items-center text-sm text-gray-800">
                    <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${p.correct===true?'bg-emerald-500':'bg-gray-300'}`} />
                    <span className="font-medium">{p.team}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Pred {p.predicted_position} • Act {p.actual_position ?? '—'} • <span className="font-semibold text-gray-800">{(p.points||0).toLocaleString()} pts</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      )}

      {activeTab === 'leaderboard' && (
        <div className="mt-6">
          <a href={compareHref} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
            Open Detailed Comparison View <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      )}

      {activeTab === 'submissions' && (
        <section className="mt-6 space-y-6">
          {/* Standings editing */}
          <div className="rounded-xl bg-white p-5 shadow ring-1 ring-black/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-800">Regular Season Predictions</h3>
              {canEdit ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><Unlock className="w-4 h-4" /> Window open</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-rose-600"><Lock className="w-4 h-4" /> Locked</span>
              )}
            </div>
            <EditablePredictionBoard seasonSlug={selectedSeason} canEdit={!!canEdit} username={username} />
          </div>

          {/* Answers list */}
          <div className="rounded-xl bg-white p-5 shadow ring-1 ring-black/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-800">Question Submissions</h3>
              {canEdit ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><Unlock className="w-4 h-4" /> Window open</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-rose-600"><Lock className="w-4 h-4" /> Locked</span>
              )}
            </div>
            {canEdit ? (
              <QuestionForm seasonSlug={selectedSeason} />
            ) : (
              answers.length === 0 ? (
                <div className="text-sm text-gray-500">No answers submitted for {selectedSeason}.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {answers.map((a, idx) => (
                    <div key={idx} className="rounded-lg border border-gray-200 p-3">
                      <div className="text-sm font-medium text-gray-800 truncate">{a.question_text}</div>
                      <div className="mt-1 text-xs text-gray-500">{a.question_type}</div>
                      <div className="mt-2 text-sm text-gray-800">Your answer: <span className="font-medium">{String(a.answer)}</span></div>
                      <div className="mt-1 text-xs">
                        {typeof a.is_correct === 'boolean' ? (
                          a.is_correct ? <span className="text-emerald-600">Correct</span> : <span className="text-rose-600">Incorrect</span>
                        ) : (
                          <span className="text-gray-500">Pending</span>
                        )}
                        {typeof a.points_earned === 'number' && (
                          <span className="ml-2 text-gray-600">{a.points_earned} pts</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </section>
      )}

      {activeTab === 'settings' && (
        <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl bg-white p-5 shadow ring-1 ring-black/5">
            <h3 className="text-base font-semibold text-gray-800 mb-3">Account</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-500" /> <a className="text-indigo-600 hover:text-indigo-700" href="/accounts/email/">Change Email</a></li>
              <li className="flex items-center gap-2"><Key className="w-4 h-4 text-gray-500" /> <a className="text-indigo-600 hover:text-indigo-700" href="/accounts/password/change/">Change Password</a></li>
              <li className="flex items-center gap-2"><UserIcon className="w-4 h-4 text-gray-500" /> <a className="text-indigo-600 hover:text-indigo-700" href="/accounts/social/connections/">Third-Party Accounts</a></li>
              <li className="flex items-center gap-2"><UserIcon className="w-4 h-4 text-gray-500" /> <a className="text-indigo-600 hover:text-indigo-700" href="/accounts/sessions/">Sessions</a></li>
            </ul>
          </div>
          <div className="rounded-xl bg-white p-5 shadow ring-1 ring-black/5">
            <h3 className="text-base font-semibold text-gray-800 mb-3">Avatar</h3>
            <p className="text-sm text-gray-600">Your avatar uses a privacy-friendly placeholder generated from your name.</p>
            <div className="mt-3 flex items-center gap-3">
              <img className="h-16 w-16 rounded-full ring-1 ring-gray-200" alt="Avatar preview" src={avatarUrl(me?.user?.display_name || me?.user?.username)} />
              <div className="text-xs text-gray-500">To support custom avatars, we can wire an upload in a follow-up.</div>
            </div>
          </div>
        </section>
      )}

      {/* Edit Predictions (when allowed) */}
      <section className="mt-6 rounded-xl bg-white p-5 shadow ring-1 ring-black/5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">Regular Season Predictions</h3>
          {!canEdit && (
            <span className="text-xs text-gray-500">Submission window closed</span>
          )}
        </div>
        <EditablePredictionBoard seasonSlug={selectedSeason} canEdit={!!canEdit} />
      </section>

      {/* Loading / Error */}
      {isLoading && (
        <div className="mt-6 rounded-xl bg-white p-5 text-center text-sm text-gray-600 shadow ring-1 ring-black/5">
          Loading your profile data…
        </div>
      )}
      {error && (
        <div className="mt-6 rounded-xl bg-rose-50 p-5 text-center text-sm text-rose-700 ring-1 ring-rose-200">
          We couldn’t load your profile details. Please try again later.
        </div>
      )}
    </div>
  );
}