import React from 'react';
import { Trophy, TrendingUp, Award } from 'lucide-react';

/**
 * Component to display a single IST group's standings
 * @param {Object} props
 * @param {string} props.groupName - Name of the group (e.g., "East Group A")
 * @param {string} props.conference - Conference name ("East" or "West")
 * @param {Array} props.teams - Array of team standings
 */
function ISTGroupStandings({ groupName, conference, teams = [] }) {
  if (!teams || teams.length === 0) {
    return null;
  }

  // Get group letter from name (e.g., "East Group A" -> "A")
  const groupLetter = groupName.split(' ').pop();

  // Conference colors
  const conferenceColors = {
    East: {
      gradient: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/10',
      border: 'border-blue-200 dark:border-blue-500/30',
      text: 'text-blue-700 dark:text-blue-300',
      light: 'bg-blue-100 dark:bg-blue-500/20',
    },
    West: {
      gradient: 'from-red-500 to-red-600',
      bg: 'bg-red-50 dark:bg-red-900/10',
      border: 'border-red-200 dark:border-red-500/30',
      text: 'text-red-700 dark:text-red-300',
      light: 'bg-red-100 dark:bg-red-500/20',
    },
  };

  const colors = conferenceColors[conference] || conferenceColors.East;

  // Rank icons
  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-4 h-4 text-yellow-400" />;
    if (rank === 2) return <Award className="w-4 h-4 text-slate-300" />;
    if (rank === 3) return <TrendingUp className="w-4 h-4 text-amber-500" />;
    return (
      <span className="w-4 h-4 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400">
        {rank}
      </span>
    );
  };

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
      {/* Group Header */}
      <div className={`px-4 py-3 bg-gradient-to-r ${colors.gradient} border-b ${colors.border}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Group {groupLetter}</h3>
            <p className="text-xs text-white/80">{conference} Conference</p>
          </div>
          <div className={`text-2xl font-black text-white/30`}>
            {groupLetter}
          </div>
        </div>
      </div>

      {/* Standings Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700/40">
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Team
              </th>
              <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                W
              </th>
              <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                L
              </th>
              <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">
                Diff
              </th>
              <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">
                GB
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/30">
            {teams.map((team, index) => {
              const rank = team.group_rank || index + 1;
              const isClinched = team.clinch_group || team.clinch_knockout;

              return (
                <tr
                  key={team.team_id || index}
                  className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                    isClinched ? colors.light : ''
                  }`}
                >
                  {/* Rank */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {getRankIcon(rank)}
                      {isClinched && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                          ✓
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Team Name */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {team.team_name || team.team || 'Unknown'}
                      </span>
                    </div>
                  </td>

                  {/* Wins */}
                  <td className="px-2 py-2.5 text-center">
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {team.wins || 0}
                    </span>
                  </td>

                  {/* Losses */}
                  <td className="px-2 py-2.5 text-center">
                    <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                      {team.losses || 0}
                    </span>
                  </td>

                  {/* Point Differential (hidden on mobile) */}
                  <td className="px-2 py-2.5 text-center hidden sm:table-cell">
                    <span className={`text-sm font-medium ${
                      (team.point_differential || 0) > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : (team.point_differential || 0) < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}>
                      {(team.point_differential || 0) > 0 ? '+' : ''}
                      {team.point_differential || 0}
                    </span>
                  </td>

                  {/* Games Behind (hidden on tablet and below) */}
                  <td className="px-2 py-2.5 text-center hidden md:table-cell">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {rank === 1 ? '—' : team.group_gb || 0}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend for clinched teams */}
      {teams.some(t => t.clinch_group || t.clinch_knockout) && (
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700/40 bg-slate-50/50 dark:bg-slate-800/30">
          <p className="text-[10px] text-slate-600 dark:text-slate-400">
            <span className="font-semibold">✓</span> = Clinched
          </p>
        </div>
      )}
    </div>
  );
}

export default ISTGroupStandings;
