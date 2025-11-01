import React from 'react';
import { Check, Trophy } from 'lucide-react';

/**
 * Component to display a single IST group's standings
 * Shows qualified teams with prominent visual indicators
 */
function ISTGroupStandings({ groupName, conference, teams = [] }) {
  if (!teams || teams.length === 0) return null;

  const groupLetter = groupName.split(' ').pop();

  const conferenceColors = {
    East: {
      primary: 'from-blue-600 to-blue-700',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-300 dark:border-blue-700/50',
      text: 'text-blue-900 dark:text-blue-100',
      qualified: 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 dark:from-blue-500/10 dark:to-blue-600/10 border-l-4 border-l-blue-500',
    },
    West: {
      primary: 'from-red-600 to-red-700',
      bg: 'bg-red-50 dark:bg-red-950/30',
      border: 'border-red-300 dark:border-red-700/50',
      text: 'text-red-900 dark:text-red-100',
      qualified: 'bg-gradient-to-r from-red-500/20 to-red-600/20 dark:from-red-500/10 dark:to-red-600/10 border-l-4 border-l-red-500',
    },
  };

  const colors = conferenceColors[conference] || conferenceColors.East;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-md hover:shadow-lg transition-all">
      {/* Group Header */}
      <div className={`px-4 py-3 bg-gradient-to-r ${colors.primary}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-white tracking-wide">GROUP {groupLetter}</h3>
            <p className="text-xs text-white/80 font-medium">{conference}</p>
          </div>
          <div className="text-3xl font-black text-white/20">{groupLetter}</div>
        </div>
      </div>

      {/* Teams Table */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700/40">
        {teams.map((team, index) => {
          const rank = team.group_rank || team.ist_group_rank || index + 1;
          const isQualified = rank === 1;
          const isClinched = team.clinch_group || team.clinch_knockout;

          return (
            <div
              key={team.team_id || index}
              className={`group px-4 py-3 transition-all hover:bg-slate-50 dark:hover:bg-slate-700/30 ${
                isQualified ? colors.qualified : ''
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                {/* Left: Rank & Team */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400 w-4 text-center">
                      {rank}
                    </span>
                    {isQualified && (
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                    {isClinched && !isQualified && (
                      <div className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-bold">
                        CLINCH
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {team.team_name || team.team}
                  </span>
                </div>

                {/* Right: Stats */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-center">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">W-L</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {team.wins || 0}-{team.losses || 0}
                    </div>
                  </div>
                  <div className="text-center hidden sm:block">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">DIFF</div>
                    <div className={`text-sm font-bold ${
                      (team.point_differential || 0) > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : (team.point_differential || 0) < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}>
                      {(team.point_differential || 0) > 0 ? '+' : ''}
                      {team.point_differential || 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ISTGroupStandings;
