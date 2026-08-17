/* LeaderboardPage.jsx */
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useLeaderboard } from '../hooks';
import CourtSelect from '../components/CourtSelect';
import TeamLogo from '../components/TeamLogo';
import PlayerHeadshot from '../components/PlayerHeadshot';
import usePlayerHeadshots from '../features/leaderboard/hooks/usePlayerHeadshots';
import { ScorebookHeader, ScorebookNumber, ScorebookRow, ScorebookTable } from '../components/scorebook/ScorebookPrimitives';
import {
  ChevronDown,
  Award,
  BarChart3,
  ListChecks,
  CircleCheck,
  CircleX,
  ArrowRight,
  Lock,
  Calendar,
  Crown,
  Medal,
  Minus,
  Trophy,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS & HELPERS
   ───────────────────────────────────────────────────────────────────────────── */

const formatDate = (isoString) => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
};

const getInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const formatOrdinal = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  const remainder = number % 100;
  const suffix = remainder >= 11 && remainder <= 13
    ? 'th'
    : ({ 1: 'st', 2: 'nd', 3: 'rd' }[number % 10] || 'th');
  return `${number}${suffix}`;
};

const getLoggedInUsername = (providedUsername) => {
  if (providedUsername !== undefined) return providedUsername || '';
  if (typeof document === 'undefined') return '';
  return document.getElementById('leaderboard-page-root')?.dataset?.loggedInUsername || '';
};

const STATUS_META = {
  correct: { label: 'Correct', standingsLabel: 'Exact', points: '3 pts', icon: CircleCheck },
  partial: { label: 'Partially correct', standingsLabel: 'Off by 1', points: '1 pt', icon: Minus },
  incorrect: { label: 'Incorrect', standingsLabel: 'Missed', points: '0 pts', icon: CircleX },
};

const PREVIEW_STATUSES = ['correct', 'partial', 'incorrect'];
const VALID_SCORE_STATUSES = new Set([...PREVIEW_STATUSES, 'pending']);
const RANK_HONORS = {
  1: { tone: 'gold', Icon: Trophy },
  2: { tone: 'silver', Icon: Medal },
  3: { tone: 'bronze', Icon: Award },
};

const resolvePredictionStatus = (prediction, isStandings) => {
  if (VALID_SCORE_STATUSES.has(prediction?.score_status)) return prediction.score_status;
  if (prediction?.correct === true) return Number(prediction.points || 0) > 0 ? 'correct' : 'incorrect';
  if (prediction?.correct === false) return Number(prediction.points || 0) > 0 ? 'partial' : 'incorrect';
  if (isStandings && prediction?.actual_position != null) {
    if (Number(prediction.points) === 3) return 'correct';
    if (Number(prediction.points) === 1) return 'partial';
    return 'incorrect';
  }
  return 'pending';
};

const getStandingResult = (prediction) => {
  const predicted = prediction?.predicted_position;
  const actual = prediction?.actual_position;
  const predictedLabel = predicted == null ? '—' : formatOrdinal(predicted);
  const actualLabel = actual == null ? '—' : formatOrdinal(actual);

  if (predicted != null && actual != null && Number(predicted) === Number(actual)) {
    return {
      label: predictedLabel,
      description: `Picked and finished ${predictedLabel}`,
    };
  }

  return {
    label: `${predictedLabel} → ${actualLabel}`,
    description: `Picked ${predictedLabel}; finished ${actualLabel}`,
  };
};

/* ─────────────────────────────────────────────────────────────────────────────
   SUB-COMPONENTS
   ───────────────────────────────────────────────────────────────────────────── */

