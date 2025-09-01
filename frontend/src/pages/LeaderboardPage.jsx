/* LeaderboardPage.jsx */
import React, { useMemo, useState } from 'react';
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
      <div className={`group relative overflow-hidden rounded-2xl border ${data?.is_best ? 'border-emerald-400 dark:border-emerald-500' : 'border-slate-200/70 dark:border-slate-700'} bg-white/80 dark:bg-slate-800/60 shadow-xl backdrop-blur-md`}>
        <div className="p-5 space-y-4 relative">
          {data?.is_best && (
            <div className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">Top in category</div>
          )}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 dark:bg-teal-400/10 dark:text-teal-300 dark:border-teal-500/30">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-100">{title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Points {pts} / {max} • {pct}%</p>
            </div>
          </div>
          <ProgressBar value={pts} max={max || 1} size="lg" color="bg-teal-500 dark:bg-teal-400" bgColor="bg-slate-200 dark:bg-slate-700" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium"><CircleCheck className="w-4 h-4" />Right answers</div>
              <ul className="space-y-1.5">
                {rights.length === 0 && <li className="text-xs text-slate-500 dark:text-slate-400">No items yet</li>}
                {rights.map((p, i) => (
                  <li key={`r-${i}`} className="text-xs text-emerald-900 dark:text-emerald-200 bg-emerald-100/80 dark:bg-emerald-400/10 border border-emerald-200/80 dark:border-emerald-500/30 rounded-lg px-2 py-1" title={p.global_correct_rate !== undefined ? `Hard win • only ${(p.global_correct_rate*100).toFixed(0)}% got this right` : undefined}>
                    {(p.question || p.team || '').toString().slice(0, 80)}{(p.question || p.team || '').length > 80 ? '…' : ''}
                    <span className="ml-1 font-semibold">+{p.points ?? 0}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 text-rose-600 dark:text-rose-400 text-xs font-medium"><CircleX className="w-4 h-4" />Wrong answers</div>
              <ul className="space-y-1.5">
                {wrongs.length === 0 && <li className="text-xs text-slate-500 dark:text-slate-400">No items yet</li>}
                {wrongs.map((p, i) => (
                  <li key={`w-${i}`} className="text-xs text-rose-900 dark:text-rose-200 bg-rose-100/80 dark:bg-rose-400/10 border border-rose-200/80 dark:border-rose-500/30 rounded-lg px-2 py-1" title={p.global_correct_rate !== undefined ? `Surprising miss • ${(p.global_correct_rate*100).toFixed(0)}% got this right` : undefined}>
                    {(p.question || p.team || '').toString().slice(0, 80)}{(p.question || p.team || '').length > 80 ? '…' : ''}
                    <span className="ml-1 font-semibold">{p.points ? `+${p.points}` : '+0'}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {detailsHref && (
            <div className="flex items-center justify-end">
              <a href={detailsHref} className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 underline underline-offset-2">Open detailed view</a>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ──────────────────────── Header Section with Title and Metrics Grid */}
        <section>
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 shadow-xl mb-6">
            <div className="relative px-6 py-10 md:px-10 md:py-12">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">NBA Predictions Leaderboard</h1>
                  <p className="mt-2 text-slate-500 dark:text-slate-400">Season {seasonSlug.replace('-', '–')}. Track your rank in real time.</p>
                </div>
                <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-700 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur px-4 py-3 border border-slate-200 dark:border-slate-700">
                  <div className="px-3 text-center">
                    <div className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Players</div>
                    <div className="text-xl font-bold text-teal-600 dark:text-teal-400">{totals.totalPlayers}</div>
                  </div>
                  <div className="px-3 text-center">
                    <div className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Predictions</div>
                    <div className="text-xl font-bold text-teal-600 dark:text-teal-400">{totals.totalPredictions || '—'}</div>
                  </div>
                  <div className="px-3 text-center">
                    <div className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Avg Accuracy</div>
                    <div className="text-xl font-bold text-teal-600 dark:text-teal-400">{totals.avgAccuracy ? `${(totals.avgAccuracy * 100).toFixed(0)}%` : '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Removed duplicate stats cards (players, predictions, accuracy) per request */}
        </section>

        {/* ──────────────────────── Leaderboard Table Section */}
        <section className="bg-white/80 dark:bg-slate-800/70 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl">
          {/* Title */}
          <div className="flex items-center gap-2 p-4 border-b border-slate-200 dark:border-slate-700">
            <Trophy className="w-6 h-6 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Season Leaderboard</h2>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {leaderboardData.slice(0, visibleCount).map((entry) => (
              <div key={entry.user.id} className="bg-white/60 dark:bg-slate-800/50">
                {/* ─── Row (click to expand/collapse) */}
                <button
                  type="button"
                  onClick={() => toggleUserExpansion(entry.user.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-teal-50/60 dark:hover:bg-slate-700/60 transition-colors"
                >
                  {/* Left side (rank, avatar, name) */}
                  <div className="flex items-center gap-4">
                    {rankIcon(entry.rank)}

                    <div className="relative w-10 h-10">
                      {entry.user.avatar ? (
                        <img
                          src={entry.user.avatar}
                          alt={`${entry.user.display_name || entry.user.username} avatar`}
                          className="w-full h-full rounded-full object-cover border border-slate-300 dark:border-slate-600"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      ) : (
                        <div className="w-full h-full rounded-full border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {(entry.user.display_name || entry.user.username)
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800 dark:text-slate-100">
                          {entry.user.display_name || entry.user.username}
                        </p>
                        {Array.isArray(entry.user.badges) && entry.user.badges.slice(0,3).map((b, i) => (
                          <span key={i} title={b.type === 'category_best' ? `Top in ${b.category}` : ''} className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                            {b.category?.split(' ')[0] || 'Best'}
                          </span>
                        ))}
                      </div>
                      {/* Per-row accuracy removed by request (keep per-category only) */}
                    </div>
                  </div>

                  {/* Right side (totals, category bars, chevron) */}
                  <div className="flex items-center gap-6">
                    {/* Points */}
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-800 dark:text-white">
                        {entry.user.total_points.toLocaleString()}
                      </p>
                      <p className="text-sm text-slate-400 dark:text-slate-400">Total Points</p>
                    </div>

                    {/* Small progress bars for each category */}
                    <div className="hidden md:flex items-center gap-4">
                      {Object.entries(entry.user.categories).map(([category, data]) => (
                        <div key={category} className="text-center min-w-[90px]">
                          <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                            {category.replace('Regular Season ', 'Reg. ')}
                          </p>
                          <ProgressBar value={data.points} max={data.max_points} size="sm" color="bg-teal-500" bgColor="bg-slate-200 dark:bg-slate-700" />
                          <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">{data.points}/{data.max_points}</p>
                        </div>
                      ))}
                    </div>

                    {/* Expand / collapse icon */}
                    {expandedUsers.has(entry.user.id) ? (
                      <ChevronUp className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                    )}
                  </div>
                </button>

                {/* ─── Expanded details */}
                {expandedUsers.has(entry.user.id) && (
                  <div className="px-4 pb-6">
                    <div className="grid gap-4 lg:grid-cols-3">
                      <CategoryCard icon={BarChart3} title="Regular Season Standings" userId={entry.user.id} data={getCategory(entry, 'Regular Season Standings')} detailsHref={`/page-detail/${seasonSlug}/?section=standings&user=${entry.user.id}`} />
                      <CategoryCard icon={Award} title="Player Awards" userId={entry.user.id} data={getCategory(entry, 'Player Awards')} detailsHref={`/page-detail/${seasonSlug}/?section=awards&user=${entry.user.id}`} />
                      <CategoryCard icon={ListChecks} title="Props & Yes/No" userId={entry.user.id} data={getCategory(entry, 'Props & Yes/No')} detailsHref={`/page-detail/${seasonSlug}/?section=props&user=${entry.user.id}`} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ──────────────────────── Load More */}
        {visibleCount < leaderboardData.length && (
          <div className="text-center mt-6 mb-8">
            <button
              className="px-4 py-2 border rounded-lg bg-white text-slate-700 border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700 transition-colors"
              onClick={() => setVisibleCount((prevCount) => prevCount + 20)} // Show 20 more players when clicked
            >
              Load More Players ({visibleCount} of {leaderboardData.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default LeaderboardPage;