import React, { useState } from 'react';
import {
  Trophy,
  Star,
  Award,
  Users as UsersIcon,
  CheckCircle2,
  XCircle,
  Dot,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const GROUP_ALPHABET = ['A', 'B', 'C'];

const inferConference = (text = '') => {
  const lower = text.toLowerCase();
  if (lower.includes('east')) return 'East';
  if (lower.includes('west')) return 'West';
  if (lower.includes('champ') || lower.includes('cup')) return 'Champion';
  return null;
};

const parseGroupMeta = (groupRaw = '') => {
  const match = groupRaw.match(/(East|West)\s+Group\s+([a-z])/i);
  if (match) {
    return {
      conference: match[1] === 'West' || match[1] === 'west' ? 'West' : 'East',
      label: `Group ${match[2].toUpperCase()}`,
    };
  }

  const fallbackConference = inferConference(groupRaw) || 'East';
  const foundLetter = GROUP_ALPHABET.find(letter => groupRaw.toUpperCase().includes(`GROUP ${letter}`));
  return {
    conference: fallbackConference,
    label: foundLetter ? `Group ${foundLetter}` : groupRaw || 'Group',
  };
};

const buildBreakdown = (predictions = []) => {
  const breakdown = {
    groupWinners: { East: [], West: [] },
    wildcards: { East: [], West: [], Champion: [], Other: [] },
    conferenceTitles: { East: null, West: null, Champion: null },
    tiebreakers: [],
    misc: [],
  };

  predictions.forEach((prediction) => {
    const baseEntry = {
      team: prediction.answer,
      status: prediction.is_correct,
      points: prediction.points_earned,
      question: prediction.question_text,
    };

    switch (prediction.prediction_type) {
      case 'group_winner': {
        const { conference, label } = parseGroupMeta(prediction.ist_group || prediction.question_text || 'Group');
        breakdown.groupWinners[conference === 'West' ? 'West' : 'East'].push({
          ...baseEntry,
          label,
        });
        break;
      }
      case 'wildcard': {
        const conference = inferConference(prediction.ist_group || prediction.question_text) || 'Other';
        breakdown.wildcards[conference].push({
          ...baseEntry,
          label: conference !== 'Other' ? `${conference} Wildcard` : 'Wildcard',
        });
        break;
      }
      case 'conference_winner': {
        const conference = inferConference(prediction.ist_group || prediction.question_text) || 'Champion';
        const label = conference === 'Champion' ? 'NBA Cup Champion' : `${conference} Winner`;
        breakdown.conferenceTitles[conference] = {
          ...baseEntry,
          label,
        };
        break;
      }
      case 'champion': {
        breakdown.conferenceTitles['Champion'] = {
          ...baseEntry,
          label: 'NBA Cup Champion',
        };
        break;
      }
      case 'tiebreaker': {
        breakdown.tiebreakers.push({
          ...baseEntry,
          label: prediction.question_text,
        });
        break;
      }
      default:
        breakdown.misc.push({
          ...baseEntry,
          label: prediction.question_text,
        });
    }
  });

  // Sort groups by letter for consistency
  ['East', 'West'].forEach((conference) => {
    breakdown.groupWinners[conference].sort((a, b) => a.label.localeCompare(b.label));
  });

  return breakdown;
};

const collectEntries = (breakdown) => {
  const list = [];
  ['East', 'West'].forEach((conference) => {
    breakdown.groupWinners[conference].forEach((entry) => {
      list.push({ ...entry, category: `${conference} Groups` });
    });
  });
  ['East', 'West', 'Champion', 'Other'].forEach((conference) => {
    breakdown.wildcards[conference].forEach((entry) => {
      list.push({ ...entry, category: `${conference} Wildcards` });
    });
  });
  ['East', 'West', 'Champion'].forEach((key) => {
    const entry = breakdown.conferenceTitles[key];
    if (entry) list.push({ ...entry, category: key === 'Champion' ? 'Finals' : `${key} Winner` });
  });
  breakdown.tiebreakers.forEach((entry) => list.push({ ...entry, category: 'Tiebreakers' }));
  breakdown.misc.forEach((entry) => list.push({ ...entry, category: 'Other' }));
  return list;
};

const sortEntriesForPreview = (entries) => {
  const score = (status) => {
    if (status === true) return 0;
    if (status === null || typeof status === 'undefined') return 1;
    return 2;
  };
  const sorted = [...entries].sort((a, b) => {
    const diff = score(a.status) - score(b.status);
    if (diff !== 0) return diff;
    return (a.label || '').localeCompare(b.label || '');
  });
  const top = sorted.slice(0, 4);
  const mobileTop = sorted.slice(0, 2);
  return { sorted, top, mobileTop };
};

const statusStyles = (status) => {
  if (status === true) {
    return {
      container: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    };
  }
  if (status === false) {
    return {
      container: 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300',
      icon: <XCircle className="w-3.5 h-3.5" />,
    };
  }
  return {
    container: 'bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-700/30 dark:border-slate-600/50 dark:text-slate-300',
    icon: <Dot className="w-3.5 h-3.5" />,
  };
};

const PredictionChip = ({ entry }) => {
  const { container, icon } = statusStyles(entry.status);
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium ${container}`}>
      {icon}
      <span className="uppercase tracking-tight text-[10px] text-slate-500 dark:text-slate-400">
        {entry.label}
      </span>
      <span className="text-xs font-semibold text-slate-900 dark:text-white">
        {entry.team}
      </span>
    </span>
  );
};

/**
 * Component to display IST user leaderboard - compact inline version
 * @param {Object} props
 * @param {Array} props.users - Array of user leaderboard entries
 */
function ISTUserLeaderboard({ users = [] }) {
  const [visibleCount, setVisibleCount] = useState(10);
  const [expandedUserIds, setExpandedUserIds] = useState(() => new Set());

  const toggleExpanded = (userId) => {
    setExpandedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const rankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-4 h-4 text-yellow-400" />;
    if (rank === 2) return <Star className="w-4 h-4 text-slate-300" />;
    if (rank === 3) return <Award className="w-4 h-4 text-amber-500" />;
    return (
      <span className="w-4 h-4 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400">
        {rank}
      </span>
    );
  };

  if (!users || users.length === 0) {
    return (
      <div className="bg-white/90 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/50 rounded-xl shadow-lg p-8 text-center">
        <UsersIcon className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-3" />
        <p className="text-slate-600 dark:text-slate-400">
          No IST predictions submitted yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Prediction Leaders
            </h2>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {users.length} {users.length === 1 ? 'player' : 'players'}
          </div>
        </div>
      </div>

      {/* Compact User List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700/40">
        {users.slice(0, visibleCount).map((entry) => {
          const user = entry.user;
          const predictions = entry.predictions || [];
          const totalPoints = entry.total_points || 0;

          // Count correct and incorrect
          const correctCount = predictions.filter(p => p.is_correct === true).length;
          const incorrectCount = predictions.filter(p => p.is_correct === false).length;
          const pendingCount = predictions.filter(p => p.is_correct === null).length;
          const breakdown = buildBreakdown(predictions);
          const previews = sortEntriesForPreview(collectEntries(breakdown));
          const previewEntries = previews.top;
          const previewEntriesMobile = previews.mobileTop;
          const isExpanded = expandedUserIds.has(user.id);

          return (
            <div
              key={user.id}
              className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors"
            >
              {/* Main Row */}
              <div className="flex items-center gap-2">
                {/* Rank */}
                <div className="shrink-0">
                  {rankIcon(entry.rank)}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {user.display_name || user.username}
                    </p>
                    {/* Record badges */}
                    <div className="flex items-center gap-1 text-[10px] font-medium">
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        {correctCount}
                      </span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400">
                        <XCircle className="w-2.5 h-2.5" />
                        {incorrectCount}
                      </span>
                      {pendingCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                          {pendingCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Inline Predictions */}
                  {predictions.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {!isExpanded && previewEntries.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          <div className="flex flex-wrap gap-1 sm:hidden">
                            {previewEntriesMobile.map((item, index) => (
                              <PredictionChip key={`preview-mobile-${index}-${item.team}`} entry={item} />
                            ))}
                          </div>
                          <div className="hidden sm:flex sm:flex-wrap sm:gap-1">
                            {previewEntries.map((item, index) => (
                              <PredictionChip key={`preview-${index}-${item.team}`} entry={item} />
                            ))}
                          </div>
                        </div>
                      )}

                      {isExpanded && (breakdown.groupWinners.East.length > 0 || breakdown.groupWinners.West.length > 0) && (
                        <div className="rounded-md bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 px-2 py-2">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Group Winners
                          </div>
                          <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {['East', 'West'].map((conference) => (
                              breakdown.groupWinners[conference].length > 0 && (
                                <div key={conference}>
                                  <div className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
                                    {conference}
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {breakdown.groupWinners[conference].map((item) => (
                                      <PredictionChip key={`${conference}-${item.label}-${item.team}`} entry={item} />
                                    ))}
                                  </div>
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      )}

                      {isExpanded && (breakdown.wildcards.East.length > 0 || breakdown.wildcards.West.length > 0 || breakdown.wildcards.Champion.length > 0) && (
                        <div className="rounded-md bg-slate-100/60 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 px-2 py-2">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Wildcards
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {['East', 'West', 'Champion'].map((conference) => (
                              breakdown.wildcards[conference].map((item) => (
                                <PredictionChip key={`${conference}-wildcard-${item.team}`} entry={item} />
                              ))
                            ))}
                            {breakdown.wildcards.Other.map((item, index) => (
                              <PredictionChip key={`wildcard-other-${index}`} entry={item} />
                            ))}
                          </div>
                        </div>
                      )}

                      {isExpanded && (breakdown.conferenceTitles.East || breakdown.conferenceTitles.West || breakdown.conferenceTitles.Champion) && (
                        <div className="rounded-md bg-slate-100/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-700 px-2 py-2">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Conference & Finals
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {['East', 'West', 'Champion'].map((key) => {
                              const entryObj = breakdown.conferenceTitles[key];
                              if (!entryObj) return null;
                              return (
                                <PredictionChip key={`title-${key}`} entry={entryObj} />
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {isExpanded && breakdown.tiebreakers.length > 0 && (
                        <div className="rounded-md bg-slate-100/40 dark:bg-slate-800/10 border border-slate-200 dark:border-slate-700 px-2 py-2">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Tiebreakers
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {breakdown.tiebreakers.map((item, index) => (
                              <PredictionChip key={`tiebreaker-${index}`} entry={item} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Points */}
                <div className="text-right shrink-0">
                  <p className="text-base font-bold text-teal-600 dark:text-teal-400">
                    {totalPoints.toFixed(1)}
                  </p>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium uppercase">pts</p>
                </div>
              </div>

              {predictions.length > 0 && (
                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(user.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
                  >
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    {isExpanded ? 'Hide breakdown' : 'Show breakdown'}
                  </button>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">
                    {predictions.length} picks
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Load More Button */}
      {visibleCount < users.length && (
        <div className="px-4 py-3 border-t border-slate-200/80 dark:border-slate-700/60 text-center">
          <button
            className="px-5 py-2 border rounded-lg bg-white text-slate-700 border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700 transition-all text-sm font-medium shadow-sm hover:shadow"
            onClick={() => setVisibleCount((prev) => prev + 10)}
          >
            Load More ({visibleCount} of {users.length})
          </button>
        </div>
      )}
    </div>
  );
}

export default ISTUserLeaderboard;
