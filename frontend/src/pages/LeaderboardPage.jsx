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
      <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-black">
        {rank}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-fuchsia-100 p-6 flex items-center justify-center">
        <div className="w-full max-w-3xl animate-pulse space-y-6">
          <div className="h-10 bg-white/70 rounded-xl" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-white/60 rounded-xl shadow-sm" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-fuchsia-100 p-6 flex items-center justify-center">
        <div className="bg-white/80 border border-rose-200 rounded-xl shadow-lg p-6">
          <p className="text-lg text-rose-600 font-semibold">{String(error)}</p>
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

  const CategoryCard = ({ icon: Icon, title, data, detailsHref }) => {
    const pts = data?.points || 0;
    const max = data?.max_points || 0;
    const pct = max > 0 ? Math.round((pts / max) * 100) : 0;
    const { rights, wrongs } = getSamples(data?.predictions, data?.interesting);
    return (
      <div className={`group relative overflow-hidden rounded-2xl border ${data?.is_best ? 'border-emerald-300' : 'border-slate-200/70'} bg-gradient-to-br from-white/80 to-white/40 shadow-xl backdrop-blur-md`}>
        <div className="absolute -top-10 -right-10 h-32 w-32 rotate-12 bg-gradient-to-tr from-indigo-100 to-fuchsia-100 rounded-full blur-2xl opacity-70" />
        <div className="p-5 space-y-4 relative">
          {data?.is_best && (
            <div className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">Top in category</div>
          )}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-slate-700">{title}</h3>
              <p className="text-xs text-slate-400">Points {pts} / {max} • {pct}%</p>
            </div>
          </div>
          <ProgressBar value={pts} max={max || 1} size="lg" color="bg-gradient-to-r from-sky-500 to-emerald-500" bgColor="bg-slate-200" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1 text-emerald-600 text-xs font-medium"><CircleCheck className="w-4 h-4" />Right answers</div>
              <ul className="space-y-1.5">
                {rights.length === 0 && <li className="text-xs text-slate-400">No items yet</li>}
                {rights.map((p, i) => (
                  <li key={`r-${i}`} className="text-xs text-slate-600 bg-emerald-50/80 border border-emerald-100 rounded-lg px-2 py-1" title={p.global_correct_rate !== undefined ? `Hard win • only ${(p.global_correct_rate*100).toFixed(0)}% got this right` : undefined}>
                    {(p.question || p.team || '').toString().slice(0, 80)}{(p.question || p.team || '').length > 80 ? '…' : ''}
                    <span className="ml-1 text-emerald-700 font-semibold">+{p.points ?? 0}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 text-rose-600 text-xs font-medium"><CircleX className="w-4 h-4" />Wrong answers</div>
              <ul className="space-y-1.5">
                {wrongs.length === 0 && <li className="text-xs text-slate-400">No items yet</li>}
                {wrongs.map((p, i) => (
                  <li key={`w-${i}`} className="text-xs text-slate-600 bg-rose-50/80 border border-rose-100 rounded-lg px-2 py-1" title={p.global_correct_rate !== undefined ? `Surprising miss • ${(p.global_correct_rate*100).toFixed(0)}% got this right` : undefined}>
                    {(p.question || p.team || '').toString().slice(0, 80)}{(p.question || p.team || '').length > 80 ? '…' : ''}
                    <span className="ml-1 text-rose-700 font-semibold">{p.points ? `+${p.points}` : '+0'}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {detailsHref && (
            <div className="flex items-center justify-end">
              <a href={detailsHref} className="text-xs text-slate-600 hover:text-slate-900 underline underline-offset-2">Open detailed view</a>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-emerald-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ──────────────────────── Header Section with Title and Metrics Grid */}
        <section>
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/70 shadow-2xl mb-6">
            <div className="absolute inset-0 bg-[radial-gradient(40%_60%_at_0%_0%,rgba(56,189,248,0.12),transparent_60%),radial-gradient(40%_60%_at_100%_0%,rgba(16,185,129,0.12),transparent_60%)]" />
            <div className="relative px-6 py-10 md:px-10 md:py-12">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-800">NBA Predictions Leaderboard</h1>
                  <p className="mt-2 text-slate-500">Season {seasonSlug.replace('-', '–')}. Track your rank in real time.</p>
                </div>
                <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-2xl bg-white/60 backdrop-blur px-4 py-3 border border-slate-200">
                  <div className="px-3 text-center">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Players</div>
                    <div className="text-xl font-bold text-indigo-600">{totals.totalPlayers}</div>
                  </div>
                  <div className="px-3 text-center">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Predictions</div>
                    <div className="text-xl font-bold text-indigo-600">{totals.totalPredictions || '—'}</div>
                  </div>
                  <div className="px-3 text-center">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Avg Accuracy</div>
                    <div className="text-xl font-bold text-indigo-600">{totals.avgAccuracy ? `${(totals.avgAccuracy * 100).toFixed(0)}%` : '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Stats Cards Grid - Stacks on mobile, grid on ≥md */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Players Card */}
            <div className="bg-gradient-to-br from-white/80 to-indigo-100/80 backdrop-blur-md border border-gray-200 p-6 text-center rounded-xl shadow-lg">
              <Users className="w-8 h-8 mx-auto mb-2 text-blue-400" />
              <p className="text-2xl font-bold text-indigo-600">{totals.totalPlayers}</p>
              <p className="text-slate-400">Total Players</p>
            </div>
            {/* Predictions Card */}
            <div className="bg-gradient-to-br from-white/80 to-indigo-100/80 backdrop-blur-md border border-gray-200 p-6 text-center rounded-xl shadow-lg">
              <Target className="w-8 h-8 mx-auto mb-2 text-green-400" />
              <p className="text-2xl font-bold text-indigo-600">
                {totals.totalPredictions || 'N/A'}
              </p>
              <p className="text-slate-400">Total Predictions</p>
            </div>
            {/* Accuracy Card */}
            <div className="bg-gradient-to-br from-white/80 to-indigo-100/80 backdrop-blur-md border border-gray-200 p-6 text-center rounded-xl shadow-lg">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-purple-400" />
              <p className="text-2xl font-bold text-indigo-600">{totals.avgAccuracy ? `${(totals.avgAccuracy * 100).toFixed(1)}%` : 'N/A'}</p>
              <p className="text-slate-400">Avg Accuracy</p>
            </div>
          </div>
        </section>

        {/* ──────────────────────── Leaderboard Table Section */}
        <section className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-xl">
          {/* Title */}
          <div className="flex items-center gap-2 p-4 border-b border-slate-200">
            <Trophy className="w-6 h-6 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-800">Season Leaderboard</h2>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-200">
            {leaderboardData.slice(0, visibleCount).map((entry) => (
              <div key={entry.user.id} className="bg-white/60">
                {/* ─── Row (click to expand/collapse) */}
                <button
                  type="button"
                  onClick={() => toggleUserExpansion(entry.user.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-indigo-50/60 transition-colors"
                >
                  {/* Left side (rank, avatar, name) */}
                  <div className="flex items-center gap-4">
                    {rankIcon(entry.rank)}

                    <div className="relative w-10 h-10">
                      <img
                        src={entry.user.avatar || '/placeholder.svg?height=40&width=40'}
                        alt={`${entry.user.display_name || entry.user.username} avatar`}
                        className="w-full h-full rounded-full object-cover border border-slate-600"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                      <span className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-gray-800">
                        {(entry.user.display_name || entry.user.username)
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800">
                          {entry.user.display_name || entry.user.username}
                        </p>
                        {Array.isArray(entry.user.badges) && entry.user.badges.slice(0,3).map((b, i) => (
                          <span key={i} title={b.type === 'category_best' ? `Top in ${b.category}` : ''} className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
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
                      <p className="text-2xl font-bold text-gray-800">
                        {entry.user.total_points.toLocaleString()}
                      </p>
                      <p className="text-sm text-slate-400">Total Points</p>
                    </div>

                    {/* Small progress bars for each category */}
                    <div className="hidden md:flex items-center gap-4">
                      {Object.entries(entry.user.categories).map(([category, data]) => (
                        <div key={category} className="text-center min-w-[90px]">
                          <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">
                            {category.replace('Regular Season ', 'Reg. ')}
                          </p>
                          <ProgressBar value={data.points} max={data.max_points} size="sm" color="bg-indigo-500" bgColor="bg-slate-200" />
                          <p className="mt-1 text-[11px] text-slate-600">{data.points}/{data.max_points}</p>
                        </div>
                      ))}
                    </div>

                    {/* Expand / collapse icon */}
                    {expandedUsers.has(entry.user.id) ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* ─── Expanded details */}
                {expandedUsers.has(entry.user.id) && (
                  <div className="px-4 pb-6">
                    <div className="grid gap-4 lg:grid-cols-3">
                      <CategoryCard icon={BarChart3} title="Regular Season Standings" data={getCategory(entry, 'Regular Season Standings')} detailsHref={`/page-detail/${seasonSlug}/?section=standings&user=${entry.user.id}`} />
                      <CategoryCard icon={Award} title="Player Awards" data={getCategory(entry, 'Player Awards')} detailsHref={`/page-detail/${seasonSlug}/?section=awards&user=${entry.user.id}`} />
                      <CategoryCard icon={ListChecks} title="Props & Yes/No" data={getCategory(entry, 'Props & Yes/No')} detailsHref={`/page-detail/${seasonSlug}/?section=props&user=${entry.user.id}`} />
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
              className="px-4 py-2 border rounded-lg bg-slate-800 text-white border-slate-600 hover:bg-slate-700 transition-colors"
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
