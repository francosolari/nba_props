import React, { useState } from 'react';
import { Star, Info, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Component to display wildcard race with tiebreaker rules
 */
function ISTWildcardRace({ conference, teams = [] }) {
  const [showTiebreakers, setShowTiebreakers] = useState(false);

  if (!teams || teams.length === 0) return null;

  const isEast = conference === 'East';
  const colorClass = isEast
    ? 'from-blue-600 to-blue-700'
    : 'from-red-600 to-red-700';
  const bgClass = isEast
    ? 'bg-blue-50 dark:bg-blue-950/30'
    : 'bg-red-50 dark:bg-red-950/30';
  const badgeClass = isEast
    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';

  const wildcardWinner = teams.find((t, idx) => idx === 0);
  const contenders = teams.slice(0, 3); // Top 3 wildcard contenders for compact view

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
      {/* Header */}
      <div className={`px-3 py-2 bg-gradient-to-r ${colorClass}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 text-white" />
            <h3 className="text-sm font-black text-white tracking-wide">{conference} WILDCARD</h3>
          </div>
          <button
            onClick={() => setShowTiebreakers(!showTiebreakers)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/20 hover:bg-white/30 transition-colors text-white text-[10px] font-medium"
          >
            <Info className="w-3 h-3" />
            {showTiebreakers ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
          </button>
        </div>
      </div>

      {/* Tiebreaker Rules Dropdown */}
      {showTiebreakers && (
        <div className={`px-4 py-3 ${bgClass} border-b border-slate-200 dark:border-slate-700`}>
          <p className="text-xs font-semibold text-slate-900 dark:text-white mb-2">Tiebreaker Order:</p>
          <ol className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 list-decimal list-inside">
            <li><strong>Head-to-head record</strong> in group play games</li>
            <li><strong>Point differential</strong> across all group play (no OT)</li>
            <li><strong>Total points scored</strong> in group play (no OT)</li>
            <li><strong>Previous season record</strong></li>
          </ol>
        </div>
      )}

      {/* Wildcard Standings */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700/40">
        {contenders.map((team, index) => {
          // Use index + 1 for display rank (1-based)
          const displayRank = index + 1;
          const isWildcardWinner = displayRank === 1;
          const isClinched = team.clinch_wildcard;

          return (
            <div
              key={team.team_id || index}
              className={`px-2 py-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30 ${
                isWildcardWinner ? 'bg-gradient-to-r from-amber-50/30 to-transparent dark:from-amber-500/5 dark:to-transparent border-l-2 border-l-amber-500' : ''
              }`}
            >
              <div className="flex items-center gap-1.5">
                {/* Rank */}
                <span className={`text-[10px] font-bold w-3 text-center shrink-0 ${
                  isWildcardWinner ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'
                }`}>
                  {displayRank}
                </span>

                {/* Star for winner */}
                {isWildcardWinner && (
                  <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500 shrink-0" />
                )}

                {/* Team info */}
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold text-slate-900 dark:text-white truncate leading-tight">
                    {team.team_name || team.team}
                  </div>
                  <div className="text-[8px] text-slate-500 dark:text-slate-400 truncate leading-tight">
                    {team.ist_group || team.group || 'Unknown Group'}
                  </div>
                </div>

                {/* Stats - always visible */}
                <div className="flex items-center gap-1 shrink-0">
                  <div className="text-[10px] font-bold text-slate-900 dark:text-white">
                    {team.wins || 0}-{team.losses || 0}
                  </div>
                  <div className={`text-[10px] font-bold min-w-[24px] text-right ${
                    (team.point_differential || team.ist_differential || 0) > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : (team.point_differential || team.ist_differential || 0) < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}>
                    {((team.point_differential || team.ist_differential || 0) > 0 ? '+' : '')}
                    {team.point_differential || team.ist_differential || 0}
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

export default ISTWildcardRace;
