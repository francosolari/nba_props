import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import EditablePredictionBoard from '../components/EditablePredictionBoard';
import { Trophy, Target, Award, ChevronRight, ChevronDown, Lock, Unlock, User as UserIcon, Mail, Key, ExternalLink, TrendingUp, BarChart3, CheckCircle2, XCircle, Hourglass } from 'lucide-react';
import useLeaderboard from '../hooks/useLeaderboard';
import UserExpandedView from '../components/UserExpandedView';
import QuestionForm from '../components/QuestionForm';
import DisplayPredictionsBoard from '../components/DisplayPredictions';

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

const pageShellClasses = 'min-h-screen bg-slate-100 py-6';
const containerClasses = 'container mx-auto px-4 space-y-5';
const panelClasses = 'rounded-md border border-slate-200 bg-white';
const mutedPanelClasses = 'rounded-md border border-slate-200 bg-slate-50';

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
  const [activeTab, setActiveTab] = useState('overview');
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
    <div className={pageShellClasses}>
      <div className={containerClasses}>
        <section className={`${panelClasses} p-4 md:p-6`}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="h-14 w-14 md:h-16 md:w-16 rounded-full overflow-hidden border border-slate-200 bg-white flex-shrink-0">
                <img
                  alt="Avatar"
                  className="h-full w-full object-cover"
                  src={avatarUrl(me?.user?.display_name || me?.user?.username)}
                />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900">
                  {me?.user?.display_name || me?.user?.username}
                </h1>
                <p className="text-sm text-slate-600 mt-0.5">Season predictions profile</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
                Season
              </span>
              <div className="relative">
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="appearance-none border border-slate-300 bg-white text-slate-800 text-sm font-medium px-3 py-2 pr-9 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  {seasons.map((s) => (
                    <option key={s.slug} value={s.slug}>{s.slug}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>
            </div>
          </div>
        </section>

        {/* Stats Overview - Always visible */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className={`${mutedPanelClasses} p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-semibold text-slate-600">Rank</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{me?.rank ? `#${me.rank}` : '—'}</div>
            <div className="text-xs text-slate-500 mt-1">{data?.length || 0} players</div>
          </div>

          <div className={`${mutedPanelClasses} p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              <span className="text-xs font-semibold text-slate-600">Total Points</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{me?.user?.total_points?.toLocaleString() || '0'}</div>
            <div className="text-xs text-slate-500 mt-1">across all categories</div>
          </div>

          <div className={`${mutedPanelClasses} p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-sky-600" />
              <span className="text-xs font-semibold text-slate-600">Standings</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{standings.points || 0}</div>
            <div className="text-xs text-slate-500 mt-1">of {standings.max_points || 0} pts</div>
          </div>

          <div className={`${mutedPanelClasses} p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-rose-600" />
              <span className="text-xs font-semibold text-slate-600">Props &amp; Awards</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{(awards.points || 0) + (props.points || 0)}</div>
            <div className="text-xs text-slate-500 mt-1">of {(awards.max_points || 0) + (props.max_points || 0)} pts</div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`${panelClasses} flex gap-1 p-1 overflow-x-auto`}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'performance', label: 'Performance' },
            { id: 'submissions', label: 'Submissions' },
            { id: 'settings', label: 'Settings' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 min-w-[120px] px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                activeTab === t.id
                  ? 'bg-slate-200 text-slate-900 border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Panels */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Quick Predictions View */}
            <section className={`${panelClasses} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Regular Season Standings</h3>
                <a
                  href={compareHref}
                  className="text-xs text-teal-700 hover:text-teal-800 inline-flex items-center gap-1 font-medium"
                >
                  Full view <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <DisplayPredictionsBoard seasonSlug={selectedSeason} />
            </section>

            {/* Category Performance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { title: 'Standings', icon: BarChart3, data: standings, color: 'teal' },
                { title: 'Awards', icon: Award, data: awards, color: 'amber' },
                { title: 'Props', icon: Target, data: props, color: 'rose' },
              ].map(({ title, icon: Icon, data, color }) => {
                const percentage = data.max_points > 0 ? Math.round((data.points / data.max_points) * 100) : 0;
                const colorClasses = {
                  teal: 'bg-teal-500/80',
                  amber: 'bg-amber-500/80',
                  rose: 'bg-rose-500/80',
                };
                return (
                  <div key={title} className={`${panelClasses} p-4`}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-md border border-slate-200 bg-slate-50">
                        <Icon className="w-4 h-4 text-slate-700" />
                      </div>
                      <span className="text-xs font-bold text-slate-900">{title}</span>
                    </div>
                    <div className="mb-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-slate-900">{data.points || 0}</span>
                        <span className="text-sm text-slate-500">/ {data.max_points || 0}</span>
                      </div>
                      <div className="text-xs text-slate-600 font-medium mt-0.5">{percentage}% accuracy</div>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div className={`h-full ${colorClasses[color]} transition-all duration-300`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-4">
            <div className={`${panelClasses} p-4`}>
              <UserExpandedView categories={expandedCategories} />
            </div>

            <div className={`${panelClasses} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Conference Standings Snapshot</h3>
                <span className="text-xs text-slate-500">Top 5 each</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: 'Western Conference', list: confLists.west },
                  { title: 'Eastern Conference', list: confLists.east },
                ].map(({ title, list }) => (
                  <div key={title}>
                    <h4 className="text-xs font-bold text-slate-700 mb-2">{title}</h4>
                    <ul className="space-y-2">
                      {list.length === 0 ? (
                        <li className="text-xs text-slate-500 italic py-2">No predictions yet</li>
                      ) : (
                        list.map((p, idx) => {
                          const isCorrect = p.correct === true;
                          const hasPoints = (p.points || 0) > 0;
                          return (
                            <li
                              key={idx}
                              className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 transition-colors hover:bg-slate-50"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {isCorrect ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                ) : hasPoints ? (
                                  <span className="w-3.5 h-3.5 rounded-full bg-amber-400 flex-shrink-0" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                                )}
                                <span className="font-semibold text-sm text-slate-900 truncate">{p.team}</span>
                              </div>
                              <div className="text-xs text-slate-600 flex items-center gap-2 flex-shrink-0">
                                <span>#{p.predicted_position}</span>
                                <span className="text-slate-400">→</span>
                                <span>#{p.actual_position ?? '?'}</span>
                                <span className={`font-bold ml-1 ${hasPoints ? 'text-emerald-600' : 'text-slate-400'}`}>
                                  +{p.points || 0}
                                </span>
                              </div>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <a
                href={compareHref}
                className="inline-flex items-center gap-2 rounded-md border border-teal-600 bg-white px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
              >
                Open Detailed Comparison <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}

        {activeTab === 'submissions' && (
          <div className="space-y-4">
            {/* Standings Submission */}
            <div className={`${panelClasses} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Regular Season Predictions</h3>
                {canEdit ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                    <Unlock className="w-3.5 h-3.5" /> Open for editing
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-rose-600 font-semibold">
                    <Lock className="w-3.5 h-3.5" /> Locked
                  </span>
                )}
              </div>
              <EditablePredictionBoard seasonSlug={selectedSeason} canEdit={!!canEdit} username={username} />
            </div>

            {/* Question Submissions */}
            <div className={`${panelClasses} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Question Submissions</h3>
                {canEdit ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                    <Unlock className="w-3.5 h-3.5" /> Open for submission
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-rose-600 font-semibold">
                    <Lock className="w-3.5 h-3.5" /> Locked
                  </span>
                )}
              </div>
              {canEdit ? (
                <QuestionForm
                  seasonSlug={selectedSeason}
                  canEdit={!!canEdit}
                  submissionEndDate={selectedSeasonObj?.submission_end_date || null}
                />
            ) : (
                answers.length === 0 ? (
                  <div className="text-sm text-slate-500 text-center py-6">
                    No answers submitted for {selectedSeason}.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(() => {
                      // Group answers by question type
                      const grouped = {};
                      answers.forEach((a) => {
                        const type = (a.question_type || 'Other').toUpperCase();
                        if (!grouped[type]) grouped[type] = [];
                        grouped[type].push(a);
                      });

                      // Color scheme for question types
                      const typeInfo = {
                        PROPQUESTION: {
                          badge: 'bg-purple-100 border-purple-300 text-purple-700',
                          label: 'Props',
                        },
                        SUPERLATIVEQUESTION: {
                          badge: 'bg-blue-100 border-blue-300 text-blue-700',
                          label: 'Superlatives',
                        },
                        NBAFINALSPREDICTIONQUESTION: {
                          badge: 'bg-amber-100 border-amber-300 text-amber-700',
                          label: 'Finals',
                        },
                        default: {
                          badge: 'bg-slate-100 border-slate-300 text-slate-700',
                          label: 'Other',
                        },
                      };

                      const getTypeInfo = (type) => typeInfo[type] || typeInfo['default'];

                      return Object.entries(grouped).map(([type, items]) => {
                        const info = getTypeInfo(type);
                        return (
                          <div key={type} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className={`inline-flex items-center px-2.5 py-1 rounded-lg border ${info.badge}`}>
                                <span className="text-xs font-bold uppercase tracking-wider">
                                  {info.label}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 font-medium">
                                {items.length} {items.length === 1 ? 'question' : 'questions'}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {items.map((a, idx) => {
                                const isCorrect = a.is_correct === true;
                                const isIncorrect = a.is_correct === false;
                                const isPending = a.is_correct === null || typeof a.is_correct === 'undefined';

                                const baseCard = 'rounded-md border p-3 transition-colors';
                                const cardClasses = `${baseCard} ${
                                  isCorrect
                                    ? 'bg-emerald-50 border-emerald-300 border-l-4 border-l-emerald-500'
                                    : isIncorrect
                                    ? 'bg-rose-50 border-rose-300 border-l-4 border-l-rose-500'
                                    : 'bg-slate-50 border-slate-200'
                                }`;

                                return (
                                  <div key={idx} className={cardClasses}>
                                    <div className="text-sm font-semibold text-slate-900 mb-2 leading-tight" title={a.question_text}>
                                      {a.question_text}
                                    </div>
                                    <div className="text-sm text-slate-800 mb-3">
                                      <span className="text-slate-600">Your answer:</span>{' '}
                                      <span className="font-bold">{String(a.answer)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                      <div className="flex items-center gap-1.5">
                                        {isCorrect && (
                                          <>
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                            <span className="font-bold text-emerald-700">Correct</span>
                                          </>
                                        )}
                                        {isIncorrect && (
                                          <>
                                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                            <span className="font-bold text-rose-700">Incorrect</span>
                                          </>
                                        )}
                                        {isPending && (
                                          <>
                                            <Hourglass className="w-3.5 h-3.5 text-slate-500" />
                                            <span className="font-semibold text-slate-500">Pending</span>
                                          </>
                                        )}
                                      </div>
                                      {typeof a.points_earned === 'number' && (
                                        <span className={`font-bold ${a.points_earned > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
                                          +{a.points_earned} pts
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`${panelClasses} p-4`}>
              <h3 className="text-sm font-bold text-slate-900 mb-3">Account Settings</h3>
              <ul className="space-y-2">
                {[
                  { icon: Mail, label: 'Change Email', href: '/accounts/email/' },
                  { icon: Key, label: 'Change Password', href: '/accounts/password/change/' },
                  { icon: UserIcon, label: 'Third-Party Accounts', href: '/accounts/social/connections/' },
                  { icon: UserIcon, label: 'Active Sessions', href: '/accounts/sessions/' },
                ].map(({ icon: Icon, label, href }) => (
                  <li key={href}>
                    <a
                      href={href}
                      className="flex items-center gap-2 text-sm text-teal-700 hover:text-teal-800 font-medium transition-colors"
                    >
                      <Icon className="w-4 h-4" /> {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className={`${panelClasses} p-4`}>
              <h3 className="text-sm font-bold text-slate-900 mb-3">Profile Avatar</h3>
              <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                Your avatar uses a privacy-friendly placeholder generated from your display name.
              </p>
              <div className="flex items-center gap-3">
                <img
                  className="h-14 w-14 rounded-full ring-2 ring-slate-200"
                  alt="Avatar preview"
                  src={avatarUrl(me?.user?.display_name || me?.user?.username)}
                />
                <div className="text-xs text-slate-500">
                  Custom avatar uploads can be added in a future update.
                </div>
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className={`${panelClasses} p-8 text-center text-sm text-slate-600`}>
            <div className="animate-pulse">Loading your profile data…</div>
          </div>
        )}
        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-700">
            We couldn't load your profile details. Please try again later.
          </div>
        )}
      </div>
    </div>
  );
}
