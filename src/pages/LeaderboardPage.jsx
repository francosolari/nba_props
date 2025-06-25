/* LeaderboardPage.jsx */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  /* ‣ Set of expanded user‑IDs to keep multiple rows open at once. */
  const [expandedUsers, setExpandedUsers] = useState(new Set());

  // Function to fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        // Replace 'current' with a dynamic season slug if needed, e.g., from props or route params
        const response = await axios.get('/api/v2/leaderboard/current');
        // The API returns {'top_users': [...]}
        setLeaderboardData(response.data.top_users);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError('Failed to load leaderboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []); // Empty dependency array means this effect runs once on mount

  const toggleUserExpansion = (userId) => {
    const next = new Set(expandedUsers);
    next.has(userId) ? next.delete(userId) : next.add(userId);
    setExpandedUsers(next);
  };

  /* ‣ Render a little badge or icon for 1st‑3rd place. */
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

  if (loading) {
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
        {/* ──────────────────────── Header */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-800">NBA Predictions Leaderboard</h1>
          <p className="text-lg text-slate-300">
            Track your predictions and compete with other fans
          </p>

          {/* ─── Stats Cards (You might want to fetch these from API too) */}
          <section className="grid grid-cols-1 gap-4 mt-8 md:grid-cols-3">
            {/* Players */}
            <div className="bg-gradient-to-br from-white/80 to-indigo-100/80 backdrop-blur-md border border-gray-200 p-6 text-center rounded-xl shadow-lg">
              <Users className="w-8 h-8 mx-auto mb-2 text-blue-400" />
              <p className="text-2xl font-bold text-indigo-600">{leaderboardData.length}</p>
              <p className="text-slate-400">Total Players</p>
            </div>
            {/* Predictions (Placeholder) */}
            <div className="bg-gradient-to-br from-white/80 to-indigo-100/80 backdrop-blur-md border border-gray-200 p-6 text-center rounded-xl shadow-lg">
              <Target className="w-8 h-8 mx-auto mb-2 text-green-400" />
              <p className="text-2xl font-bold text-indigo-600">N/A</p> {/* Needs API */}
              <p className="text-slate-400">Total Predictions</p>
            </div>
            {/* Accuracy (Placeholder) */}
            <div className="bg-gradient-to-br from-white/80 to-indigo-100/80 backdrop-blur-md border border-gray-200 p-6 text-center rounded-xl shadow-lg">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-purple-400" />
              <p className="text-2xl font-bold text-indigo-600">N/A</p> {/* Needs API */}
              <p className="text-slate-400">Avg Accuracy</p>
            </div>
          </section>
        </header>

        {/* ──────────────────────── Leaderboard */}
        <section className="bg-white/70 border border-gray-200 rounded-xl shadow-lg">
          {/* Title */}
          <div className="flex items-center gap-2 p-4 border-b border-gray-200">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <h2 className="text-lg font-semibold text-gray-800">Season Leaderboard</h2>
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-200">
            {leaderboardData.map((entry, index) => (
              <div key={entry.user.id} className="bg-white/60">
                {/* ─── Collapsed row */}
                <button
                  type="button"
                  onClick={() => toggleUserExpansion(entry.user.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-indigo-50 transition-colors"
                >
                  {/* Left side (rank, avatar, name) */}
                  <div className="flex items-center gap-4">
                    {rankIcon(index + 1)} {/* Rank based on index */}
                    <div className="relative w-10 h-10">
                      <img
                        src="/placeholder.svg?height=40&width=40" // Placeholder for now
                        alt={`${entry.user.display_name} avatar`}
                        className="w-full h-full rounded-full object-cover border border-slate-600"
                        onError={(e) => (e.target.style.display = 'none')}
                      />
                      <span className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-gray-800">
                        {entry.user.display_name ? entry.user.display_name.slice(0, 2).toUpperCase() : '??'}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{entry.user.display_name || entry.user.username}</p>
                      <p className="text-sm text-slate-400">Accuracy: N/A</p> {/* Needs API */}
                    </div>
                  </div>

                  {/* Right side (totals, category bars, chevron) */}
                  <div className="flex items-center gap-6">
                    {/* Points */}
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-800">
                        {entry.points*1000}
                      </p>
                      <p className="text-sm text-slate-400">Total Points</p>
                    </div>

                    {/* Small progress bars for each category (Placeholder for now) */}
                    <div className="flex items-center gap-2">
                      {/* You'll need to extend your API to provide this data */}
                      {/*
                      {Object.entries(user.categories).map(([cat, data]) => {
                        const pct = (data.points / data.maxPoints) * 100
                        return (
                          <div key={cat} className="text-center">
                            <p className="mb-1 text-xs text-slate-400">
                              {cat.split(' ')[0]}
                            </p>
                            <div className="w-12 h-2 rounded-full bg-gray-200 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-pink-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <p className="mt-1 text-xs text-black">{data.points}</p>
                          </div>
                        )
                      })}
                      */}
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
                      <p className="text-gray-500 col-span-3">Detailed prediction breakdown not available yet.</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ──────────────────────── Load More (placeholder) */}
        <div className="text-center">
          <button className="px-4 py-2 border rounded-lg bg-slate-800 text-white border-slate-600 hover:bg-slate-700">
            Load More Players
          </button>
        </div>
      </div>
    </div>
  );
}

export default LeaderboardPage;