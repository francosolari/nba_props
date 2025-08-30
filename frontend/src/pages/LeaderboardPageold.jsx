/* LeaderboardPage.jsx */
import React, { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Trophy,
  TrendingUp,
  Target,
  Award,
  Users,
  Star,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/* 1 ▸ Replace the array below with data you pull from Django’s REST   */
/*    endpoint, GraphQL query, or even a Django‑rendered JSON script.  */
/* ------------------------------------------------------------------ */
const leaderboardData = [
  {
    id: 1,
    rank: 1,
    username: 'CourtVision23',
    avatar: '/placeholder.svg?height=40&width=40',
    totalPoints: 2847,
    accuracy: 78,
    categories: {
      'Regular Season Standings': {
        points: 890,
        maxPoints: 1200,
        predictions: [
          { question: 'Lakers will finish top 4 in West', correct: true, points: 150 },
          { question: 'Celtics will win Atlantic Division', correct: true, points: 120 },
          { question: 'Warriors miss playoffs', correct: false, points: 0 },
          { question: 'Nuggets finish 1st seed', correct: true, points: 200 },
          { question: 'Wolves finish 4th seed', correct: false, points: 140 },
        ],
      },
      'Player Awards': {
        points: 720,
        maxPoints: 900,
        predictions: [
          { question: 'Jokic wins MVP', correct: true, points: 300 },
          { question: 'Wembanyama wins ROTY', correct: true, points: 250 },
          { question: 'Smart wins DPOY', correct: false, points: 0 },
        ],
      },
      'Props & Yes/No': {
        points: 1237,
        maxPoints: 1500,
        predictions: [
          { question: 'LeBron averages 25+ PPG', correct: true, points: 100 },
          { question: 'Curry makes 300+ threes', correct: true, points: 150 },
          { question: 'Giannis plays 70+ games', correct: false, points: 0 },
          { question: 'Tatum scores 50+ in a game', correct: true, points: 120 },
        ],
      },
    },
  },
  {
    id: 2,
    rank: 2,
    username: 'HoopsMaster',
    avatar: '/placeholder.svg?height=40&width=40',
    totalPoints: 2756,
    accuracy: 74,
    categories: {
      'Regular Season Standings': {
        points: 1050,
        maxPoints: 1200,
        predictions: [
          { question: 'Lakers will finish top 4 in West', correct: true, points: 150 },
          { question: 'Celtics will win Atlantic Division', correct: true, points: 120 },
          { question: 'Warriors miss playoffs', correct: true, points: 180 },
          { question: 'Nuggets finish 1st seed', correct: false, points: 0 },
        ],
      },
      'Player Awards': {
        points: 550,
        maxPoints: 900,
        predictions: [
          { question: 'Jokic wins MVP', correct: false, points: 0 },
          { question: 'Wembanyama wins ROTY', correct: true, points: 250 },
          { question: 'Smart wins DPOY', correct: true, points: 300 },
        ],
      },
      'Props & Yes/No': {
        points: 1156,
        maxPoints: 1500,
        predictions: [
          { question: 'LeBron averages 25+ PPG', correct: true, points: 100 },
          { question: 'Curry makes 300+ threes', correct: false, points: 0 },
          { question: 'Giannis plays 70+ games', correct: true, points: 130 },
          { question: 'Tatum scores 50+ in a game', correct: true, points: 120 },
        ],
      },
    },
  },
  {
    id: 3,
    rank: 3,
    username: 'BallIQ_Pro',
    avatar: '/placeholder.svg?height=40&width=40',
    totalPoints: 2689,
    accuracy: 71,
    categories: {
      'Regular Season Standings': {
        points: 920,
        maxPoints: 1200,
        predictions: [
          { question: 'Lakers will finish top 4 in West', correct: false, points: 0 },
          { question: 'Celtics will win Atlantic Division', correct: true, points: 120 },
          { question: 'Warriors miss playoffs', correct: true, points: 180 },
          { question: 'Nuggets finish 1st seed', correct: true, points: 200 },
          { question: 'Wolves finish 4th seed', correct: false, points: 140 },

        ],
      },
      'Player Awards': {
        points: 800,
        maxPoints: 900,
        predictions: [
          { question: 'Jokic wins MVP', correct: true, points: 300 },
          { question: 'Wembanyama wins ROTY', correct: true, points: 250 },
          { question: 'Smart wins DPOY', correct: true, points: 250 },
        ],
      },
      'Props & Yes/No': {
        points: 969,
        maxPoints: 1500,
        predictions: [
          { question: 'LeBron averages 25+ PPG', correct: false, points: 0 },
          { question: 'Curry makes 300+ threes', correct: true, points: 150 },
          { question: 'Giannis plays 70+ games', correct: false, points: 0 },
          { question: 'Tatum scores 50+ in a game', correct: false, points: 0 },
        ],
      },
    },
  },
]

/* Map category names ➜ an icon component. */
const categoryIcons = {
  'Regular Season Standings': Trophy,
  'Player Awards': Award,
  'Props & Yes/No': Target,
}

function LeaderboardPage() {
  /* ‣ Set of expanded user‑IDs to keep multiple rows open at once. */
  const [expandedUsers, setExpandedUsers] = useState(new Set())

  const toggleUserExpansion = (userId) => {
    const next = new Set(expandedUsers)
    next.has(userId) ? next.delete(userId) : next.add(userId)
    setExpandedUsers(next)
  }

  /* ‣ Render a little badge or icon for 1st‑3rd place. */
  const rankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400" />
    if (rank === 2) return <Star className="w-5 h-5 text-slate-300" />
    if (rank === 3) return <Award className="w-5 h-5 text-amber-500" />
    return (
      <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-black">
        {rank}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50 to-red-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ──────────────────────── Header */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-800">NBA Predictions Leaderboard</h1>
          <p className="text-lg text-slate-300">
            Track your predictions and compete with other fans
          </p>

          {/* ─── Stats Cards */}
          <section className="grid grid-cols-1 gap-4 mt-8 md:grid-cols-3">
            {/* Players */}
            <div className="bg-gradient-to-br from-white/80 to-indigo-100/80 backdrop-blur-md border border-gray-200 p-6 text-center rounded-xl shadow-lg">
              <Users className="w-8 h-8 mx-auto mb-2 text-blue-400" />
              <p className="text-2xl font-bold text-indigo-600">1,247</p>
              <p className="text-slate-400">Total Players</p>
            </div>
            {/* Predictions */}
            <div className="bg-gradient-to-br from-white/80 to-indigo-100/80 backdrop-blur-md border border-gray-200 p-6 text-center rounded-xl shadow-lg">
              <Target className="w-8 h-8 mx-auto mb-2 text-green-400" />
              <p className="text-2xl font-bold text-indigo-600">156</p>
              <p className="text-slate-400">Total Predictions</p>
            </div>
            {/* Accuracy */}
            <div className="bg-gradient-to-br from-white/80 to-indigo-100/80 backdrop-blur-md border border-gray-200 p-6 text-center rounded-xl shadow-lg">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-purple-400" />
              <p className="text-2xl font-bold text-indigo-600">73%</p>
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
            {leaderboardData.map((user) => (
              <div key={user.id} className="bg-white/60">
                {/* ─── Collapsed row */}
                <button
                  type="button"
                  onClick={() => toggleUserExpansion(user.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-indigo-50 transition-colors"
                >
                  {/* Left side (rank, avatar, name) */}
                  <div className="flex items-center gap-4">
                    {rankIcon(user.rank)}
                    <div className="relative w-10 h-10">
                      <img
                        src={user.avatar}
                        alt={`${user.username} avatar`}
                        className="w-full h-full rounded-full object-cover border border-slate-600"
                        onError={(e) => (e.target.style.display = 'none')}
                      />
                      <span className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-gray-800">
                        {user.username.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{user.username}</p>
                      <p className="text-sm text-slate-400">Accuracy: {user.accuracy}%</p>
                    </div>
                  </div>

                  {/* Right side (totals, category bars, chevron) */}
                  <div className="flex items-center gap-6">
                    {/* Points */}
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-800">
                        {user.totalPoints.toLocaleString()}
                      </p>
                      <p className="text-sm text-slate-400">Total Points</p>
                    </div>

                    {/* Small progress bars for each category */}
                    <div className="flex items-center gap-2">
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
                    </div>

                    {/* Expand / collapse icon */}
                    {expandedUsers.has(user.id) ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* ─── Expanded details */}
                {expandedUsers.has(user.id) && (
                  <div className="px-4 pb-4">
                    <div className="grid gap-4 lg:grid-cols-3">
                      {Object.entries(user.categories).map(([catName, catData]) => {
                        const Icon = categoryIcons[catName]
                        const pct = (catData.points / catData.maxPoints) * 100

                        return (
                          <div
                            key={catName}
                            className="bg-white/80 border border-gray-200 rounded-lg"
                          >
                            {/* Category header */}
                            <div className="p-4 space-y-2 border-b border-gray-200">
                              <div className="flex items-center gap-2 text-sm text-gray-800">
                                <Icon className="w-4 h-4" />
                                {catName}
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-lg font-bold text-black">
                                  {catData.points}/{catData.maxPoints}
                                </span>
                                <span className="px-2 py-0.5 text-xs rounded bg-gray-100">
                                  {pct.toFixed(0)}%
                                </span>
                              </div>
                              {/* Progress bar */}
                              <div className="w-full h-2 rounded bg-gray-200 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-indigo-500 to-pink-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>

                            {/* Prediction rows */}
                            <div className="p-4 space-y-2 max`-h-56 overflow-y-auto scrollbar-none">
                              {catData.predictions.map((p, idx) => (
                                <div
                                  key={idx}
                                  className={`p-2 flex items-center rounded text-xs ${
                                    p.correct
                                      ? 'bg-green-900/30 border border-green-700/50'
                                      : 'bg-red-900/30 border border-red-700/50'
                                  }`}
                                >
                                  <span className="text-black flex-1">{p.question}</span>
                                  <span className="flex items-center gap-2 justify-end min-w-[72px]">
                                    <span
                                      className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${
                                        p.correct
                                          ? 'bg-green-700 text-white'
                                          : 'bg-red-700 text-white'
                                      }`}
                                    >
                                      {p.correct ? '✓' : '✗'}
                                    </span>
                                    <span className="font-semibold text-black tabular-nums min-w-[30px] text-right">
                                      +{p.points}
                                    </span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
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
  )
}

export default LeaderboardPage