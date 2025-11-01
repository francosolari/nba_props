import React, { useState } from 'react';
import useISTData from '../hooks/useISTData';
import ISTGroupStandings from '../components/ISTGroupStandings';
import ISTUserLeaderboard from '../components/ISTUserLeaderboard';
import {
  Trophy,
  Sparkles,
  Users,
  Target,
  TrendingUp,
} from 'lucide-react';

/**
 * Main IST Tournament Center Page
 * Displays IST group standings and user leaderboard
 */
function ISTCenterPage({ seasonSlug: initialSeasonSlug = 'current' }) {
  const [selectedSeason, setSelectedSeason] = useState(initialSeasonSlug);

  const { standings, groups, userLeaderboard, stats, error, isLoading } = useISTData(selectedSeason);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-6 flex items-center justify-center">
        <div className="w-full max-w-6xl animate-pulse space-y-6">
          <div className="h-32 bg-slate-200/70 dark:bg-slate-800/70 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl shadow-sm" />
            ))}
          </div>
          <div className="h-96 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl shadow-sm" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-6 flex items-center justify-center">
        <div className="bg-white/80 dark:bg-slate-800/80 border border-rose-200 dark:border-rose-500/30 rounded-xl shadow-lg p-6 max-w-md">
          <p className="text-lg text-rose-600 dark:text-rose-400 font-semibold">{String(error)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-3 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <section>
          <div className="relative overflow-hidden rounded-2xl border border-amber-200/60 dark:border-amber-500/30 bg-gradient-to-br from-amber-50 via-amber-50/80 to-yellow-50/30 dark:from-amber-900/20 dark:via-amber-900/10 dark:to-yellow-900/5 shadow-xl backdrop-blur-sm">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-amber-400/10 to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-yellow-400/10 to-transparent rounded-full blur-3xl" />

            <div className="relative px-4 py-8 md:px-8 md:py-10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                {/* Title */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 shadow-lg">
                      <Trophy className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                        In-Season Tournament
                        <Sparkles className="w-6 h-6 text-amber-500 animate-pulse" />
                      </h1>
                      <p className="mt-1 text-sm font-medium text-amber-700 dark:text-amber-300">
                        The NBA Cup • Exclusive IST Predictions
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 divide-x divide-amber-200 dark:divide-amber-700/60 rounded-xl bg-gradient-to-br from-white/80 to-amber-50/50 dark:from-slate-800/60 dark:to-amber-900/20 backdrop-blur px-3 py-3 border border-amber-200/60 dark:border-amber-700/40 shadow-md">
                  <div className="px-3 text-center">
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-amber-600 dark:text-amber-400">
                      Predictors
                    </div>
                    <div className="text-xl font-black text-amber-700 dark:text-amber-300 mt-0.5">
                      {stats.totalUsers}
                    </div>
                  </div>
                  <div className="px-3 text-center">
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-amber-600 dark:text-amber-400">
                      Predictions
                    </div>
                    <div className="text-xl font-black text-amber-700 dark:text-amber-300 mt-0.5">
                      {stats.totalPredictions || '—'}
                    </div>
                  </div>
                  <div className="px-3 text-center">
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-amber-600 dark:text-amber-400">
                      Accuracy
                    </div>
                    <div className="text-xl font-black text-amber-700 dark:text-amber-300 mt-0.5">
                      {stats.avgAccuracy ? `${(stats.avgAccuracy * 100).toFixed(0)}%` : '—'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Group Standings Section */}
        <section>
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Tournament Groups
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Six groups competing for knockout round spots
            </p>
          </div>

          {/* East Conference Groups */}
          {standings.East && Object.keys(standings.East).length > 0 && (
            <div className="mb-6">
              <h3 className="text-base font-bold text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full" />
                Eastern Conference
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(standings.East).map(([groupName, teams]) => (
                  <ISTGroupStandings
                    key={groupName}
                    groupName={groupName}
                    conference="East"
                    teams={teams}
                  />
                ))}
              </div>
            </div>
          )}

          {/* West Conference Groups */}
          {standings.West && Object.keys(standings.West).length > 0 && (
            <div>
              <h3 className="text-base font-bold text-red-700 dark:text-red-300 mb-3 flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-red-500 to-red-600 rounded-full" />
                Western Conference
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(standings.West).map(([groupName, teams]) => (
                  <ISTGroupStandings
                    key={groupName}
                    groupName={groupName}
                    conference="West"
                    teams={teams}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {groups.length === 0 && (
            <div className="bg-white/90 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/50 rounded-xl shadow-lg p-8 text-center">
              <Target className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-3" />
              <p className="text-slate-600 dark:text-slate-400">
                No IST standings available yet.
              </p>
            </div>
          )}
        </section>

        {/* User Leaderboard Section */}
        <section>
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Prediction Leaders
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Top predictors for the In-Season Tournament
            </p>
          </div>

          <ISTUserLeaderboard users={userLeaderboard} />
        </section>

        {/* Tournament Info Footer */}
        <section className="mt-8">
          <div className="bg-gradient-to-br from-slate-100/50 to-white/30 dark:from-slate-800/30 dark:to-slate-900/20 border border-slate-200/60 dark:border-slate-700/50 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              About the In-Season Tournament
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600 dark:text-slate-400">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white mb-1">Group Stage</p>
                <p className="text-xs">Six groups (3 per conference) compete in round-robin format. Top team from each group advances.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white mb-1">Wildcards</p>
                <p className="text-xs">Two best second-place teams (one per conference) earn wildcard spots in the knockout round.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white mb-1">Knockout Round</p>
                <p className="text-xs">Eight teams compete in single-elimination bracket for the NBA Cup championship.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ISTCenterPage;