const StatusLedger = ({ groups, isStandings, isPlayerAwards, headshotsByName, sectionPrefix, expandedSections, toggleSection }) => (
  <div className="court-grade-ledger">
    {PREVIEW_STATUSES.map((status) => {
      const items = groups[status] || [];
      const meta = STATUS_META[status];
      const Icon = meta.icon;
      const sectionKey = `${sectionPrefix}-${status}`;
      const isOpen = expandedSections.has(sectionKey);
      const label = isStandings ? meta.standingsLabel : meta.label;

      return (
        <div key={status} className={`court-grade-group is-${status} ${isOpen ? 'is-open' : ''}`}>
          <button
            type="button"
            className="court-grade-group__trigger"
            onClick={() => toggleSection(sectionKey)}
            aria-expanded={isOpen}
            aria-controls={`${sectionKey}-content`}
          >
            <span className="court-grade-group__identity">
              <span className="court-grade-group__mark" aria-hidden="true"><Icon /></span>
              <span>
                <strong>{label}</strong>
                <small>{meta.points}</small>
              </span>
            </span>
            <span className="court-grade-group__summary">
              <b>{items.length}</b>
              <ChevronDown aria-hidden="true" />
            </span>
          </button>

          {isOpen && (
            <div id={`${sectionKey}-content`} className="court-grade-group__content">
              {items.length > 0 ? items.slice(0, 4).map((prediction, index) => {
                const standingResult = isStandings ? getStandingResult(prediction) : null;
                return (
                  <div className="court-grade-pick" key={prediction.question_id || `${prediction.team || prediction.question}-${index}`}>
                    <span className={`court-grade-pick__name ${isStandings ? 'is-team' : ''}`} title={isStandings ? prediction.team : undefined}>
                      {isStandings && <TeamLogo teamName={prediction.team} alt="" aria-hidden="true" className="court-grade-pick__logo" />}
                      <span className="court-grade-pick__name-text">{prediction.team || prediction.question || 'Prediction'}</span>
                    </span>
                    {isStandings ? (
                      <span className="court-grade-pick__detail is-standing" aria-label={standingResult.description}>
                        {standingResult.label}
                      </span>
                    ) : (
                      <span className="court-grade-pick__detail">
                        {isPlayerAwards && prediction.answer && headshotsByName?.[prediction.answer] && (
                          <PlayerHeadshot
                            headshotUrl={headshotsByName[prediction.answer]}
                            name={prediction.answer}
                            size={22}
                            className="mr-1.5"
                          />
                        )}
                        {prediction.answer || 'Answer unavailable'}
                        {status !== 'pending' && <b>{Number(prediction.points || 0) > 0 ? `+${prediction.points}` : '0'}</b>}
                      </span>
                    )}
                  </div>
                );
              }) : (
                <p className="court-grade-group__empty">No predictions in this state.</p>
              )}
              {items.length > 4 && <p className="court-grade-group__more">+{items.length - 4} more in the full report</p>}
            </div>
          )}
        </div>
      );
    })}
  </div>
);

const CategoryDetailCard = ({ icon: Icon, title, data, detailsHref, headshotsByName }) => {
  const pts = data?.points || 0;
  const max = data?.max_points || 0;
  const pct = max > 0 ? Math.round((pts / max) * 100) : 0;
  const isStandings = title === 'Regular Season Standings';
  
  const [expandedSections, setExpandedSections] = useState(new Set());
  const toggleSection = (key) => {
    const next = new Set(expandedSections);
    next.has(key) ? next.delete(key) : next.add(key);
    setExpandedSections(next);
  };

  const groupedPredictions = useMemo(() => {
    const createGroups = () => ({ correct: [], partial: [], incorrect: [], pending: [] });
    if (isStandings) {
      const conferences = { east: createGroups(), west: createGroups() };
      (data?.predictions || []).forEach((prediction) => {
        const conference = String(prediction.conference || prediction.team_conference || '').toLowerCase().startsWith('w') ? 'west' : 'east';
        conferences[conference][resolvePredictionStatus(prediction, true)].push(prediction);
      });
      return conferences;
    }

    const groups = createGroups();
    (data?.predictions || []).forEach((prediction) => {
      groups[resolvePredictionStatus(prediction, false)].push(prediction);
    });
    return groups;
  }, [data?.predictions, isStandings]);

  return (
    <section className={`court-breakdown-card ${data?.is_best ? 'is-best' : ''}`}>
      {data?.is_best && (
        <span className="court-breakdown-card__best"><Crown aria-hidden="true" /> Category leader</span>
      )}
      <a href={detailsHref} className="court-breakdown-card__header">
        <span className="court-breakdown-card__title"><Icon aria-hidden="true" /><strong>{title}</strong></span>
        <span className="court-breakdown-card__score"><b>{pts}</b><span>/ {max} pts</span><small>{pct}%</small></span>
      </a>
      <div className="court-breakdown-card__meter" aria-label={`${pct}% of available points`}>
        <span style={{ width: `${pct}%` }} />
      </div>

      {isStandings ? (
        <div className="court-breakdown-conferences">
          {['east', 'west'].map((conference) => (
            <section key={conference} className={`court-breakdown-conference is-${conference}`}>
              <h5>{conference === 'east' ? 'Eastern Conference' : 'Western Conference'}</h5>
              <StatusLedger
                groups={groupedPredictions[conference]}
                isStandings
                sectionPrefix={`${title}-${conference}`}
                expandedSections={expandedSections}
                toggleSection={toggleSection}
              />
            </section>
          ))}
        </div>
      ) : (
        <StatusLedger
          groups={groupedPredictions}
          isPlayerAwards={title === 'Player Awards'}
          headshotsByName={headshotsByName}
          sectionPrefix={title}
          expandedSections={expandedSections}
          toggleSection={toggleSection}
        />
      )}

      <a href={detailsHref} className="court-breakdown-card__link">
        View full report <ArrowRight aria-hidden="true" />
      </a>
    </section>
  );
};


