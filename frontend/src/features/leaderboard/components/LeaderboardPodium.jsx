import React from 'react';
import { Trophy } from 'lucide-react';

export const LeaderboardPodium = ({ whatIfEnabled, withSimTotals }) => {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-[450px] hidden md:block text-xs">
      <div className="bg-slate-900/90 dark:bg-white/95 backdrop-blur-xl text-white dark:text-slate-950 rounded-full px-5 py-2 shadow-2xl flex items-center justify-between border border-white/10 dark:border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 border-r border-white/20 dark:border-slate-200 pr-4 shrink-0">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">{whatIfEnabled ? 'SIM' : 'LIVE'}</span>
        </div>
        <div className="flex items-center gap-6 sm:gap-8 flex-1 justify-around px-2">
          {(withSimTotals || []).slice(0, 3).map((e, idx) => {
            const delta = whatIfEnabled && e.__orig_total_points != null ? (e.user.total_points - e.__orig_total_points) : 0;
            return (
              <div key={e.user.id} className="flex items-center gap-3 min-w-0">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${idx === 0 ? 'bg-amber-400 text-slate-950 shadow-[0_0_8px_rgba(251,191,36,0.4)]' : idx === 1 ? 'bg-slate-400 text-slate-950' : 'bg-amber-700 text-white'}`}>
                  {idx + 1}
                </div>
                <div className="flex flex-col leading-none min-w-0">
                  <span className="text-[10px] sm:text-[11px] font-black truncate max-w-[60px] sm:max-w-[90px] uppercase tracking-tighter">{e.user.display_name || e.user.username}</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] sm:text-[12px] font-black">{e.user.total_points}</span>
                    {delta !== 0 && (
                      <span className={`text-[9px] font-black ${delta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
