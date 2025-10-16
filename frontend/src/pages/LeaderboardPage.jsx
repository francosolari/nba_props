/* LeaderboardPage.jsx */
import React, { useMemo, useState, useEffect } from 'react';
import useLeaderboard from '../hooks/useLeaderboard';
import ProgressBar from '../components/ProgressBar';
import {
  ChevronDown,
  ChevronUp,
  Trophy,
  TrendingUp,
  Target,
  Award,
  Users,
  Star,
  BarChart3,
  ListChecks,
  CircleCheck,
  CircleX,
  ArrowRight,
} from 'lucide-react';

/* Map category names ➜ an icon component. */
const categoryIcons = {
  'Regular Season Standings': Trophy,
  'Player Awards': Award,
  'Props & Yes/No': Target,
};

function LeaderboardPage({ seasonSlug = 'current' }) {
  // Use our custom hook to fetch and process leaderboard data
  const { data: leaderboardData, error, isLoading, totals } = useLeaderboard(seasonSlug);

  /* ‣ Set of expanded user-IDs to keep multiple rows open at once. */
  const [expandedUsers, setExpandedUsers] = useState(new Set());

  /* ‣ Control how many players are visible (for client-side pagination) */
  const [visibleCount, setVisibleCount] = useState(20); // Default to showing 20 players initially

  const toggleUserExpansion = (userId) => {
    const next = new Set(expandedUsers);
    next.has(userId) ? next.delete(userId) : next.add(userId);
    setExpandedUsers(next);
  };

  /* ‣ Render a little badge or icon for 1st-3rd place. */
  const rankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Star className="w-5 h-5 text-slate-300" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-500" />;
    return (
      <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-black dark:text-white">
        {rank}
      </span>
    );
  };

  if (isLoading) {
    return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 flex items-center justify-center">
        <div className="w-full max-w-3xl animate-pulse space-y-6">
          <div className="h-10 bg-slate-200/70 dark:bg-slate-800/70 rounded-xl" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl shadow-sm" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 flex items-center justify-center">
        <div className="bg-white/80 dark:bg-slate-800/80 border border-rose-200 dark:border-rose-500/30 rounded-xl shadow-lg p-6">
          <p className="text-lg text-rose-600 dark:text-rose-400 font-semibold">{String(error)}</p>
        </div>
      </div>
    );
  }

  // Helpers for expanded cards
  const getCategory = (entry, key) => {
    const cats = entry?.user?.categories || entry?.categories || {};
    return cats?.[key] || { points: 0, max_points: 0, predictions: [] };
  };

  const getSamples = (predictions = [], interesting) => {
    // Prefer curated interesting picks from backend
    if (interesting && (interesting.hard_wins?.length || interesting.easy_misses?.length)) {
      const rights = interesting.hard_wins?.slice(0, 3) || [];
      const wrongs = interesting.easy_misses?.slice(0, 3) || [];
      return { rights, wrongs };
    }
    // Fallback to random sampling
    if (!Array.isArray(predictions)) return { rights: [], wrongs: [] };
    const withFlags = predictions.map(p => ({
      ...p,
      _isRight: typeof p.correct === 'boolean' ? p.correct : (typeof p.points === 'number' && p.points > 0),
    }));
    const rights = withFlags.filter(p => p._isRight);
    const wrongs = withFlags.filter(p => p._isRight === false);
    const pick = (arr, n) => arr.sort(() => Math.random() - 0.5).slice(0, n);
    return { rights: pick(rights, 3), wrongs: pick(wrongs, 3) };
  };

  const CategoryCard = ({ icon: Icon, title, data, detailsHref, userId }) => {
    const pts = data?.points || 0;
    const max = data?.max_points || 0;
    const pct = max > 0 ? Math.round((pts / max) * 100) : 0;
    // Stable sampling per user+category to avoid changing lists across re-renders
    const { rights, wrongs } = React.useMemo(() => {
      if (data?.interesting && (data.interesting.hard_wins?.length || data.interesting.easy_misses?.length)) {
        return {
          rights: (data.interesting.hard_wins || []).slice(0, 3),
          wrongs: (data.interesting.easy_misses || []).slice(0, 3),
        };
      }
      const predictions = Array.isArray(data?.predictions) ? data.predictions : [];
      const withFlags = predictions.map(p => ({
        ...p,
        _isRight: typeof p.correct === 'boolean' ? p.correct : (typeof p.points === 'number' && p.points > 0),
      }));
      const r = withFlags.filter(p => p._isRight);
      const w = withFlags.filter(p => p._isRight === false);
      // Simple seeded pick based on userId + title
      const seedStr = String(userId || '') + '|' + String(title || '');
      let seed = 0; for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
      const pickN = (arr, n) => {
        const out = [];
        if (!arr.length) return out;
        let s = seed ^ (n * 2654435761 >>> 0);
        for (let i = 0; i < Math.min(n, arr.length); i++) {
          s = (s * 1664525 + 1013904223) >>> 0; // LCG
          const idx = s % arr.length;
          out.push(arr[idx]);
        }
        return out;
      };
      return { rights: pickN(r, 3), wrongs: pickN(w, 3) };
    }, [data?.predictions, data?.interesting, userId, title]);
    return (
      <div className={`group relative overflow-hidden rounded-xl border ${data?.is_best ? 'border-emerald-400/60 dark:border-emerald-500/50 shadow-emerald-100/50 dark:shadow-emerald-900/30' : 'border-slate-200/70 dark:border-slate-700/50'} bg-white/90 dark:bg-slate-800/70 shadow-md backdrop-blur-sm transition-shadow hover:shadow-lg`}>
        <div className="p-4 space-y-3 relative">
          {data?.is_best && (
            <div className="absolute top-2 right-2 text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">Top</div>
          )}
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-gradient-to-br from-teal-50 to-teal-100/50 text-teal-600 border border-teal-200/60 dark:from-teal-400/10 dark:to-teal-500/5 dark:text-teal-300 dark:border-teal-500/30">
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{title}</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-0.5">{pts} / {max} pts • {pct}%</p>
            </div>
          </div>
          <ProgressBar value={pts} max={max || 1} size="md" color="bg-gradient-to-r from-teal-500 to-teal-600 dark:from-teal-400 dark:to-teal-500" bgColor="bg-slate-200 dark:bg-slate-700" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold"><CircleCheck className="w-3.5 h-3.5" />Correct</div>
              <ul className="space-y-1">
                {rights.length === 0 && <li className="text-[11px] text-slate-500 dark:text-slate-400 italic">None yet</li>}
                {rights.map((p, i) => (
                  <li key={`r-${i}`} className="text-[11px] text-emerald-900 dark:text-emerald-100 bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/30 rounded-md px-2 py-1 leading-tight" title={p.global_correct_rate !== undefined ? `Hard win • only ${(p.global_correct_rate*100).toFixed(0)}% got this right` : undefined}>
                    {(p.question || p.team || '').toString().slice(0, 60)}{(p.question || p.team || '').length > 60 ? '…' : ''}
                    <span className="ml-1 font-bold">+{p.points ?? 0}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1.5 text-rose-600 dark:text-rose-400 text-[11px] font-bold"><CircleX className="w-3.5 h-3.5" />Missed</div>
              <ul className="space-y-1">
                {wrongs.length === 0 && <li className="text-[11px] text-slate-500 dark:text-slate-400 italic">None yet</li>}
                {wrongs.map((p, i) => (
                  <li key={`w-${i}`} className="text-[11px] text-rose-900 dark:text-rose-100 bg-rose-50/80 dark:bg-rose-500/10 border border-rose-200/60 dark:border-rose-500/30 rounded-md px-2 py-1 leading-tight" title={p.global_correct_rate !== undefined ? `Surprising miss • ${(p.global_correct_rate*100).toFixed(0)}% got this right` : undefined}>
                    {(p.question || p.team || '').toString().slice(0, 60)}{(p.question || p.team || '').length > 60 ? '…' : ''}
                    <span className="ml-1 font-bold">{p.points ? `+${p.points}` : '0'}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {detailsHref && (
            <div className="flex items-center justify-end pt-1">
              <a href={detailsHref} className="text-[11px] text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 underline underline-offset-2 font-medium transition-colors">View details</a>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-3 md:p-6">
        <div className="max-w-7xl mx-auto space-y-4">
        {/* ──────────────────────── Header Section with Title and Metrics Grid */}
        <section>
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-700/50 bg-gradient-to-br from-white via-white to-slate-50/30 dark:from-slate-800/90 dark:via-slate-800/80 dark:to-slate-900/50 shadow-lg backdrop-blur-sm mb-4">
            <div className="relative px-4 py-6 md:px-8 md:py-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">NBA Predictions Leaderboard</h1>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Season {seasonSlug.replace('-', '–')} • Live rankings</p>
                  <a
                    href={`/leaderboard/${seasonSlug}/detailed/`}
                    className="mt-2 inline-flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 font-medium transition-colors"
                  >
                    See points breakdown
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
                <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-700/60 rounded-xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-900/40 backdrop-blur px-3 py-2.5 border border-slate-200/60 dark:border-slate-700/40 shadow-sm">
                  <div className="px-2.5 text-center">
                    <div className="text-[10px] uppercase tracking-wider font-medium text-slate-500 dark:text-slate-400">Players</div>
                    <div className="text-lg font-bold text-teal-600 dark:text-teal-400 mt-0.5">{totals.totalPlayers}</div>
                  </div>
                  <div className="px-2.5 text-center">
                    <div className="text-[10px] uppercase tracking-wider font-medium text-slate-500 dark:text-slate-400">Predictions</div>
                    <div className="text-lg font-bold text-teal-600 dark:text-teal-400 mt-0.5">{totals.totalPredictions || '—'}</div>
                  </div>
                  <div className="px-2.5 text-center">
                    <div className="text-[10px] uppercase tracking-wider font-medium text-slate-500 dark:text-slate-400">Accuracy</div>
                    <div className="text-lg font-bold text-teal-600 dark:text-teal-400 mt-0.5">{totals.avgAccuracy ? `${(totals.avgAccuracy * 100).toFixed(0)}%` : '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ──────────────────────── Leaderboard Table Section */}
        <section className="bg-white/90 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/50 rounded-xl shadow-lg">
          {/* Title */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200/80 dark:border-slate-700/60">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Rankings</h2>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100 dark:divide-slate-700/40">
            {leaderboardData.slice(0, visibleCount).map((entry) => (
              <div key={entry.user.id} className="bg-white/60 dark:bg-slate-800/40 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
                {/* ─── Row (click to expand/collapse) */}
                <button
                  type="button"
                  onClick={() => toggleUserExpansion(entry.user.id)}
                  className="w-full px-3 py-3 md:px-4 md:py-3.5 flex items-center justify-between transition-colors"
                >
                  {/* Left side (rank, avatar, name) */}
                  <div className="flex items-center gap-3">
                    {rankIcon(entry.rank)}

                    <div className="relative w-9 h-9">
                      {entry.user.avatar ? (
                        <img
                          src={entry.user.avatar}
                          alt={`${entry.user.display_name || entry.user.username} avatar`}
                          className="w-full h-full rounded-full object-cover border-2 border-slate-200 dark:border-slate-600"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      ) : (
                        <div className="w-full h-full rounded-full border-2 border-slate-200 dark:border-slate-600 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {(entry.user.display_name || entry.user.username)
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-[15px] text-slate-900 dark:text-white">
                          {entry.user.display_name || entry.user.username}
                        </p>
                        {Array.isArray(entry.user.badges) && entry.user.badges.slice(0,3).map((b, i) => (
                          <span key={i} title={b.type === 'category_best' ? `Top in ${b.category}` : ''} className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                            {b.category?.split(' ')[0] || 'Best'}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right side (totals, category bars, chevron) */}
                  <div className="flex items-center gap-4 md:gap-6">
                    {/* Points */}
                    <div className="text-right">
                      <p className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
                        {entry.user.total_points.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">pts</p>
                    </div>

                    {/* Small progress bars for each category */}
                    <div className="hidden md:flex items-center gap-3">
                      {Object.entries(entry.user.categories).map(([category, data]) => (
                        <div key={category} className="text-center min-w-[80px]">
                          <p className="mb-1 text-[9px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                            {category.replace('Regular Season ', 'Reg. ')}
                          </p>
                          <ProgressBar value={data.points} max={data.max_points} size="sm" color="bg-teal-500" bgColor="bg-slate-200 dark:bg-slate-700" />
                          <p className="mt-1 text-[10px] text-slate-600 dark:text-slate-300 font-medium">{data.points}/{data.max_points}</p>
                        </div>
                      ))}
                    </div>

                    {/* Expand / collapse icon */}
                    {expandedUsers.has(entry.user.id) ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    )}
                  </div>
                </button>

                {/* ─── Expanded details */}
                {expandedUsers.has(entry.user.id) && (
                  <div className="px-3 pb-4 md:px-4 md:pb-5 bg-gradient-to-br from-slate-50/50 to-white dark:from-slate-800/30 dark:to-slate-900/20">
                    <div className="grid gap-3 lg:grid-cols-3">
                      <CategoryCard icon={BarChart3} title="Regular Season Standings" userId={entry.user.id} data={getCategory(entry, 'Regular Season Standings')} detailsHref={`/leaderboard/${seasonSlug}/detailed/?section=standings&user=${entry.user.id}`} />
                      <CategoryCard icon={Award} title="Player Awards" userId={entry.user.id} data={getCategory(entry, 'Player Awards')} detailsHref={`/leaderboard/${seasonSlug}/detailed/?section=awards&user=${entry.user.id}`} />
                      <CategoryCard icon={ListChecks} title="Props & Yes/No" userId={entry.user.id} data={getCategory(entry, 'Props & Yes/No')} detailsHref={`/leaderboard/${seasonSlug}/detailed/?section=props&user=${entry.user.id}`} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ──────────────────────── Load More */}
        {visibleCount < leaderboardData.length && (
          <div className="text-center mt-4 mb-6">
            <button
              className="px-5 py-2 border rounded-lg bg-white text-slate-700 border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700 transition-all text-sm font-medium shadow-sm hover:shadow"
              onClick={() => setVisibleCount((prevCount) => prevCount + 20)}
            >
              Load More ({visibleCount} of {leaderboardData.length})
            </button>
          </div>
        )}
        </div>
      </div>
  );
}

export default LeaderboardPage;