/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────────────────────────────────────── */

function LeaderboardPage({ seasonSlug: initialSeasonSlug = 'current', loggedInUsername: providedUsername }) {
  const [selectedSeason, setSelectedSeason] = useState(initialSeasonSlug);

  const { data: seasonsData } = useQuery({
    queryKey: ['seasons', 'user-participated'],
    queryFn: async () => {
      const res = await axios.get('/api/v2/seasons/user-participated');
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: leaderboardData, season: seasonInfo, error, isLoading } = useLeaderboard(selectedSeason);
  const headshotsByName = usePlayerHeadshots(true);
  const [expandedUsers, setExpandedUsers] = useState(new Set());
  const [visibleCount, setVisibleCount] = useState(100);
  const loggedInUsername = getLoggedInUsername(providedUsername);
  const currentUserEntry = leaderboardData.find((entry) => (
    String(entry?.user?.username || '').toLowerCase() === String(loggedInUsername).toLowerCase()
  ));

  const toggleUserExpansion = (userId) => {
    const next = new Set(expandedUsers);
    next.has(userId) ? next.delete(userId) : next.add(userId);
    setExpandedUsers(next);
  };

  const getCategory = (entry, key) => {
    const cats = entry?.user?.categories || entry?.categories || {};
    return cats?.[key] || { points: 0, max_points: 0, predictions: [] };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[var(--court-paper)] p-6 flex flex-col items-center justify-center space-y-8">
        <div className="w-full max-w-4xl space-y-6 animate-pulse">
           <div className="h-32 border-2 border-[var(--court-rule)] bg-[var(--court-sheet-wash)] w-full"></div>
           <div className="space-y-3">
             {[...Array(5)].map((_,i) => <div key={i} className="h-20 border border-[var(--court-rule-soft)] bg-[var(--court-sheet-wash)] w-full" />)}
           </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--court-paper)] p-4">
        <div className="max-w-md w-full bg-[var(--court-paper)] border-2 border-[var(--court-rule)] border-l-[12px] border-l-[var(--court-danger)] p-8 text-center">
          <div className="w-12 h-12 bg-[var(--court-red-soft)] flex items-center justify-center mx-auto mb-4 text-[var(--court-danger)]">
             <CircleX className="w-6 h-6" />
          </div>
          <h3 className="court-display text-lg mb-2">Something went wrong</h3>
          <p className="text-[var(--court-steel)]">{String(error)}</p>
        </div>
      </div>
    );
  }

  const submissionsOpen = seasonInfo?.submissions_open ?? false;
  const submissionEndDate = seasonInfo?.submission_end_date;

  if (submissionsOpen && submissionEndDate) {
    return (
      <div className="min-h-screen bg-[var(--court-paper)] p-4 flex items-center justify-center">
        <div className="court-locked-sheet max-w-xl w-full text-center relative">
           <Lock className="court-locked-sheet__watermark" aria-hidden="true" />

           <div className="court-locked-sheet__badge">
              <Lock className="w-8 h-8" />
           </div>

           <h1 className="court-display text-2xl mb-2">Leaderboard Locked</h1>
           <p className="text-[var(--court-steel)] mb-8 max-w-sm mx-auto">
             Rankings are hidden while predictions are open. Check back later!
           </p>

           <div className="court-locked-sheet__chip">
              <Calendar className="w-4 h-4" />
              <span>Reveals {formatDate(submissionEndDate)}</span>
           </div>

           {seasonsData && seasonsData.length > 1 && (
              <div className="court-locked-sheet__seasons">
                <div className="flex justify-center items-center gap-2 text-sm">
                  <span className="text-[var(--court-steel)]">Past seasons:</span>
                  <CourtSelect
                    label="Past season"
                    showLabel={false}
                    className="court-select--compact"
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(e.target.value)}
                  >
                    {seasonsData.map((s) => (
                      <option key={s.slug} value={s.slug}>{s.year}</option>
                    ))}
                  </CourtSelect>
                </div>
              </div>
           )}
        </div>
      </div>
    );
  }

  return (
    <div className="court-leaderboard-page min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      
      {/* ─── 1. Compact Header ─── */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 pt-4 pb-4 md:pt-6 md:pb-6">
        <div className="court-leaderboard-header max-w-7xl mx-auto px-4 sm:px-6">
          <div className="court-leaderboard-header__title">
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Leaderboard
            </h1>
          </div>

          <div className="court-leaderboard-header__utilities">
            {loggedInUsername && (
              <div className="court-your-rank" aria-label={currentUserEntry ? `Your rank is ${formatOrdinal(currentUserEntry.rank)} out of ${leaderboardData.length}` : `You are not ranked among ${leaderboardData.length} participants`}>
                <span>Your rank</span>
                <strong>{currentUserEntry ? formatOrdinal(currentUserEntry.rank) : '—'}</strong>
                <small>/ {leaderboardData.length}</small>
              </div>
            )}

              {seasonsData && seasonsData.length > 1 && (
                <CourtSelect
                  label="Season"
                  className="court-select--compact"
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                >
                  {seasonsData.map((s) => <option key={s.slug} value={s.slug}>{s.year}</option>)}
                </CourtSelect>
              )}
          </div>
        </div>
      </header>

      {/* ─── 2. Main List ─── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 md:py-6">
        <ScorebookTable as="div" className="court-basic-leaderboard bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          
          <ScorebookHeader className="court-basic-leaderboard__head hidden md:grid grid-cols-[76px_220px_140px_1fr_40px] gap-0 px-0 py-0">
            <div className="text-center">Rank</div>
            <div>Participant</div>
            <div className="text-center">Total Points</div>
            <div>Category preview</div>
            <div></div>
          </ScorebookHeader>

          <div className="court-basic-leaderboard__body">
            {leaderboardData.slice(0, visibleCount).map((entry) => {
              const isExpanded = expandedUsers.has(entry.user.id);
              const displayName = entry.user.display_name || entry.user.username;
              const rankHonor = RANK_HONORS[entry.rank];
              const RankHonorIcon = rankHonor?.Icon;
              return (
                <div key={entry.user.id} className={`court-basic-entry group ${entry.rank === 1 ? 'is-leader' : ''} ${isExpanded ? 'is-expanded' : ''}`}>
                  
                  <ScorebookRow
                    as="button"
                    type="button"
                    onClick={() => toggleUserExpansion(entry.user.id)}
                    className="court-basic-leaderboard__row w-full text-left cursor-pointer grid grid-cols-[56px_minmax(0,1fr)_76px_24px] md:grid-cols-[76px_220px_140px_1fr_40px] gap-0 items-center p-0 focus:outline-none"
                  >
                    <div className={`court-basic-rank ${rankHonor ? `has-honor is-${rankHonor.tone}` : ''}`}>
                       <ScorebookNumber>{entry.rank}</ScorebookNumber>
                       {RankHonorIcon && (
                         <span className="court-rank-honor" aria-hidden="true">
                           <RankHonorIcon />
                         </span>
                       )}
                    </div>

                    <div className="court-basic-participant flex items-center gap-3 overflow-hidden">
                      <div className="relative flex-shrink-0">
                         {entry.user.avatar ? (
                           <img src={entry.user.avatar} className="w-8 h-8 md:w-9 md:h-9 rounded-full object-cover shadow-sm border border-slate-200 dark:border-slate-700" alt="" onError={(e)=>e.target.style.display='none'}/>
                         ) : (
                           <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 text-xs border border-slate-200 dark:border-slate-700">
                             {getInitials(displayName)}
                           </div>
                         )}
                      </div>
                      
                      <div className="min-w-0 flex flex-col justify-center">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate text-xs md:text-sm leading-tight">
                          {displayName}
                        </h3>
                        {entry.user.badges && entry.user.badges.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {entry.user.badges.filter(b => b.type === 'category_best').slice(0, 2).map((b, i) => (
                              <span key={i} className="court-category-badge">
                                <Crown aria-hidden="true" />
                                {b.category ? `Top ${b.category.split(' ')[0]}` : 'Leader'}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Points: Primary Metric - Now moved earlier in desktop grid */}
                    <div className="court-basic-points-cell text-center">
                       <ScorebookNumber className="court-basic-points">
                         {entry.user.total_points.toLocaleString()}
                       </ScorebookNumber>
                       <div className="md:hidden text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Pts</div>
                    </div>

                    {/* Desktop: Category Previews - Now after points */}
                    <div className="court-basic-preview hidden md:flex items-center gap-4">
                      {['Regular Season Standings', 'Player Awards', 'Props & Yes/No'].map(catKey => {
                        const catData = getCategory(entry, catKey);
                        const pct = catData.max_points > 0 ? (catData.points / catData.max_points) * 100 : 0;
                        return (
                           <div key={catKey} className="flex-1 min-w-[80px]">
                              <div className="court-basic-preview__label">
                                <span>{catKey === 'Regular Season Standings' ? 'Standings' : catKey === 'Player Awards' ? 'Awards' : 'Props'}</span>
                                <span>{catData.points} / {catData.max_points}</span>
                              </div>
                              <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-teal-500 rounded-full" 
                                  style={{ width: `${pct}%` }} 
                                />
                              </div>
                           </div>
                        );
                      })}
                    </div>

                    <div className="court-basic-disclosure flex justify-center">
                       <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                         <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                       </div>
                    </div>
                  </ScorebookRow>

                  {isExpanded && <div className="court-basic-expansion is-open">
                    <div className="court-basic-expansion__inner">
                       <div className="court-breakdown-sheet">
                         <div className="court-breakdown-sheet__head">
                            <h4>
                              <BarChart3 className="w-3 h-3" /> Detailed Breakdown
                            </h4>
                            <a href={`/leaderboard/${selectedSeason}/detailed/?user=${entry.user.id}`}>
                              Advanced board <ArrowRight aria-hidden="true" />
                            </a>
                         </div>
                         
                         <div className="court-breakdown-grid">
                           <CategoryDetailCard 
                             icon={BarChart3} 
                             title="Regular Season Standings" 
                             data={getCategory(entry, 'Regular Season Standings')} 
                             detailsHref={`/leaderboard/${selectedSeason}/detailed/?section=standings&user=${entry.user.id}`}
                           />
                           <CategoryDetailCard
                             icon={Award}
                             title="Player Awards"
                             data={getCategory(entry, 'Player Awards')}
                             headshotsByName={headshotsByName}
                             detailsHref={`/leaderboard/${selectedSeason}/detailed/?section=awards&user=${entry.user.id}`}
                           />
                           <CategoryDetailCard 
                             icon={ListChecks} 
                             title="Props & Yes/No" 
                             data={getCategory(entry, 'Props & Yes/No')} 
                             detailsHref={`/leaderboard/${selectedSeason}/detailed/?section=props&user=${entry.user.id}`}
                           />
                         </div>
                       </div>
                    </div>
                  </div>}

                </div>
              );
            })}
          </div>
          
          {visibleCount < leaderboardData.length && (
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 text-center">
              <button
                onClick={() => setVisibleCount(c => c + 100)}
                className="px-4 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors uppercase tracking-wide"
              >
                Load More
              </button>
            </div>
          )}
        </ScorebookTable>
      </main>
    </div>
  );
}

export default LeaderboardPage;
