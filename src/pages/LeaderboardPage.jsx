/* LeaderboardPage.jsx */
import React, { useState } from 'react';
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
} from 'lucide-react';

/* Map category names ➜ an icon component. */
const categoryIcons = {
  'Regular Season Standings': Trophy,
  'Player Awards': Award,
  'Props & Yes/No': Target,
};

function LeaderboardPage() {
  // Use our custom hook to fetch and process leaderboard data
  const { data: leaderboardData, error, isLoading, totals } = useLeaderboard('current');

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
      <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50 to-red-100 p-4 flex items-center justify-center">
        <p className="text-xl text-gray-700">Loading leaderboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50 to-red-100 p-4 flex items-center justify-center">
        <p className="text-xl text-red-600">{error}</p>
      </div>
    );
  }

  // NOTE: The mock data had more detailed category predictions.
  // The current API only returns total points per user.
  // You would need to extend the API to return more detailed prediction breakdown per user
  // if you want to populate the expanded sections with real data.
  // For now, the expanded section will show placeholder data or be hidden.

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50 to-red-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ──────────────────────── Header Section with Title and Metrics Grid */}
        <section>
          <header className="text-center space-y-4 mb-6">
            <h1 className="text-4xl font-bold text-gray-800">NBA Predictions Leaderboard</h1>
            <p className="text-lg text-slate-400">
              Track your predictions and compete with other fans
            </p>
          </header>

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
              <p className="text-2xl font-bold text-indigo-600">
                {totals.avgAccuracy ? `${(totals.avgAccuracy * 100).toFixed(1)}%` : 'N/A'}
              </p>
              <p className="text-slate-400">Avg Accuracy</p>
            </div>
          </div>
        </section>

        {/* ──────────────────────── Leaderboard Table Section */}
        <section className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg">
          {/* Title */}
          <div className="flex items-center gap-2 p-4 border-b border-gray-200">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <h2 className="text-lg font-semibold text-gray-800">Season Leaderboard</h2>
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-200">
            {leaderboardData.slice(0, visibleCount).map((entry) => (
              <div key={entry.user.id} className="bg-white/60">
                {/* ─── Row (click to expand/collapse) */}
                <button
                  type="button"
                  onClick={() => toggleUserExpansion(entry.user.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-indigo-50 transition-colors"
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
                      <p className="font-semibold text-gray-800">
                        {entry.user.display_name || entry.user.username}
                      </p>
                      <p className="text-sm text-slate-400">
                        Accuracy:{' '}
                        {entry.user.accuracy !== undefined
                          ? `${entry.user.accuracy}%`
                          : '—%'}
                      </p>
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
                    <div className="flex items-center gap-2">
                      {Object.entries(entry.user.categories).map(([category, data]) => (
                        <div key={category} className="text-center">
                          <p className="mb-1 text-xs text-slate-400">
                            {category.split(' ')[0]}
                          </p>
                          <ProgressBar
                            value={data.points}
                            max={data.max_points}
                            size="sm"
                            color="bg-blue-500"
                            bgColor="bg-gray-200"
                          />
                          <p className="mt-1 text-xs text-black">{data.points}</p>
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

                {/* ─── Expanded details (Placeholder for now) */}
                {expandedUsers.has(entry.user.id) && (
                  <div className="px-4 pb-4">
                    <div className="grid gap-4 lg:grid-cols-3">
                      {/* You'll need to extend your API to provide this data */}
                      <p className="text-gray-500 col-span-3">
                        Detailed prediction breakdown not available yet.
                      </p>
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