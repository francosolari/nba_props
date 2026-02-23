import React from 'react';
import { Crown, Trophy, Award, Target } from 'lucide-react';
import { getInitials } from '../utils/helpers';

export const LeaderboardShowcase = ({ primaryUser }) => {
  if (!primaryUser) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-4 md:px-0 mt-4 md:mt-0">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 bg-gradient-to-br from-sky-50/30 to-white dark:from-sky-950/10 dark:to-slate-900 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center font-black text-xl text-sky-600 dark:text-sky-400 uppercase">
              {getInitials(primaryUser.user.display_name || primaryUser.user.username)}
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{primaryUser.user.display_name || primaryUser.user.username || 'Select Player'}</h2>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-xs font-black text-sky-500 uppercase tracking-widest">Rank #{primaryUser.rank || '—'}</span>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">{primaryUser.user.total_points || 0} Points</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
             {['Regular Season Standings', 'Player Awards', 'Props & Yes/No'].map(catKey => {
               const cat = primaryUser.user.categories?.[catKey];
               return cat?.is_best ? (
                 <div key={catKey} className="px-3 py-1.5 rounded-md bg-sky-50 dark:bg-sky-900/30 border border-sky-100 dark:border-sky-800 text-sky-600 dark:text-sky-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                   <Crown className="w-3 h-3" /> {catKey.split(' ')[0]}
                 </div>
               ) : null;
             })}
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-100 dark:border-slate-800">
          {['Regular Season Standings', 'Player Awards', 'Props & Yes/No'].map(catKey => {
            const cat = primaryUser.user.categories?.[catKey] || { points: 0, max_points: 0, predictions: [] };
            const pct = cat.max_points > 0 ? Math.round((cat.points / cat.max_points) * 100) : 0;
            const Icon = catKey === 'Regular Season Standings' ? Trophy : (catKey === 'Player Awards' ? Award : Target);
            
            return (
              <div key={catKey} className={`p-5 rounded-xl border transition-all ${cat.is_best ? 'bg-sky-50/20 border-sky-100 dark:bg-sky-900/10' : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${cat.is_best ? 'text-sky-500' : 'text-slate-400'}`} />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">{catKey.split(' ')[0]}</span>
                  </div>
                  <span className="text-sm font-black text-sky-600 dark:text-sky-400">{cat.points} pts</span>
                </div>
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-sky-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-[10px] font-black text-slate-400 text-right uppercase tracking-tighter">{pct}% Accuracy</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
