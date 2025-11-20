import React from 'react';
import { useISTData } from '../../hooks';
import ISTGroupStandings from '../../components/ist/ISTGroupStandings';
import ISTWildcardRace from '../../components/ist/ISTWildcardRace';
import ISTUserLeaderboard from '../../components/ist/ISTUserLeaderboard';
import { Trophy, Users, Target, Zap } from 'lucide-react';

/**
 * Main IST Tournament Center Page - Redesigned
 */
function ISTCenterPage({ seasonSlug: initialSeasonSlug = 'current' }) {
  const { standings, groups, wildcardRace, userLeaderboard, stats, season, error, isLoading } = useISTData(initialSeasonSlug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex items-center justify-center">
        <div className="w-full max-w-7xl animate-pulse space-y-6">
          <div className="h-48 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-80 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex items-center justify-center">
        <div className="bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 rounded-xl shadow-lg p-8 max-w-md">
          <p className="text-lg text-rose-600 dark:text-rose-400 font-semibold">{String(error)}</p>
        </div>
      </div>
    );
  }

  // Split groups by conference
  const eastGroups = groups.filter(g => g.conference === 'East');
  const westGroups = groups.filter(g => g.conference === 'West');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Modern Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-black">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* Left: Title & Description */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 mb-4">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold text-amber-300 tracking-wide">
                  NBA CUP {season?.year ? season.year.split('-')[0] : new Date().getFullYear()}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-3 tracking-tight">
                In-Season Tournament
              </h1>
              <p className="text-base md:text-lg text-slate-300 max-w-2xl">
                Six groups battle for eight knockout spots. Track your predictions and compete for the mid-season payout.
              </p>
            </div>

            {/* Right: Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
                <Users className="w-6 h-6 mx-auto text-teal-400 mb-2" />
                <div className="text-2xl font-black text-white">{stats.totalUsers}</div>
                <div className="text-xs text-slate-300 font-medium">Predictors</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
                <Target className="w-6 h-6 mx-auto text-amber-400 mb-2" />
                <div className="text-2xl font-black text-white">{stats.totalPredictions}</div>
                <div className="text-xs text-slate-300 font-medium">Predictions</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
                <Trophy className="w-6 h-6 mx-auto text-emerald-400 mb-2" />
                <div className="text-2xl font-black text-white">
                  {stats.avgAccuracy ? `${(stats.avgAccuracy * 100).toFixed(0)}%` : '—'}
                </div>
                <div className="text-xs text-slate-300 font-medium">Accuracy</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Eastern Conference */}
        {eastGroups.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full" />
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Eastern Conference</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Groups */}
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                {eastGroups.map(group => (
                  <ISTGroupStandings
                    key={group.name}
                    groupName={group.name}
                    conference={group.conference}
                    teams={group.teams}
                  />
                ))}
              </div>
              {/* East Wildcard Sidebar */}
              {wildcardRace.East && wildcardRace.East.length > 0 && (
                <div className="lg:col-span-1">
                  <ISTWildcardRace conference="East" teams={wildcardRace.East} />
                </div>
              )}
            </div>
          </section>
        )}

        {/* Western Conference */}
        {westGroups.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-gradient-to-b from-red-500 to-red-600 rounded-full" />
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Western Conference</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Groups */}
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                {westGroups.map(group => (
                  <ISTGroupStandings
                    key={group.name}
                    groupName={group.name}
                    conference={group.conference}
                    teams={group.teams}
                  />
                ))}
              </div>
              {/* West Wildcard Sidebar */}
              {wildcardRace.West && wildcardRace.West.length > 0 && (
                <div className="lg:col-span-1">
                  <ISTWildcardRace conference="West" teams={wildcardRace.West} />
                </div>
              )}
            </div>
          </section>
        )}

        {/* User Leaderboard */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-gradient-to-b from-amber-500 to-amber-600 rounded-full" />
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Prediction Leaders</h2>
          </div>
          <ISTUserLeaderboard users={userLeaderboard} />
        </section>
      </div>
    </div>
  );
}

export default ISTCenterPage;
