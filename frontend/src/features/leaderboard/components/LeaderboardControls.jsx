import React from 'react';
import { Search, TrendingUp } from 'lucide-react';

export const LeaderboardControls = ({
  query,
  setQuery,
  sortBy,
  setSortBy,
  mode,
  showAll,
  setShowAll,
  section,
  whatIfEnabled,
  setWhatIfEnabled,
  setShowWhatIfConfirm,
  setShowManagePlayers
}) => {
  const sortLabel = section === 'standings' ? 'Standings' : section === 'awards' ? 'Awards' : 'Props';

  return (
    <div className="shrink-0 bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md relative md:sticky md:top-[61px] z-[40]">
      <div className="w-full px-2 md:px-4 py-1.5 md:py-2 flex items-center gap-2 md:gap-4">
        <div className="relative shrink-0 md:shrink w-48 md:w-auto hidden md:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="pl-10 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold outline-none w-full md:w-48 transition-all"
          />
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-wide md:tracking-wider outline-none shrink-0"
        >
          <option value="standings">Sort: {sortLabel}</option>
          <option value="total">Sort: Total</option>
          <option value="name">Sort: Name</option>
        </select>

        <div className="flex items-center gap-1.5 md:gap-2 ml-auto shrink-0">
          {mode === 'compare' && (
            <>
              <button onClick={() => setShowManagePlayers(true)} className="px-2 md:px-4 py-1 md:py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] md:text-xs font-black text-slate-500 uppercase hover:text-slate-900 dark:hover:text-white transition-all">Players</button>
              <button onClick={() => setShowAll(!showAll)} className={`px-2 md:px-4 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-black uppercase transition-all border ${showAll ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}>
                {showAll ? 'Selected' : 'All'}
              </button>
            </>
          )}

          {section === 'standings' && (
            <button onClick={() => whatIfEnabled ? setWhatIfEnabled(false) : setShowWhatIfConfirm(true)} className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-black uppercase transition-all border ${whatIfEnabled ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}>
              <TrendingUp className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden sm:inline">What-If</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
