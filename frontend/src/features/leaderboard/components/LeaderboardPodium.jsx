import React from 'react';
import { Trophy } from 'lucide-react';

export const LeaderboardPodium = ({ whatIfEnabled, withSimTotals, loggedInUserId }) => {
  const leaders = (withSimTotals || []).slice(0, 3);
  const loggedInEntry = (withSimTotals || []).find(
    (entry) => String(entry.user.id) === String(loggedInUserId)
  );
  const participants = loggedInEntry
    ? [loggedInEntry, ...leaders.filter((entry) => String(entry.user.id) !== String(loggedInUserId))].slice(0, 3)
    : leaders;

  return (
    <div className={`court-score-band shrink-0 w-full text-xs border-b-2 border-slate-900 bg-white ${whatIfEnabled ? 'is-simulating' : ''}`}>
      <div className="flex items-stretch overflow-x-auto no-scrollbar">
        <div className="court-score-band__status flex items-center gap-2 border-r-2 border-slate-900 px-3 shrink-0">
          <Trophy className="w-4 h-4 text-amber-500" />
          {whatIfEnabled && <span className="sr-only">SIM</span>}
          <span className="court-score-band__mode">{whatIfEnabled ? 'PRIVATE WHAT-IF' : 'LIVE TABLE'}</span>
        </div>
        <div className="flex min-w-max flex-1 items-stretch">
          {participants.map((entry) => {
            const overallRank = (withSimTotals || []).findIndex(
              (candidate) => String(candidate.user.id) === String(entry.user.id)
            ) + 1;
            const isMe = String(entry.user.id) === String(loggedInUserId);
            const delta = whatIfEnabled && entry.__orig_total_points != null
              ? entry.user.total_points - entry.__orig_total_points
              : 0;
            return (
              <div key={entry.user.id} className={`court-score-band__player flex min-w-[132px] items-center gap-2 border-r border-slate-300 px-3 py-2 ${isMe ? 'is-me' : ''}`}>
                <div className="court-score-band__rank flex h-7 w-7 shrink-0 items-center justify-center border border-slate-900 text-xs font-black">
                  {overallRank || '—'}
                </div>
                <div className="flex min-w-0 flex-col leading-none">
                  <span className="truncate max-w-[90px] text-[10px] font-black uppercase tracking-tight">
                    {isMe ? 'You · ' : ''}{entry.user.display_name || entry.user.username}
                  </span>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="text-sm font-black">{entry.user.total_points} pts</span>
                    {delta !== 0 && (
                      <span className={`text-[9px] font-black ${delta > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {delta > 0 ? '▲' : '▼'}{Math.abs(delta)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
